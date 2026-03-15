import * as cheerio from "cheerio";
import { fetchJsonWithRetry, fetchTextWithRetry } from "@/lib/http";
import { filterJobsByKeywords, scrapeHtmlWithFallback } from "@/lib/adapters/shared";
import type { Adapter, RawJobPosting, RemoteType } from "@/lib/types";

type OracleRequisition = {
  Id?: string;
  Title?: string;
  PostedDate?: string | null;
  ShortDescriptionStr?: string | null;
  PrimaryLocation?: string | null;
  WorkplaceType?: string | null;
  workLocation?: Array<{
    TownOrCity?: string | null;
    Region2?: string | null;
    Country?: string | null;
  }>;
  otherWorkLocations?: Array<{
    TownOrCity?: string | null;
    Region2?: string | null;
    Country?: string | null;
  }>;
  secondaryLocations?: Array<{
    Name?: string | null;
  }>;
};

type OracleSearchEnvelope = {
  items?: Array<{
    hasMore?: boolean;
    count?: number;
    requisitionList?: OracleRequisition[];
  }>;
  count?: number;
  hasMore?: boolean;
  limit?: number;
  offset?: number;
};

function extractPostedDate(text: string) {
  return (
    text.match(
      /\b(?:posted date|date posted|posted)\b[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|today|yesterday|\d+\s+(?:hours?|days?)\s+ago)/i,
    )?.[1] ?? null
  );
}

function extractRequisitionId(text: string) {
  return text.match(/\b(?:job id|req(?:uisition)?(?: id)?)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ?? null;
}

function extractSiteNumber(html: string) {
  return html.match(/siteNumber=(CX_[A-Za-z0-9_]+)/)?.[1] ?? null;
}

function extractSiteSlug(careerUrl: string) {
  return careerUrl.match(/\/sites\/([^/]+)\/jobs/i)?.[1] ?? "CX";
}

function oracleRemoteTypeToNormalized(value?: string | null): RemoteType {
  const lower = value?.toLowerCase() ?? "";
  if (lower.includes("hybrid")) {
    return "hybrid";
  }
  if (lower.includes("remote")) {
    return "remote";
  }
  if (lower.includes("site")) {
    return "onsite";
  }
  return "unknown";
}

function joinLocation(parts: Array<string | null | undefined>) {
  const filtered = parts.map((part) => part?.trim()).filter(Boolean);
  return filtered.length ? filtered.join(", ") : null;
}

function mapOracleRequisitionToJob(
  requisition: OracleRequisition,
  careerUrl: string,
  siteSlug: string,
): RawJobPosting | null {
  if (!requisition.Id || !requisition.Title) {
    return null;
  }

  const primaryWorkLocation = requisition.workLocation?.[0];
  const secondaryLocation = requisition.secondaryLocations?.[0]?.Name ?? null;
  const otherLocation = requisition.otherWorkLocations?.[0];
  const locationRaw =
    requisition.PrimaryLocation ??
    joinLocation([
      primaryWorkLocation?.TownOrCity,
      primaryWorkLocation?.Region2,
      primaryWorkLocation?.Country,
    ]) ??
    secondaryLocation ??
    joinLocation([otherLocation?.TownOrCity, otherLocation?.Region2, otherLocation?.Country]);

  return {
    title: requisition.Title,
    url: `${new URL(careerUrl).origin}/hcmUI/CandidateExperience/en/sites/${siteSlug}/job/${requisition.Id}/`,
    locationRaw,
    postedRaw: requisition.PostedDate ?? null,
    descriptionSnippet: requisition.ShortDescriptionStr ?? null,
    requisitionId: requisition.Id,
    remoteType: oracleRemoteTypeToNormalized(requisition.WorkplaceType),
  };
}

async function fetchOracleJobsFromApi(
  careerUrl: string,
  keywords: string | undefined,
  signal: AbortSignal,
) {
  const html = await fetchTextWithRetry(careerUrl, { signal });
  const siteNumber = extractSiteNumber(html);
  if (!siteNumber) {
    return null;
  }

  const siteSlug = extractSiteSlug(careerUrl);
  const url = new URL(
    `${new URL(careerUrl).origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,
  );
  url.searchParams.set("onlyData", "true");
  url.searchParams.set(
    "expand",
    "requisitionList.workLocation,requisitionList.otherWorkLocations,requisitionList.secondaryLocations,flexFieldsFacet.values,requisitionList.requisitionFlexFields",
  );

  const finderParts = [
    `siteNumber=${siteNumber}`,
    "facetsList=LOCATIONS;WORK_LOCATIONS;WORKPLACE_TYPES;TITLES;CATEGORIES;ORGANIZATIONS;POSTING_DATES;FLEX_FIELDS",
    "limit=25",
    "sortBy=RELEVANCY",
  ];
  if (keywords?.trim()) {
    finderParts.push(`keyword=${JSON.stringify(keywords.trim())}`);
  }
  url.searchParams.set("finder", `findReqs;${finderParts.join(",")}`);

  const response = await fetchJsonWithRetry<OracleSearchEnvelope>(url.toString(), { signal });
  const requisitions = response.items?.flatMap((item) => item.requisitionList ?? []) ?? [];
  const jobs = requisitions
    .map((requisition) => mapOracleRequisitionToJob(requisition, careerUrl, siteSlug))
    .filter((job): job is RawJobPosting => Boolean(job));

  return jobs;
}

async function enrichOracleJob(job: RawJobPosting, signal: AbortSignal) {
  if (job.postedRaw && job.requisitionId) {
    return job;
  }

  try {
    const html = await fetchTextWithRetry(job.url, { signal });
    const $ = cheerio.load(html);
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    return {
      ...job,
      postedRaw: job.postedRaw ?? extractPostedDate(bodyText),
      requisitionId: job.requisitionId ?? extractRequisitionId(bodyText),
      locationRaw:
        job.locationRaw ??
        bodyText.match(/\b[A-Za-z .'-]+,\s*(?:DC|VA|MD)\b/)?.[0] ??
        bodyText.match(/\b(?:Remote|Hybrid|On-site|Onsite)\b/i)?.[0] ??
        null,
    };
  } catch {
    return job;
  }
}

export const oracleHcmAdapter: Adapter = async (context) => {
  const apiJobs = await fetchOracleJobsFromApi(
    context.company.careerUrl,
    context.query.keywords,
    context.signal,
  );

  if (apiJobs && apiJobs.length > 0) {
    return {
      sourceType: "oracle_hcm",
      jobs: filterJobsByKeywords(apiJobs, context.query.keywords),
    };
  }

  const jobs = await scrapeHtmlWithFallback(context, context.company.careerUrl);
  const keywordFiltered = filterJobsByKeywords(jobs, context.query.keywords);
  const enriched = await Promise.all(
    keywordFiltered.map((job) => enrichOracleJob(job, context.signal)),
  );

  return {
    sourceType: "oracle_hcm",
    jobs: enriched,
  };
};

import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { fetchJsonWithRetry, fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import { isBlockedJobUrl } from "@/lib/normalize";
import type { Adapter, RawJobPosting, RemoteType } from "@/lib/types";

type WorkdayResponse = {
  total?: number;
  jobPostings?: Array<{
    title?: string;
    bulletFields?: string[];
    externalPath?: string;
    postedOn?: string;
    requisitionId?: string;
    locationsText?: string;
  }>;
};

const DETAIL_CONCURRENCY = 4;
const DETAIL_ENRICHMENT_LIMIT = 12;

type WorkdayJobPostingSchema = {
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  applicantLocationRequirements?: {
    name?: string;
  };
  jobLocationType?: string;
  datePosted?: string;
};

function getWorkdayPathSegments(careerUrl: string) {
  return new URL(careerUrl).pathname.split("/").filter(Boolean);
}

function getWorkdayEndpoint(careerUrl: string) {
  const url = new URL(careerUrl);
  const tenant = url.hostname.split(".")[0];
  const segments = getWorkdayPathSegments(careerUrl);
  const site = segments[segments.length - 1];
  return `${url.origin}/wday/cxs/${tenant}/${site}/jobs`;
}

function buildWorkdayJobUrl(careerUrl: string, externalPath: string) {
  if (!externalPath) {
    return null;
  }

  if (/^https?:\/\//i.test(externalPath)) {
    return externalPath;
  }

  const url = new URL(careerUrl);
  const pathSegments = getWorkdayPathSegments(careerUrl);
  const basePrefix = pathSegments.join("/");
  const cleanPath = externalPath.replace(/^\/+/, "");
  const localePathPrefix = /^[a-z]{2}-[a-z]{2}\//i;

  if (
    cleanPath.startsWith(`${basePrefix}/`) ||
    cleanPath === basePrefix ||
    localePathPrefix.test(cleanPath)
  ) {
    return `${url.origin}/${cleanPath}`;
  }

  return `${url.origin}/${basePrefix}/${cleanPath}`;
}

function inferLocationFromExternalPath(externalPath?: string | null) {
  if (!externalPath) {
    return null;
  }

  const match = externalPath.match(/\/job\/([^/]+)\//i);
  if (!match?.[1]) {
    return null;
  }

  const locationSlug = decodeURIComponent(match[1]).trim();
  if (!locationSlug) {
    return null;
  }

  if (/^[A-Za-z]+-[A-Z]{2}$/i.test(locationSlug)) {
    const parts = locationSlug.split("-");
    const state = parts.pop()?.toUpperCase();
    const city = parts.join(" ").replace(/\b\w/g, (char) => char.toUpperCase());
    return state ? `${city}, ${state}` : city;
  }

  return locationSlug.replace(/-/g, " ");
}

function isAmbiguousWorkdayLocation(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    /^\d+\s+locations?$/.test(normalized) ||
    normalized === "multiple locations" ||
    normalized === "various locations"
  );
}

function normalizeRemoteType(value?: string | null): RemoteType {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("telecommute") || normalized.includes("remote")) {
    return "remote";
  }
  if (normalized.includes("hybrid")) {
    return "hybrid";
  }
  if (normalized.includes("site")) {
    return "onsite";
  }
  return "unknown";
}

function buildLocationFromSchema(schema: WorkdayJobPostingSchema) {
  const locality = schema.jobLocation?.address?.addressLocality?.trim();
  const region = schema.jobLocation?.address?.addressRegion?.trim();
  const country = schema.jobLocation?.address?.addressCountry?.trim();
  const parts = [locality, region, country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  return schema.applicantLocationRequirements?.name?.trim() ?? null;
}

function extractWorkdaySchema(html: string): WorkdayJobPostingSchema | null {
  const $ = cheerio.load(html);
  let matchedSchema: WorkdayJobPostingSchema | null = null;

  $('script[type="application/ld+json"]').each((_, script) => {
    if (matchedSchema) {
      return;
    }

    const raw = $(script).contents().text();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (entry?.["@type"] === "JobPosting") {
          matchedSchema = entry as WorkdayJobPostingSchema;
          break;
        }
      }
    } catch {
      return;
    }
  });

  return matchedSchema;
}

async function enrichWorkdayJob(job: RawJobPosting, signal: AbortSignal) {
  try {
    const html = await fetchTextWithRetry(job.url, { signal });
    const schema = extractWorkdaySchema(html);
    if (!schema) {
      return job;
    }

    return {
      ...job,
      locationRaw: isAmbiguousWorkdayLocation(job.locationRaw)
        ? buildLocationFromSchema(schema) ?? job.locationRaw ?? null
        : job.locationRaw,
      postedAt: schema.datePosted ? new Date(schema.datePosted).toISOString() : job.postedAt,
      remoteType:
        job.remoteType && job.remoteType !== "unknown"
          ? job.remoteType
          : normalizeRemoteType(schema.jobLocationType),
    };
  } catch {
    return job;
  }
}

export const workdayAdapter: Adapter = async (context) => {
  const endpoint = getWorkdayEndpoint(context.company.careerUrl);
  const allJobs: RawJobPosting[] = [];
  let offset = 0;
  const limit = 20;
  let total = Infinity;

  while (offset < total && offset < 200) {
    const response = await fetchJsonWithRetry<WorkdayResponse>(endpoint, {
      signal: context.signal,
      method: "POST",
      body: JSON.stringify({
        appliedFacets: {},
        limit,
        offset,
        searchText: context.query.keywords?.trim() || "",
      }),
    });

    const postings = response.jobPostings ?? [];
    total = response.total ?? postings.length;

    for (const posting of postings) {
      if (!posting.title || !posting.externalPath) {
        continue;
      }

      const bulletText = posting.bulletFields?.join(" ") ?? "";
      const resolvedUrl =
        buildWorkdayJobUrl(context.company.careerUrl, posting.externalPath) ??
        absoluteUrl(context.company.careerUrl, posting.externalPath);
      if (!resolvedUrl || isBlockedJobUrl(resolvedUrl)) {
        continue;
      }

      allJobs.push({
        title: posting.title,
        url: resolvedUrl,
        locationRaw:
          isAmbiguousWorkdayLocation(posting.locationsText)
            ? inferLocationFromExternalPath(posting.externalPath) ??
              posting.locationsText ??
              posting.bulletFields?.[0] ??
              null
            : posting.locationsText ?? posting.bulletFields?.[0] ?? null,
        postedRaw: posting.postedOn ?? null,
        descriptionSnippet: bulletText || null,
        requisitionId: posting.requisitionId ?? null,
      });
    }

    if (postings.length < limit) {
      break;
    }
    offset += limit;
  }

  const keywordFiltered = filterJobsByKeywords(allJobs, context.query.keywords);
  const limitDetail = pLimit(DETAIL_CONCURRENCY);
  const enriched = await Promise.all(
    keywordFiltered.map((job, index) =>
      index >= DETAIL_ENRICHMENT_LIMIT || !isAmbiguousWorkdayLocation(job.locationRaw)
        ? job
        : limitDetail(() => enrichWorkdayJob(job, context.signal)),
    ),
  );

  return {
    sourceType: "workday",
    jobs: enriched,
  };
};

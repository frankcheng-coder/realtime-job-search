import * as cheerio from "cheerio";
import { filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchJsonWithRetry, fetchTextWithRetry } from "@/lib/http";
import type { Adapter, AdapterContext, RawJobPosting } from "@/lib/types";

type WorldBankTokenContext = {
  token: string;
  cultureId: number;
  cultureName: string;
};

type WorldBankResponse = {
  data?: {
    totalCount?: number;
    requisitions?: Array<{
      requisitionId?: number;
      postingEffectiveDate?: string | null;
      displayJobTitle?: string | null;
      locations?: Array<{
        city?: string | null;
        country?: string | null;
      }>;
      externalDescription?: string | null;
    }>;
  };
};

function extractWorldBankTokenContext(html: string): WorldBankTokenContext | null {
  const token = html.match(/"token":"([^"]+)"/)?.[1] ?? null;
  const cultureIdMatch = html.match(/"cultureID":(\d+)/);
  const cultureNameMatch = html.match(/"cultureName":"([^"]+)"/);

  if (!token) {
    return null;
  }

  return {
    token,
    cultureId: cultureIdMatch ? Number(cultureIdMatch[1]) : 1,
    cultureName: cultureNameMatch?.[1] ?? "en-US",
  };
}

function buildWorldBankJobUrl(requisitionId: number) {
  return `https://worldbankgroup.csod.com/ux/ats/careersite/1/home/requisition/${requisitionId}?c=worldbankgroup`;
}

function stripHtml(value?: string | null) {
  if (!value) {
    return null;
  }
  return cheerio.load(`<div>${value}</div>`)("div").text().replace(/\s+/g, " ").trim() || null;
}

function buildLocation(
  locations?: Array<{
    city?: string | null;
    country?: string | null;
  }>,
) {
  const first = locations?.[0];
  if (!first) {
    return null;
  }

  return [first.city?.trim(), first.country?.trim()].filter(Boolean).join(", ") || null;
}

async function fetchWorldBankJobs(
  context: AdapterContext,
  tokenContext: WorldBankTokenContext,
) {
  const allJobs: RawJobPosting[] = [];
  const pageSize = 25;
  let pageNumber = 1;
  let totalCount = Infinity;

  while (allJobs.length < totalCount && allJobs.length < 100) {
    const response = await fetchJsonWithRetry<WorldBankResponse>(
      "https://us.api.csod.com/rec-job-search/external/jobs",
      {
        signal: context.signal,
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenContext.token}`,
        },
        body: JSON.stringify({
          careerSiteId: 1,
          careerSitePageId: 1,
          pageNumber,
          pageSize,
          cultureId: tokenContext.cultureId,
          searchText: context.query.keywords?.trim() ?? "",
          cultureName: tokenContext.cultureName,
          states: [],
          countryCodes: [],
          cities: [],
          placeID: "",
          radius: null,
          postingsWithinDays: null,
          customFieldCheckboxKeys: [],
          customFieldDropdowns: [],
          customFieldRadios: [],
        }),
      },
    );

    totalCount = response.data?.totalCount ?? 0;
    const requisitions = response.data?.requisitions ?? [];

    for (const requisition of requisitions) {
      if (!requisition.requisitionId || !requisition.displayJobTitle) {
        continue;
      }

      allJobs.push({
        title: requisition.displayJobTitle,
        url: buildWorldBankJobUrl(requisition.requisitionId),
        locationRaw: buildLocation(requisition.locations),
        postedRaw: requisition.postingEffectiveDate ?? null,
        descriptionSnippet: stripHtml(requisition.externalDescription),
        requisitionId: String(requisition.requisitionId),
      });
    }

    if (requisitions.length < pageSize) {
      break;
    }
    pageNumber += 1;
  }

  return allJobs;
}

export const worldBankAdapter: Adapter = async (context) => {
  const html = await fetchTextWithRetry(context.company.careerUrl, {
    signal: context.signal,
  });
  const tokenContext = extractWorldBankTokenContext(html);
  if (!tokenContext) {
    throw new Error("World Bank token was not available on the public careers page");
  }

  const jobs = await fetchWorldBankJobs(context, tokenContext);

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

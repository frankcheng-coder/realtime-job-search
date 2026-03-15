import { fetchJsonWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import { isBlockedJobUrl } from "@/lib/normalize";
import type { Adapter, RawJobPosting } from "@/lib/types";

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
        locationRaw: posting.locationsText ?? posting.bulletFields?.[0] ?? null,
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

  return {
    sourceType: "workday",
    jobs: filterJobsByKeywords(allJobs, context.query.keywords),
  };
};

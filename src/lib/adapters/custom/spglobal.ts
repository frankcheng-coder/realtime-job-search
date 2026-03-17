import { fetchJsonWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting } from "@/lib/types";

const SP_GLOBAL_SEARCH_URL = "https://careers.spglobal.com/api/jobs";
const PAGE_SIZE = 100;

type SpGlobalJob = {
  data?: {
    req_id?: string | null;
    title?: string | null;
    description?: string | null;
    full_location?: string | null;
    posted_date?: string | null;
    canonical_url?: string | null;
    apply_url?: string | null;
  };
};

type SpGlobalSearchResponse = {
  jobs?: SpGlobalJob[];
};

function cleanText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function buildMetroLocationLabel(locationKeywords: string[]) {
  return (
    locationKeywords.find((keyword) => /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(keyword)) ??
    locationKeywords.find((keyword) => keyword.includes(",")) ??
    null
  );
}

function buildSearchUrl(keywords?: string, location?: string | null) {
  const url = new URL(SP_GLOBAL_SEARCH_URL);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("page", "1");
  if (keywords?.trim()) {
    url.searchParams.set("keywords", keywords.trim());
  }
  if (location) {
    url.searchParams.set("location", location);
  }
  return url.toString();
}

export const spGlobalAdapter: Adapter = async (context) => {
  const location = buildMetroLocationLabel(context.query.metroPreset.locationKeywords);
  const response = await fetchJsonWithRetry<SpGlobalSearchResponse>(
    buildSearchUrl(context.query.keywords, location),
    { signal: context.signal },
  );

  const jobs = (response.jobs ?? [])
    .map((job) => {
      const data = job.data;
      const title = cleanText(data?.title);
      const url = cleanText(data?.canonical_url) ?? cleanText(data?.apply_url);

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw: cleanText(data?.full_location),
        postedAt: cleanText(data?.posted_date),
        descriptionSnippet: cleanText(data?.description),
        requisitionId: cleanText(data?.req_id),
      } satisfies RawJobPosting;
    })
    .filter(Boolean) as RawJobPosting[];

  return {
    sourceType: "custom",
    jobs,
  };
};

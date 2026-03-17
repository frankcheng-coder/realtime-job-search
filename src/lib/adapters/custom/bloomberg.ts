import { filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchJsonWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting } from "@/lib/types";

const BLOOMBERG_SEARCH_URL = "https://bloomberg.avature.net/careers/SearchJobsJson";
const PAGE_SIZE = 100;

type BloombergJob = {
  id?: string | number | null;
  title?: string | null;
  location?: string | null;
  datePosted?: string | null;
  applyUrl?: string | null;
  url?: string | null;
  category?: string | null;
  department?: string | null;
  description?: string | null;
};

type BloombergSearchResponse = {
  jobs?: BloombergJob[];
  total?: number;
};

function buildSearchUrl(keywords?: string) {
  const url = new URL(BLOOMBERG_SEARCH_URL);
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  if (keywords?.trim()) {
    url.searchParams.set("search", keywords.trim());
  }
  return url.toString();
}

export const bloombergAdapter: Adapter = async (context) => {
  const response = await fetchJsonWithRetry<BloombergSearchResponse>(
    buildSearchUrl(context.query.keywords),
    { signal: context.signal },
  );

  const base = "https://bloomberg.avature.net";
  const jobs = (response.jobs ?? [])
    .map((job) => {
      const title = job.title?.trim();
      const rawUrl = job.applyUrl ?? job.url;
      if (!title || !rawUrl) {
        return null;
      }

      let url: string;
      try {
        url = new URL(rawUrl, base).toString();
      } catch {
        return null;
      }

      return {
        title,
        url,
        locationRaw: job.location?.trim() ?? null,
        postedAt: job.datePosted ?? null,
        descriptionSnippet: job.category ?? job.department ?? null,
        requisitionId: job.id ? String(job.id) : null,
      } satisfies RawJobPosting;
    })
    .filter(Boolean) as RawJobPosting[];

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { absoluteUrl, buildQueryUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchTextWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting } from "@/lib/types";

const DETAIL_CONCURRENCY = 4;
const DETAIL_ENRICHMENT_LIMIT = 20;

function buildEySearchUrl(keywords?: string, location = "Washington, DC") {
  return buildQueryUrl("https://careers.ey.com/ey/search/", {
    createNewAlert: "false",
    q: keywords,
    locationsearch: location,
    optionsFacetsDD_country: "",
    optionsFacetsDD_customfield1: "",
    locale: "en_US",
  });
}

function getSearchLocationLabel() {
  return "Washington, DC";
}

function extractEyJobs(html: string, searchUrl: string) {
  const $ = cheerio.load(html);
  const jobs: RawJobPosting[] = [];

  $("tr.data-row").each((_, row) => {
    const anchor = $(row).find("a.jobTitle-link").first();
    const title = anchor.text().replace(/\s+/g, " ").trim();
    const url = absoluteUrl(searchUrl, anchor.attr("href"));
    const locationRaw =
      $(row).find(".jobLocation").first().text().replace(/\s+/g, " ").trim() || null;
    const requisitionId = url?.match(/\/(\d+)\/?$/)?.[1] ?? null;

    if (!title || !url) {
      return;
    }

    jobs.push({
      title,
      url,
      locationRaw,
      descriptionSnippet: null,
      requisitionId,
    });
  });

  return jobs;
}

async function enrichEyJob(job: RawJobPosting, signal: AbortSignal) {
  try {
    const html = await fetchTextWithRetry(job.url, { signal });
    const $ = cheerio.load(html);
    const rawDate = $('[itemprop="datePosted"]').attr("content") ?? null;
    const parsedDate = rawDate ? new Date(rawDate) : null;

    return {
      ...job,
      postedAt:
        parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : job.postedAt,
    };
  } catch {
    return job;
  }
}

export const eyAdapter: Adapter = async (context) => {
  const searchUrl = buildEySearchUrl(context.query.keywords, getSearchLocationLabel());
  const html = await fetchTextWithRetry(searchUrl, { signal: context.signal });
  const jobs = extractEyJobs(html, searchUrl);
  const limit = pLimit(DETAIL_CONCURRENCY);
  const enriched = await Promise.all(
    jobs.map((job, index) =>
      index >= DETAIL_ENRICHMENT_LIMIT
        ? job
        : limit(() => enrichEyJob(job, context.signal)),
    ),
  );

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(enriched, context.query.keywords),
  };
};

import * as cheerio from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, buildQueryUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter, RawJobPosting } from "@/lib/types";

function buildCapitalOneSearchUrl(keywords?: string) {
  return buildQueryUrl("https://www.capitalonecareers.com/search-jobs", {
    keywords,
  });
}

export const capitalOneAdapter: Adapter = async (context) => {
  const searchUrl = buildCapitalOneSearchUrl(context.query.keywords);
  const html = await fetchTextWithRetry(searchUrl, { signal: context.signal });
  const $ = cheerio.load(html);

  const jobs = $("li")
    .map((_, element) => {
      const anchor = $(element).find("a[href*='/job/']").first();
      const title =
        $(element).find("h2").first().text().replace(/\s+/g, " ").trim() ||
        anchor.text().replace(/\s+/g, " ").trim();
      const url = absoluteUrl(searchUrl, anchor.attr("href"));
      const locationRaw =
        $(element).find(".job-location").first().text().replace(/\s+/g, " ").trim() || null;
      const postedRaw =
        $(element).find(".job-date-posted").first().text().replace(/\s+/g, " ").trim() || null;
      const requisitionId =
        anchor.attr("data-job-id")?.trim() ||
        $(element).find(".job-search-info span").first().text().replace(/\s+/g, " ").trim() ||
        null;

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw,
        postedRaw,
        requisitionId,
        descriptionSnippet: null,
      } satisfies RawJobPosting;
    })
    .get()
    .filter(Boolean) as RawJobPosting[];

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

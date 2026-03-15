import * as cheerio from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter } from "@/lib/types";

export const greenhouseAdapter: Adapter = async (context) => {
  const boardUrl = context.company.fallbackCareerUrl ?? context.company.careerUrl;
  const html = await fetchTextWithRetry(boardUrl, { signal: context.signal });
  const $ = cheerio.load(html);
  const jobs = $(".opening, .job-post, [data-mapped=\"true\"]")
    .map((_, element) => {
      const anchor = $(element).find("a[href]").first();
      const title = anchor.text().replace(/\s+/g, " ").trim();
      const url = absoluteUrl(boardUrl, anchor.attr("href"));
      const locationRaw =
        $(element).find(".location, [class*='location']").first().text().trim() || null;
      const descriptionSnippet =
        $(element).find(".opening-note, .team, [class*='department']").first().text().trim() || null;

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw,
        descriptionSnippet,
        postedAt: null,
        postedRaw: null,
      };
    })
    .get()
    .filter(Boolean);

  return {
    sourceType: "greenhouse",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

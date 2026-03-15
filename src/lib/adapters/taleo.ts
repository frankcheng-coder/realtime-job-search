import * as cheerio from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter } from "@/lib/types";

export const taleoAdapter: Adapter = async (context) => {
  const targetUrl = context.company.fallbackCareerUrl ?? context.company.careerUrl;
  const html = await fetchTextWithRetry(targetUrl, { signal: context.signal });
  const $ = cheerio.load(html);
  const jobs = $("tr, .job, .searchResult")
    .map((_, element) => {
      const anchor = $(element).find("a[href]").first();
      const title = anchor.text().replace(/\s+/g, " ").trim();
      const url = absoluteUrl(targetUrl, anchor.attr("href"));
      const cells = $(element).find("td");
      const locationRaw =
        cells.eq(1).text().trim() ||
        $(element).find("[class*='location']").first().text().trim() ||
        null;
      const postedRaw =
        cells.eq(2).text().trim() ||
        $(element).find("[class*='date']").first().text().trim() ||
        null;
      const requisitionId =
        $(element).text().match(/\b(?:job number|requisition)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ?? null;

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw,
        postedRaw,
        requisitionId,
        descriptionSnippet: $(element).text().replace(/\s+/g, " ").trim() || null,
      };
    })
    .get()
    .filter(Boolean);

  return {
    sourceType: "taleo",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

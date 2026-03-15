import * as cheerio from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter, RawJobPosting } from "@/lib/types";

async function enrichPostedDate(job: RawJobPosting, signal: AbortSignal) {
  if (job.postedRaw || !job.url) {
    return job;
  }
  try {
    const html = await fetchTextWithRetry(job.url, { signal });
    const $ = cheerio.load(html);
    const details = $("body").text().replace(/\s+/g, " ");
    const postedRaw =
      details.match(
        /\b(?:posted date|date posted)\b[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d+\s+days?\s+ago|today|yesterday)/i,
      )?.[1] ?? null;

    return {
      ...job,
      postedRaw,
    };
  } catch {
    return job;
  }
}

export const icimsAdapter: Adapter = async (context) => {
  const html = await fetchTextWithRetry(context.company.careerUrl, { signal: context.signal });
  const $ = cheerio.load(html);
  const jobs = $(".iCIMS_JobsTable tr, .iCIMS_JobResult, [class*='job-row']")
    .map((_, element) => {
      const anchor = $(element).find("a[href]").first();
      const title = anchor.text().replace(/\s+/g, " ").trim();
      const url = absoluteUrl(context.company.careerUrl, anchor.attr("href"));
      const locationRaw =
        $(element).find(".iCIMS_JobHeaderField, [class*='location']").first().text().trim() || null;
      const text = $(element).text().replace(/\s+/g, " ").trim();
      const postedRaw =
        text.match(
          /\b(?:posted date|date posted|posted)\b[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d+\s+days?\s+ago|today|yesterday)/i,
        )?.[1] ?? null;
      const requisitionId = text.match(/\b(?:job id|requisition id)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ?? null;

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw,
        postedRaw,
        requisitionId,
        descriptionSnippet: text || null,
      };
    })
    .get()
    .filter(Boolean) as RawJobPosting[];

  const enriched = await Promise.all(jobs.map((job) => enrichPostedDate(job, context.signal)));
  return {
    sourceType: "icims",
    jobs: filterJobsByKeywords(enriched, context.query.keywords),
  };
};

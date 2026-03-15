import * as cheerio from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter, RawJobPosting } from "@/lib/types";

async function enrichDetail(job: RawJobPosting, signal: AbortSignal) {
  if (job.postedRaw) {
    return job;
  }

  try {
    const html = await fetchTextWithRetry(job.url, { signal });
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ").trim();
    return {
      ...job,
      postedRaw:
        text.match(
          /\b(?:posted|date posted)\b[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d+\s+days?\s+ago|today|yesterday)/i,
        )?.[1] ?? null,
      requisitionId:
        job.requisitionId ?? text.match(/\b(?:job number|job code|req(?:uisition)?)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ?? null,
    };
  } catch {
    return job;
  }
}

export const brassringAdapter: Adapter = async (context) => {
  const html = await fetchTextWithRetry(context.company.fallbackCareerUrl ?? context.company.careerUrl, {
    signal: context.signal,
  });
  const $ = cheerio.load(html);
  const jobs = $("a[href*='jobDetails'], a[href*='JobDetails'], a[href*='jobdetail']")
    .map((_, element) => {
      const title = $(element).text().replace(/\s+/g, " ").trim();
      const url = absoluteUrl(context.company.fallbackCareerUrl ?? context.company.careerUrl, $(element).attr("href"));
      const cardText = $(element).closest("tr, li, article, div").text().replace(/\s+/g, " ").trim();
      if (!title || !url) {
        return null;
      }
      return {
        title,
        url,
        locationRaw:
          cardText.match(/\b[A-Za-z .'-]+,\s*(?:DC|VA|MD)\b/)?.[0] ??
          cardText.match(/\b(?:Remote|Hybrid|On-site|Onsite)\b/i)?.[0] ??
          null,
        postedRaw:
          cardText.match(
            /\b(?:posted|date posted)\b[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d+\s+days?\s+ago|today|yesterday)/i,
          )?.[1] ?? null,
        requisitionId: cardText.match(/\b(?:job number|req(?:uisition)?)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ?? null,
        descriptionSnippet: cardText || null,
      };
    })
    .get()
    .filter(Boolean) as RawJobPosting[];

  const enriched = await Promise.all(jobs.map((job) => enrichDetail(job, context.signal)));
  return {
    sourceType: "brassring",
    jobs: filterJobsByKeywords(enriched, context.query.keywords),
  };
};

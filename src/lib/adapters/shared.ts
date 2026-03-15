import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { fetchTextWithRetry } from "@/lib/http";
import type { AdapterContext, RawJobPosting } from "@/lib/types";

const JOB_TITLE_HINT = /\b(job|career|opening|position|opportunity|role|apply)\b/i;
const LOCATION_HINT =
  /\b(remote|hybrid|on-site|onsite|washington|arlington|alexandria|bethesda|reston|fairfax|mclean|tysons|silver spring|rockville|college park|dc|va|md)\b/i;
const DATE_HINT =
  /\b(today|yesterday|\d+\s+(?:hours?|days?)\s+ago|posted\s+\d+|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{1,2}\/\d{1,2}\/\d{4})\b/i;
const REQ_HINT = /\b(?:req(?:uisition)?|job id|job requisition|requisition id|reference)\b[:#\s-]*([a-z0-9-]+)/i;

export async function loadHtml(url: string, signal: AbortSignal) {
  const html = await fetchTextWithRetry(url, { signal });
  return cheerio.load(html);
}

export function absoluteUrl(baseUrl: string, href?: string | null) {
  if (!href) {
    return null;
  }
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function collectTextFromNode($: CheerioAPI, selector: Parameters<CheerioAPI>[0]) {
  return $(selector).text().replace(/\s+/g, " ").trim();
}

function nearestText($: CheerioAPI, node: Parameters<CheerioAPI>[0]) {
  const container = $(node).closest("article, li, tr, div, section");
  return container.text().replace(/\s+/g, " ").trim();
}

export function extractGenericListings($: CheerioAPI, baseUrl: string) {
  const jobs: RawJobPosting[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, link) => {
    const href = $(link).attr("href");
    const url = absoluteUrl(baseUrl, href);
    const title = collectTextFromNode($, link);

    if (!url || !title || title.length < 4) {
      return;
    }

    const lowerUrl = url.toLowerCase();
    if (
      !JOB_TITLE_HINT.test(title) &&
      !lowerUrl.includes("/job") &&
      !lowerUrl.includes("jobs") &&
      !lowerUrl.includes("careers")
    ) {
      return;
    }

    if (seen.has(url)) {
      return;
    }

    const text = nearestText($, link);
    const locationMatch = text.match(LOCATION_HINT);
    const dateMatch = text.match(DATE_HINT);
    const reqMatch = text.match(REQ_HINT);
    const descriptionSnippet = text && text !== title ? text : null;

    jobs.push({
      title,
      url,
      locationRaw: locationMatch?.[0] ?? null,
      postedRaw: dateMatch?.[0] ?? null,
      descriptionSnippet,
      requisitionId: reqMatch?.[1] ?? null,
    });
    seen.add(url);
  });

  return jobs;
}

export function extractJsonLdJobs($: CheerioAPI, baseUrl: string) {
  const jobs: RawJobPosting[] = [];

  $('script[type="application/ld+json"]').each((_, script) => {
    const raw = $(script).contents().text();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        const candidate = entry?.["@graph"] ? entry["@graph"] : [entry];
        for (const node of candidate) {
          if (node?.["@type"] !== "JobPosting") {
            continue;
          }
          const url = absoluteUrl(baseUrl, node.url);
          if (!url || !node.title) {
            continue;
          }
          jobs.push({
            title: String(node.title),
            url,
            locationRaw:
              node.jobLocation?.address?.addressLocality ||
              node.jobLocation?.address?.addressRegion ||
              node.applicantLocationRequirements?.[0]?.name ||
              null,
            postedAt: node.datePosted ?? null,
            descriptionSnippet:
              typeof node.description === "string"
                ? node.description.replace(/<[^>]+>/g, " ")
                : null,
            requisitionId: node.identifier?.value ?? null,
          });
        }
      }
    } catch {
      return;
    }
  });

  return jobs;
}

export async function extractWithPlaywright(
  context: AdapterContext,
  url: string,
  selectors: string[] = ['a[href*="job"]', 'a[href*="career"]'],
) {
  return context.browser.withPage(async (page) => {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 8_000,
    });

    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count === 0) {
        continue;
      }
      const raw = await page.locator(selector).evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const anchor = node as HTMLAnchorElement;
            const cardText =
              anchor.closest("article, li, div, section")?.textContent?.replace(/\s+/g, " ").trim() ??
              anchor.textContent?.replace(/\s+/g, " ").trim() ??
              "";
            return {
              title: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
              url: anchor.href,
              locationRaw:
                cardText.match(
                  /\b(remote|hybrid|on-site|onsite|washington|arlington|alexandria|bethesda|reston|fairfax|mclean|tysons|silver spring|rockville|college park|dc|va|md)\b/i,
                )?.[0] ?? null,
              postedRaw:
                cardText.match(
                  /\b(today|yesterday|\d+\s+(?:hours?|days?)\s+ago|posted\s+\d+|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{1,2}\/\d{1,2}\/\d{4})\b/i,
                )?.[0] ?? null,
              descriptionSnippet: cardText || null,
              requisitionId:
                cardText.match(/\b(?:req(?:uisition)?|job id|reference)\b[:#\s-]*([a-z0-9-]+)/i)?.[1] ??
                null,
            };
          })
          .filter((job) => job.url && job.title),
      );

      if (raw.length > 0) {
        return raw satisfies RawJobPosting[];
      }
    }

    return [] as RawJobPosting[];
  });
}

export function filterJobsByKeywords(jobs: RawJobPosting[], keywords?: string) {
  if (!keywords?.trim()) {
    return jobs;
  }

  const tokens = keywords
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return jobs.filter((job) => {
    const haystack =
      `${job.title} ${job.locationRaw ?? ""} ${job.descriptionSnippet ?? ""}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export async function scrapeHtmlWithFallback(context: AdapterContext, url: string) {
  const $ = await loadHtml(url, context.signal);
  const jsonLdJobs = extractJsonLdJobs($, url);
  if (jsonLdJobs.length > 0) {
    return jsonLdJobs;
  }

  const htmlJobs = extractGenericListings($, url);
  if (htmlJobs.length > 0) {
    return htmlJobs;
  }

  return extractWithPlaywright(context, url);
}

export function buildQueryUrl(
  baseUrl: string,
  params: Record<string, string | null | undefined>,
) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

import { buildQueryUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import type { Adapter, RawJobPosting } from "@/lib/types";

function buildMitreSearchUrl(keywords?: string, location = "McLean, VA") {
  return buildQueryUrl("https://careers.mitre.org/us/en/search-results", {
    keywords,
    location,
  });
}

function extractMitrePostedAt(cardText: string) {
  const rawDate = cardText.match(/Posted Date\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4})/i)?.[1];
  if (!rawDate) {
    return null;
  }

  const normalized = rawDate.replace(/(\d{1,2})(st|nd|rd|th)\b/i, "$1");
  const parsedDate = new Date(normalized);
  return Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : null;
}

function extractMitreLocation(cardText: string) {
  return cardText.match(/Location\s+(.+?)\s+Shift Type/i)?.[1]?.trim() ?? null;
}

export const mitreAdapter: Adapter = async (context) => {
  const searchUrl = buildMitreSearchUrl(context.query.keywords);
  const jobs = await context.browser.withPage(async (page) => {
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 8_000,
    });
    await page.waitForSelector('a[href*="/us/en/job/"]', {
      timeout: 6_000,
    });

    const rawJobs = await page.locator('a[href*="/us/en/job/"]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const anchor = node as HTMLAnchorElement;
        const cardText =
          anchor
            .closest("li, article, div, section")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? "";

        return {
          title: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
          url: anchor.href,
          locationRaw: cardText,
          descriptionSnippet: cardText,
          requisitionId: anchor.href.match(/\/job\/([^/]+)/)?.[1] ?? null,
          postedRaw: cardText,
        } satisfies RawJobPosting;
      }),
    );

    const seen = new Set<string>();
    return rawJobs.filter((job) => {
      if (!job.title || !job.url || seen.has(job.url)) {
        return false;
      }
      seen.add(job.url);
      return true;
    });
  });

  const normalizedJobs = jobs.map((job) => ({
    ...job,
    locationRaw: extractMitreLocation(job.locationRaw ?? job.descriptionSnippet ?? ""),
    postedAt: extractMitrePostedAt(job.postedRaw ?? job.descriptionSnippet ?? ""),
    postedRaw: null,
  }));

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(normalizedJobs, context.query.keywords),
  };
};

import { filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchTextWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting } from "@/lib/types";

const WELLS_FARGO_SITEMAP_URL = "https://www.wellsfargojobs.com/sitemap.xml";

function decodeSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferLocationFromSlug(slugText: string) {
  const normalized = slugText.toLowerCase();
  const locationHints = [
    "washington",
    "dc",
    "arlington",
    "alexandria",
    "mclean",
    "tysons",
    "reston",
    "fairfax",
    "herndon",
    "bethesda",
    "silver spring",
    "rockville",
    "college park",
    "vienna",
    "falls church",
    "va",
    "md",
  ];

  return locationHints.some((hint) => normalized.includes(hint)) ? toTitleCase(slugText) : null;
}

function parseSitemapJobs(xml: string) {
  const matches = [
    ...xml.matchAll(
      /<loc>(https:\/\/www\.wellsfargojobs\.com\/en\/jobs\/[^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g,
    ),
  ];

  const jobs: RawJobPosting[] = [];
  for (const match of matches) {
    const url = match[1];
    const lastmod = match[2];
    const slugMatch = url.match(/\/en\/jobs\/r-\d+\/([^/]+)\/?$/i);
    const requisitionId = url.match(/\/(r-\d+)\//i)?.[1]?.toUpperCase() ?? null;

    if (!slugMatch?.[1]) {
      continue;
    }

    const slugText = decodeSlug(slugMatch[1]);
    const title = toTitleCase(slugText);

    jobs.push({
      title,
      url,
      locationRaw: inferLocationFromSlug(slugText),
      postedAt: lastmod,
      postedRaw: null,
      descriptionSnippet: `Official Wells Fargo sitemap listing for ${title}.`,
      requisitionId,
    });
  }

  return jobs;
}

export const wellsFargoAdapter: Adapter = async (context) => {
  const xml = await fetchTextWithRetry(WELLS_FARGO_SITEMAP_URL, {
    signal: context.signal,
  });

  const jobs = parseSitemapJobs(xml);

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

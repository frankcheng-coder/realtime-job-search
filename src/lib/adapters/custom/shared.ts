import { buildQueryUrl, filterJobsByKeywords, scrapeHtmlWithFallback } from "@/lib/adapters/shared";
import type { Adapter, AdapterContext } from "@/lib/types";

export type CustomCompanyParser = {
  buildUrl: (context: AdapterContext) => string;
};

export function createCustomAdapter(parser: CustomCompanyParser): Adapter {
  return async (context) => {
    const url = parser.buildUrl(context);
    const jobs = await scrapeHtmlWithFallback(context, url);
    return {
      sourceType: "custom",
      jobs: filterJobsByKeywords(jobs, context.query.keywords),
    };
  };
}

export function createFixedUrlAdapter(url: string): Adapter {
  return createCustomAdapter({
    buildUrl: () => url,
  });
}

export function buildSimpleKeywordUrl(baseUrl: string, keywords?: string, location?: string) {
  return buildQueryUrl(baseUrl, {
    q: keywords,
    keyword: keywords,
    keywords,
    location,
  });
}

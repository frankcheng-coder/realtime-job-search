import { buildSimpleKeywordUrl } from "@/lib/adapters/custom/shared";
import { filterJobsByKeywords, scrapeHtmlWithFallback } from "@/lib/adapters/shared";
import type { Adapter } from "@/lib/types";

export const saicAdapter: Adapter = async (context) => {
  const url = buildSimpleKeywordUrl(context.company.careerUrl, context.query.keywords, "Washington, DC");

  try {
    const jobs = await scrapeHtmlWithFallback(context, url);
    return {
      sourceType: "custom",
      jobs: filterJobsByKeywords(jobs, context.query.keywords),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("HTTP 403")) {
      throw new Error(
        "SAIC's public jobs site is currently serving a Cloudflare challenge instead of search results in this environment.",
      );
    }
    throw error;
  }
};

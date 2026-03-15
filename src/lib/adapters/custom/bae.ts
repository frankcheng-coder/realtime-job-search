import { buildSimpleKeywordUrl, createCustomAdapter } from "@/lib/adapters/custom/shared";

export const baeAdapter = createCustomAdapter({
  buildUrl: (context) =>
    buildSimpleKeywordUrl(context.company.careerUrl, context.query.keywords, "Falls Church, VA"),
});

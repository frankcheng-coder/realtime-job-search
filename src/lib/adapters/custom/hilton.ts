import { buildSimpleKeywordUrl, createCustomAdapter } from "@/lib/adapters/custom/shared";

export const hiltonAdapter = createCustomAdapter({
  buildUrl: (context) =>
    buildSimpleKeywordUrl(context.company.careerUrl, context.query.keywords, "McLean, VA"),
});

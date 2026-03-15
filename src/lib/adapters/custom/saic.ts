import { buildSimpleKeywordUrl, createCustomAdapter } from "@/lib/adapters/custom/shared";

export const saicAdapter = createCustomAdapter({
  buildUrl: (context) =>
    buildSimpleKeywordUrl(context.company.careerUrl, context.query.keywords, "Washington, DC"),
});

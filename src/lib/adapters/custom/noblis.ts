import { buildSimpleKeywordUrl, createCustomAdapter } from "@/lib/adapters/custom/shared";

export const noblisAdapter = createCustomAdapter({
  buildUrl: (context) =>
    buildSimpleKeywordUrl(context.company.careerUrl, context.query.keywords, "Reston, VA"),
});

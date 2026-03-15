import { buildSimpleKeywordUrl, createCustomAdapter } from "@/lib/adapters/custom/shared";

export const accentureAdapter = createCustomAdapter({
  buildUrl: (context) =>
    buildSimpleKeywordUrl(
      context.company.careerUrl,
      context.query.keywords,
      context.query.metroPreset.label,
    ),
});

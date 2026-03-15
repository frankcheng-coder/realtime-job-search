import { createCustomAdapter } from "@/lib/adapters/custom/shared";

export const amazonAdapter = createCustomAdapter({
  buildUrl: (context) =>
    `https://www.amazon.jobs/en/search?base_query=${encodeURIComponent(
      context.query.keywords ?? "",
    )}&loc_query=${encodeURIComponent(context.query.metroPreset.label)}`,
});

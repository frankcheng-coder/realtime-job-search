import { createCustomAdapter } from "@/lib/adapters/custom/shared";

export const microsoftAdapter = createCustomAdapter({
  buildUrl: (context) =>
    `https://jobs.careers.microsoft.com/global/en/search?q=${encodeURIComponent(
      context.query.keywords ?? "",
    )}&lc=${encodeURIComponent("Washington, DC")}`,
});

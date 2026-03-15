import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { BrowserManager } from "@/lib/types";

export function createBrowserManager(): BrowserManager {
  let browserPromise: Promise<Browser> | null = null;
  let contextPromise: Promise<BrowserContext> | null = null;

  async function getContext() {
    if (!browserPromise) {
      browserPromise = chromium.launch({ headless: true });
    }
    if (!contextPromise) {
      contextPromise = browserPromise.then((browser) =>
        browser.newContext({
          userAgent:
            "RealtimeJobSearchBot/1.0 (+https://localhost; public-access-only; contact: local-dev)",
        }),
      );
    }
    return contextPromise;
  }

  return {
    async withPage<T>(fn: (page: Page) => Promise<T>) {
      const context = await getContext();
      const page = await context.newPage();
      try {
        return await fn(page);
      } finally {
        await page.close();
      }
    },
    async close() {
      if (contextPromise) {
        const context = await contextPromise;
        await context.close();
      }
      if (browserPromise) {
        const browser = await browserPromise;
        await browser.close();
      }
    },
  };
}

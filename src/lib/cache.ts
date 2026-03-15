import { LRUCache } from "lru-cache";
import type { SearchRequest, SearchResponse } from "@/lib/types";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const searchCache = new LRUCache<string, SearchResponse>({
  max: 50,
  ttl: FIVE_MINUTES_MS,
});

export function buildSearchCacheKey(input: SearchRequest) {
  return JSON.stringify({
    keywords: input.keywords?.trim().toLowerCase() ?? "",
    metro: input.metro ?? "dc_metro",
    postedWindowDays: input.postedWindowDays,
    companies: [...(input.companies ?? [])].sort(),
    remoteType: input.remoteType ?? "any",
  });
}

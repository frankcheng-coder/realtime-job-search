import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildSearchCacheKey, searchCache } from "@/lib/cache";
import { executeSearch } from "@/lib/search";
import { searchRequestSchema, searchResponseSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 25;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = searchRequestSchema.parse({
      metro: "dc_metro",
      remoteType: "any",
      ...body,
    });

    const cacheKey = buildSearchCacheKey(parsed);
    const cached = searchCache.get(cacheKey);
    if (cached) {
      const response = searchResponseSchema.parse({
        ...cached,
        meta: {
          ...cached.meta,
          cacheHit: true,
          durationMs: 0,
        },
      });
      return NextResponse.json(response);
    }

    const response = await executeSearch(parsed);
    searchCache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid search request",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search request failed",
      },
      { status: 500 },
    );
  }
}

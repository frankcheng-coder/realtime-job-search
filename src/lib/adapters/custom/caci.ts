import { absoluteUrl, filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchJsonWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting, RemoteType } from "@/lib/types";

type CaciSearchResponse = {
  data?: {
    positions?: Array<{
      id?: number;
      displayJobId?: string | null;
      name?: string | null;
      locations?: string[];
      postedTs?: number | null;
      department?: string | null;
      workLocationOption?: string | null;
      atsJobId?: string | null;
      positionUrl?: string | null;
    }>;
  };
};

function caciRemoteType(value?: string | null): RemoteType {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("hybrid")) {
    return "hybrid";
  }
  if (normalized.includes("remote")) {
    return "remote";
  }
  if (normalized.includes("onsite")) {
    return "onsite";
  }
  return "unknown";
}

function buildCaciSearchUrl(keywords?: string, location = "Reston, VA") {
  const url = new URL("https://searchcareers.caci.com/api/pcsx/search");
  url.searchParams.set("domain", "caci.com");
  url.searchParams.set("query", keywords?.trim() ?? "");
  url.searchParams.set("location", location);
  url.searchParams.set("start", "0");
  url.searchParams.set("sort_by", "timestamp");
  return url.toString();
}

export const caciAdapter: Adapter = async (context) => {
  const response = await fetchJsonWithRetry<CaciSearchResponse>(
    buildCaciSearchUrl(context.query.keywords),
    { signal: context.signal },
  );

  const jobs: RawJobPosting[] = [];
  for (const position of response.data?.positions ?? []) {
    const title = position.name?.trim();
    const url = absoluteUrl(context.company.careerUrl, position.positionUrl);

    if (!title || !url) {
      continue;
    }

    const postedAt =
      typeof position.postedTs === "number"
        ? new Date(position.postedTs * 1_000).toISOString()
        : null;

    jobs.push({
      title,
      url,
      locationRaw: position.locations?.[0] ?? null,
      postedAt,
      descriptionSnippet: position.department ?? null,
      requisitionId:
        position.atsJobId?.trim() ?? position.displayJobId?.trim() ?? String(position.id ?? ""),
      remoteType: caciRemoteType(position.workLocationOption),
    });
  }

  return {
    sourceType: "custom",
    jobs: filterJobsByKeywords(jobs, context.query.keywords),
  };
};

import pLimit from "p-limit";
import { filterJobsByKeywords } from "@/lib/adapters/shared";
import { fetchJsonWithRetry } from "@/lib/http";
import type { Adapter, RawJobPosting, RemoteType } from "@/lib/types";

const MICROSTRATEGY_POSITIONS_URL = "https://api.microstrategy.com/SR/positions";
const DETAIL_CONCURRENCY = 4;

type MicroStrategyPosition = {
  country?: string | null;
  city?: string | null;
  department?: string | null;
  title?: string | null;
  url?: string | null;
  publishedOn?: string | null;
  remote?: boolean | null;
  employmentType?: string | null;
  experience?: string | null;
};

type MicroStrategyPositionDetail = {
  id?: string;
  refNumber?: string | null;
  location?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    remote?: boolean | null;
    hybrid?: boolean | null;
    fullLocation?: string | null;
  } | null;
  releasedDate?: string | null;
  postingUrl?: string | null;
  jobAd?: {
    sections?: Record<
      string,
      {
        title?: string | null;
        text?: string | null;
      }
    >;
  } | null;
};

function cleanText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function buildLocation(position: MicroStrategyPosition) {
  return [cleanText(position.city), cleanText(position.country)].filter(Boolean).join(", ") || null;
}

function buildDescription(position: MicroStrategyPosition) {
  return [cleanText(position.department), cleanText(position.experience), cleanText(position.employmentType)]
    .filter(Boolean)
    .join(" • ") || null;
}

function microStrategyRemoteType(detail?: MicroStrategyPositionDetail | null): RemoteType {
  if (detail?.location?.hybrid) {
    return "hybrid";
  }
  if (detail?.location?.remote) {
    return "remote";
  }
  return "onsite";
}

function stripHtml(value?: string | null) {
  return cleanText(value?.replace(/<[^>]+>/g, " "));
}

async function enrichPosition(position: RawJobPosting, signal: AbortSignal) {
  try {
    const detail = await fetchJsonWithRetry<MicroStrategyPositionDetail>(position.url, {
      signal,
    });

    return {
      ...position,
      url: detail.postingUrl ?? position.url,
      locationRaw: cleanText(detail.location?.fullLocation) ?? position.locationRaw,
      postedAt: detail.releasedDate ?? position.postedAt ?? null,
      descriptionSnippet:
        stripHtml(detail.jobAd?.sections?.jobDescription?.text) ??
        stripHtml(detail.jobAd?.sections?.companyDescription?.text) ??
        position.descriptionSnippet,
      requisitionId: cleanText(detail.refNumber) ?? position.requisitionId,
      remoteType: microStrategyRemoteType(detail),
    } satisfies RawJobPosting;
  } catch {
    return position;
  }
}

export const microStrategyAdapter: Adapter = async (context) => {
  const positions = await fetchJsonWithRetry<MicroStrategyPosition[]>(MICROSTRATEGY_POSITIONS_URL, {
    signal: context.signal,
  });

  const jobs = positions
    .map((position) => {
      const title = cleanText(position.title);
      const url = cleanText(position.url);

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        locationRaw: buildLocation(position),
        postedAt: cleanText(position.publishedOn),
        descriptionSnippet: buildDescription(position),
        remoteType: position.remote ? "remote" : "onsite",
      } satisfies RawJobPosting;
    })
    .filter(Boolean) as RawJobPosting[];

  const keywordMatches = filterJobsByKeywords(jobs, context.query.keywords);
  const limit = pLimit(DETAIL_CONCURRENCY);
  const enrichedJobs = await Promise.all(
    keywordMatches.map((job) => limit(() => enrichPosition(job, context.signal))),
  );

  return {
    sourceType: "custom",
    jobs: enrichedJobs,
  };
};

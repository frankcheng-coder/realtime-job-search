import crypto from "node:crypto";
import type { JobResult, MetroPreset, RawJobPosting, RemoteType, SourceType } from "@/lib/types";
import { normalizePostedDate } from "@/lib/parseDate";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function canonicalizeUrl(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    const passthroughParams = ["gh_jid", "jobId", "job", "reqid", "requisitionid"];
    const entries = Array.from(parsed.searchParams.entries()).filter(([key]) =>
      passthroughParams.includes(key.toLowerCase()),
    );
    parsed.search = "";
    for (const [key, paramValue] of entries) {
      parsed.searchParams.set(key, paramValue);
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

export function isBlockedJobUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "community.workday.com" && parsed.pathname.includes("invalid-url");
  } catch {
    return false;
  }
}

export function inferRemoteType(
  locationRaw?: string | null,
  title?: string | null,
  description?: string | null,
): RemoteType {
  const haystack = `${locationRaw ?? ""} ${title ?? ""} ${description ?? ""}`.toLowerCase();
  if (haystack.includes("hybrid")) {
    return "hybrid";
  }
  if (haystack.includes("remote")) {
    return "remote";
  }
  if (haystack.includes("on-site") || haystack.includes("onsite") || haystack.includes("on site")) {
    return "onsite";
  }
  return "unknown";
}

export function metroMatches(locationRaw: string | null | undefined, metroPreset: MetroPreset) {
  if (!locationRaw) {
    return false;
  }

  const normalized = locationRaw.toLowerCase();
  const cityMatch = metroPreset.cities.some((city) => normalized.includes(city.toLowerCase()));
  const stateMatch = metroPreset.states.some((state) =>
    normalized.match(new RegExp(`\\b${state.toLowerCase()}\\b`, "i")),
  );
  const keywordMatch = metroPreset.locationKeywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );

  return keywordMatch || (cityMatch && stateMatch) || cityMatch;
}

export function trimSnippet(value?: string | null, limit = 200) {
  if (!value) {
    return null;
  }
  const clean = normalizeWhitespace(value);
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

export function buildJobResult(params: {
  company: string;
  companyCareerUrl: string;
  sourceType: SourceType;
  metroPreset: MetroPreset;
  rawJob: RawJobPosting;
}): JobResult {
  const { company, companyCareerUrl, sourceType, metroPreset, rawJob } = params;
  const title = normalizeWhitespace(rawJob.title);
  const url = canonicalizeUrl(rawJob.url);
  const locationRaw = rawJob.locationRaw ? normalizeWhitespace(rawJob.locationRaw) : null;
  const descriptionSnippet = trimSnippet(rawJob.descriptionSnippet);
  const remoteType =
    rawJob.remoteType && rawJob.remoteType !== "unknown"
      ? rawJob.remoteType
      : inferRemoteType(locationRaw, title, descriptionSnippet);

  const normalizedDate =
    rawJob.postedAt || rawJob.postedRaw
      ? normalizePostedDate(rawJob.postedAt ?? rawJob.postedRaw)
      : { postedAt: null, postedAgeDays: null, postedRaw: null };

  const id = crypto
    .createHash("sha256")
    .update([company, title, url].join("::"))
    .digest("hex")
    .slice(0, 24);

  return {
    id,
    company,
    title,
    url,
    locationRaw,
    metroMatch: metroMatches(locationRaw, metroPreset) || remoteType === "remote",
    remoteType,
    postedRaw: normalizedDate.postedRaw,
    postedAt: normalizedDate.postedAt,
    postedAgeDays: normalizedDate.postedAgeDays,
    descriptionSnippet,
    requisitionId: rawJob.requisitionId?.trim() || null,
    sourceType,
    companyCareerUrl,
  };
}

export function normalizeForFallbackKey(value: string | null | undefined) {
  return normalizeWhitespace(value ?? "").toLowerCase();
}

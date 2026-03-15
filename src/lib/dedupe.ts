import type { JobResult } from "@/lib/types";
import { canonicalizeUrl, normalizeForFallbackKey } from "@/lib/normalize";

export function dedupeJobs(jobs: JobResult[]) {
  const seen = new Set<string>();
  const deduped: JobResult[] = [];

  for (const job of jobs) {
    const keys = [
      canonicalizeUrl(job.url),
      job.requisitionId ? `${job.company}::${job.requisitionId}` : null,
      `${job.company}::${normalizeForFallbackKey(job.title)}::${normalizeForFallbackKey(job.locationRaw)}`,
    ].filter(Boolean) as string[];

    const match = keys.find((key) => seen.has(key));
    if (match) {
      continue;
    }

    keys.forEach((key) => seen.add(key));
    deduped.push(job);
  }

  return deduped;
}

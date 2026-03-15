import type { JobResult } from "@/lib/types";

function formatPosted(job: JobResult) {
  if (job.postedAgeDays === null) {
    return "Undated";
  }
  if (job.postedAgeDays === 0) {
    return job.postedRaw ?? "Posted today";
  }
  if (job.postedAgeDays === 1) {
    return "1 day ago";
  }
  return `${job.postedAgeDays} days ago`;
}

function badgeTone(type: JobResult["remoteType"] | JobResult["sourceType"]) {
  switch (type) {
    case "remote":
      return "bg-spruce/10 text-spruce border-spruce/20";
    case "hybrid":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "onsite":
      return "bg-slate-200 text-slate-700 border-slate-300";
    default:
      return "bg-ink/5 text-tide border-ink/10";
  }
}

export function ResultCard({ job }: { job: JobResult }) {
  return (
    <article className="panel rounded-[1.5rem] p-5 transition hover:-translate-y-0.5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tide">
              {job.company}
            </p>
            <h3 className="text-xl font-semibold text-ink">
              <a href={job.url} target="_blank" rel="noreferrer" className="hover:text-spruce">
                {job.title}
              </a>
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-sm text-ink">
              {job.locationRaw ?? "Location unavailable"}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${badgeTone(job.remoteType)}`}
            >
              {job.remoteType}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${badgeTone(job.sourceType)}`}
            >
              {job.sourceType}
            </span>
            {job.requisitionId ? (
              <span className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-sm text-ink">
                Req {job.requisitionId}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-sm text-tide">
            {formatPosted(job)}
          </span>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-spruce"
          >
            View posting
          </a>
        </div>
      </div>

      {job.descriptionSnippet ? (
        <p className="mt-4 text-sm leading-6 text-tide">{job.descriptionSnippet}</p>
      ) : null}
    </article>
  );
}

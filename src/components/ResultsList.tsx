import type { SearchResponse } from "@/lib/types";
import { ResultCard } from "@/components/ResultCard";

type ResultsListProps = {
  response: SearchResponse | null;
  error: string | null;
};

export function ResultsList({ response, error }: ResultsListProps) {
  if (error) {
    return (
      <section className="panel rounded-[1.75rem] border border-ember/20 p-5">
        <p className="text-lg font-semibold text-ember">Search failed</p>
        <p className="mt-2 text-sm text-tide">{error}</p>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="panel rounded-[1.75rem] p-5">
        <p className="text-lg font-semibold text-ink">Ready to search</p>
        <p className="mt-2 text-sm text-tide">
          Results will appear here after a live search across your selected companies.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="panel rounded-[1.75rem] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tide">
              Search summary
            </p>
            <p className="text-2xl font-semibold text-ink">
              {response.meta.totalAfterFilters} jobs after filters
            </p>
            <p className="text-sm text-tide">
              {response.meta.totalResults} normalized jobs gathered in{" "}
              {(response.meta.durationMs / 1000).toFixed(1)}s
              {response.meta.cacheHit ? " from cache" : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-sm text-tide">
            {response.meta.completedCompanies.length} completed
            {" · "}
            {response.meta.failedCompanies.length} failed
          </div>
        </div>

        {response.meta.failedCompanies.length ? (
          <details className="mt-4 rounded-2xl border border-ember/20 bg-ember/5 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ember">
              Expand failure list
            </summary>
            <div className="mt-3 space-y-2">
              {response.meta.failedCompanies.map((failure) => (
                <div
                  key={failure.company}
                  className="rounded-xl border border-ember/10 bg-white/70 px-3 py-2 text-sm text-tide"
                >
                  <span className="font-semibold text-ink">{failure.company}</span>: {failure.reason}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <div className="grid gap-4">
        {response.results.length ? (
          response.results.map((job) => <ResultCard key={job.id} job={job} />)
        ) : (
          <section className="panel rounded-[1.75rem] p-5">
            <p className="text-lg font-semibold text-ink">No matching jobs found</p>
            <p className="mt-2 text-sm text-tide">
              Try widening your keywords, posted window, or company selection.
            </p>
          </section>
        )}
      </div>
    </section>
  );
}

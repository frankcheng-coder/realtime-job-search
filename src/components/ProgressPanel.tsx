"use client";

type ProgressPanelProps = {
  loading: boolean;
  selectedCompanyCount: number;
  completedEstimate: number;
  completedCompanies?: string[];
  failedCompanies?: Array<{ company: string; reason: string }>;
};

export function ProgressPanel({
  loading,
  selectedCompanyCount,
  completedEstimate,
  completedCompanies = [],
  failedCompanies = [],
}: ProgressPanelProps) {
  const completedCount = loading ? completedEstimate : completedCompanies.length;
  const safeTotal = Math.max(selectedCompanyCount, 1);
  const width = `${Math.min(100, Math.round((completedCount / safeTotal) * 100))}%`;

  return (
    <section className="panel rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">Progress</p>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-ink">
              {loading
                ? `Searching ${selectedCompanyCount} companies...`
                : `${completedCompanies.length} companies completed`}
            </p>
            <p className="text-sm text-tide">
              {loading
                ? `Completed ${completedEstimate}/${selectedCompanyCount}...`
                : `${failedCompanies.length} companies failed`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {failedCompanies.slice(0, 4).map((failure) => (
            <span
              key={failure.company}
              className="rounded-full border border-ember/20 bg-ember/10 px-3 py-1 text-xs font-semibold text-ember"
            >
              {failure.company} failed
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-spruce to-ember transition-all duration-500 ${
            loading ? "animate-pulse" : ""
          }`}
          style={{ width }}
        />
      </div>
    </section>
  );
}

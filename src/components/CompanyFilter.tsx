"use client";

type CompanyFilterProps = {
  companies: string[];
  selectedCompanies: string[];
  onToggle: (company: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
};

export function CompanyFilter({
  companies,
  selectedCompanies,
  onToggle,
  onSelectAll,
  onClearAll,
  disabled,
}: CompanyFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Companies</p>
          <p className="text-sm text-tide">
            {selectedCompanies.length} of {companies.length} selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => {
          const selected = selectedCompanies.includes(company);
          return (
            <label
              key={company}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                selected
                  ? "border-spruce/30 bg-spruce/10"
                  : "border-ink/10 bg-white/60 hover:border-ink/20"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(company)}
                disabled={disabled}
                className="h-4 w-4 rounded border-ink/30 text-spruce focus:ring-spruce/20"
              />
              <span className="text-sm font-medium text-ink">{company}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel =
    selectedCompanies.length === companies.length
      ? "All companies selected"
      : selectedCompanies.length === 0
        ? "No companies selected"
        : `${selectedCompanies.length} selected`;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className="relative space-y-3">
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
            onClick={() => {
              onSelectAll();
              setOpen(false);
            }}
            disabled={disabled}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => {
              onClearAll();
              setOpen(false);
            }}
            disabled={disabled}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-left text-sm transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="space-y-1">
          <p className="font-medium text-ink">{selectedLabel}</p>
          <p className="truncate text-xs text-tide">
            {selectedCompanies.length === companies.length
              ? "Every company is currently included"
              : selectedCompanies.length === 0
                ? "Choose one or more companies"
                : selectedCompanies.join(", ")}
          </p>
        </div>
        <span className="ml-3 text-base text-tide">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 rounded-[1.5rem] border border-ink/10 bg-[var(--surface-strong)] p-3 shadow-[0_20px_50px_rgba(18,44,52,0.16)] backdrop-blur">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
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
      ) : null}
    </div>
  );
}

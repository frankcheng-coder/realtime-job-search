"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CompanyFilter } from "@/components/CompanyFilter";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ResultsList } from "@/components/ResultsList";
import { TARGET_COMPANIES } from "@/lib/companyConfig";
import { DEFAULT_METRO_KEY, METRO_PRESETS } from "@/lib/metroPresets";
import type { SearchRequest, SearchResponse } from "@/lib/types";

const ALL_COMPANIES = TARGET_COMPANIES.map((company) => company.company).sort((left, right) =>
  left.localeCompare(right),
);

export function SearchForm() {
  const [keywords, setKeywords] = useState("");
  const [metro, setMetro] = useState(DEFAULT_METRO_KEY);
  const [postedWindowDays, setPostedWindowDays] = useState<1 | 3 | 7 | 15>(3);
  const [remoteType, setRemoteType] = useState<"remote" | "hybrid" | "onsite" | "any">("any");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(ALL_COMPANIES);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedEstimate, setCompletedEstimate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setCompletedEstimate(0);
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = Date.now();
    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      const estimate = Math.min(
        Math.max(selectedCompanies.length - 1, 0),
        Math.floor((elapsedSeconds / 25) * selectedCompanies.length),
      );
      setCompletedEstimate(estimate);
    }, 400);

    return () => window.clearInterval(interval);
  }, [isLoading, selectedCompanies.length]);

  const toggleCompany = (company: string) => {
    setSelectedCompanies((current) =>
      current.includes(company)
        ? current.filter((value) => value !== company)
        : [...current, company].sort((left, right) => left.localeCompare(right)),
    );
  };

  const submitSearch = async (payload: SearchRequest) => {
    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!searchResponse.ok) {
      const failure = (await searchResponse.json()) as { error?: string };
      throw new Error(failure.error ?? "Search failed");
    }

    return (await searchResponse.json()) as SearchResponse;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResponse(null);
    setCompletedEstimate(0);
    setIsLoading(true);

    const payload: SearchRequest = {
      keywords: keywords.trim() || undefined,
      metro,
      postedWindowDays,
      companies: selectedCompanies,
      remoteType,
    };

    void submitSearch(payload)
      .then((nextResponse) => {
        setCompletedEstimate(nextResponse.meta.completedCompanies.length);
        setResponse(nextResponse);
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : "Search failed");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form onSubmit={onSubmit} className="panel space-y-6 rounded-[1.75rem] p-5 sm:p-6">
        <div className="space-y-2">
          <label htmlFor="keywords" className="text-sm font-semibold text-ink">
            Keyword
          </label>
          <input
            id="keywords"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="software engineer, product manager, data analyst..."
            className="w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-ink outline-none ring-0 transition placeholder:text-tide focus:border-ember/30 focus:shadow-[0_0_0_4px_var(--ring)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="metro" className="text-sm font-semibold text-ink">
              Metro
            </label>
            <select
              id="metro"
              value={metro}
              onChange={(event) => setMetro(event.target.value)}
              className="w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-ink outline-none transition focus:border-ember/30 focus:shadow-[0_0_0_4px_var(--ring)]"
            >
              {Object.entries(METRO_PRESETS).map(([value, preset]) => (
                <option key={value} value={value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-ink">Work type</span>
            <div className="grid grid-cols-2 gap-2">
              {(["any", "remote", "hybrid", "onsite"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRemoteType(option)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-medium capitalize transition ${
                    remoteType === option
                      ? "border-spruce/30 bg-spruce/10 text-spruce"
                      : "border-ink/10 bg-white/70 text-ink hover:border-ink/20"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Posted in past</span>
          <div className="flex flex-wrap gap-2">
            {([1, 3, 7, 15] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPostedWindowDays(value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  postedWindowDays === value
                    ? "border-ember/30 bg-ember/10 text-ember"
                    : "border-ink/10 bg-white/70 text-ink hover:border-ink/20"
                }`}
              >
                {value} day{value > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>

        <CompanyFilter
          companies={ALL_COMPANIES}
          selectedCompanies={selectedCompanies}
          onToggle={toggleCompany}
          onSelectAll={() => setSelectedCompanies(ALL_COMPANIES)}
          onClearAll={() => setSelectedCompanies([])}
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading || selectedCompanies.length === 0}
          className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-spruce disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {isLoading ? "Searching..." : "Search jobs"}
        </button>
      </form>

      <div className="space-y-6">
        <ProgressPanel
          loading={isLoading}
          selectedCompanyCount={selectedCompanies.length}
          completedEstimate={completedEstimate}
          completedCompanies={response?.meta.completedCompanies}
          failedCompanies={response?.meta.failedCompanies}
        />
        <ResultsList response={response} error={error} />
      </div>
    </div>
  );
}

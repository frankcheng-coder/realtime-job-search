import pLimit from "p-limit";
import { greenhouseAdapter } from "@/lib/adapters/greenhouse";
import { workdayAdapter } from "@/lib/adapters/workday";
import { oracleHcmAdapter } from "@/lib/adapters/oracleHcm";
import { icimsAdapter } from "@/lib/adapters/icims";
import { brassringAdapter } from "@/lib/adapters/brassring";
import { taleoAdapter } from "@/lib/adapters/taleo";
import { amazonAdapter } from "@/lib/adapters/custom/amazon";
import { microsoftAdapter } from "@/lib/adapters/custom/microsoft";
import { accentureAdapter } from "@/lib/adapters/custom/accenture";
import { eyAdapter } from "@/lib/adapters/custom/ey";
import { deloitteAdapter } from "@/lib/adapters/custom/deloitte";
import { cventAdapter } from "@/lib/adapters/custom/cvent";
import { mitreAdapter } from "@/lib/adapters/custom/mitre";
import { saicAdapter } from "@/lib/adapters/custom/saic";
import { caciAdapter } from "@/lib/adapters/custom/caci";
import { hiltonAdapter } from "@/lib/adapters/custom/hilton";

import { noblisAdapter } from "@/lib/adapters/custom/noblis";
import { baeAdapter } from "@/lib/adapters/custom/bae";
import { finraAdapter } from "@/lib/adapters/custom/finra";
import { penfedAdapter } from "@/lib/adapters/custom/penfed";
import { tRowePriceAdapter } from "@/lib/adapters/custom/trowe";
import { spGlobalAdapter } from "@/lib/adapters/custom/spglobal";
import { worldBankAdapter } from "@/lib/adapters/custom/worldBank";
import { imfAdapter } from "@/lib/adapters/custom/imf";
import { microStrategyAdapter } from "@/lib/adapters/custom/microstrategy";
import { kpmgAdapter } from "@/lib/adapters/custom/kpmg";
import { astraZenecaAdapter } from "@/lib/adapters/custom/astrazeneca";
import { capitalOneAdapter } from "@/lib/adapters/custom/capitalOne";
import { wellsFargoAdapter } from "@/lib/adapters/custom/wellsFargo";
import { bloombergAdapter } from "@/lib/adapters/custom/bloomberg";
import { createBrowserManager } from "@/lib/browser";
import { TARGET_COMPANIES, TARGET_COMPANY_MAP } from "@/lib/companyConfig";
import { dedupeJobs } from "@/lib/dedupe";
import { getMetroPreset } from "@/lib/metroPresets";
import { buildJobResult, isBlockedJobUrl } from "@/lib/normalize";
import type {
  Adapter,
  BrowserManager,
  CompanyConfig,
  JobResult,
  SearchRequest,
  SearchResponse,
  SourceType,
} from "@/lib/types";
import { searchResponseSchema } from "@/lib/types";

const CONCURRENCY = 5;
const COMPANY_TIMEOUT_MS = 8_000;
const OVERALL_TIMEOUT_MS = 25_000;

const familyAdapters: Record<Exclude<SourceType, "custom">, Adapter> = {
  greenhouse: greenhouseAdapter,
  workday: workdayAdapter,
  oracle_hcm: oracleHcmAdapter,
  icims: icimsAdapter,
  brassring: brassringAdapter,
  taleo: taleoAdapter,
};

const customAdapters: Record<string, Adapter> = {
  Amazon: amazonAdapter,
  Microsoft: microsoftAdapter,
  Accenture: accentureAdapter,
  EY: eyAdapter,
  Deloitte: deloitteAdapter,
  Cvent: cventAdapter,
  MITRE: mitreAdapter,
  SAIC: saicAdapter,
  CACI: caciAdapter,
  Hilton: hiltonAdapter,

  Noblis: noblisAdapter,
  "BAE Systems": baeAdapter,
  FINRA: finraAdapter,
  "PenFed Credit Union": penfedAdapter,
  "T. Rowe Price": tRowePriceAdapter,
  "S&P Global": spGlobalAdapter,
  "World Bank Group": worldBankAdapter,
  "International Monetary Fund (IMF)": imfAdapter,
  MicroStrategy: microStrategyAdapter,
  KPMG: kpmgAdapter,
  AstraZeneca: astraZenecaAdapter,
  "Capital One": capitalOneAdapter,
  "Wells Fargo": wellsFargoAdapter,
  Bloomberg: bloombergAdapter,
};

function resolveAdapter(company: CompanyConfig, sourceType: SourceType) {
  if (sourceType === "custom") {
    const adapter = customAdapters[company.company];
    if (!adapter) {
      throw new Error(`No custom adapter configured for ${company.company}`);
    }
    return adapter;
  }

  return familyAdapters[sourceType];
}

function getSelectedCompanies(input: SearchRequest) {
  if (!input.companies?.length) {
    return TARGET_COMPANIES;
  }
  const seen = new Set<string>();
  return input.companies
    .map((name) => TARGET_COMPANY_MAP.get(name))
    .filter((company): company is CompanyConfig => Boolean(company))
    .filter((company) => {
      if (seen.has(company.company)) {
        return false;
      }
      seen.add(company.company);
      return true;
    });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function applyFilters(results: JobResult[], input: SearchRequest) {
  return results.filter((result) => {
    if (result.postedAgeDays !== null && result.postedAgeDays > input.postedWindowDays) {
      return false;
    }

    if (input.remoteType && input.remoteType !== "any" && result.remoteType !== input.remoteType) {
      return false;
    }

    return result.metroMatch;
  });
}

function sortResults(results: JobResult[]) {
  return [...results].sort((left, right) => {
    const leftTime = left.postedAt ? Date.parse(left.postedAt) : 0;
    const rightTime = right.postedAt ? Date.parse(right.postedAt) : 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    const companyComparison = left.company.localeCompare(right.company);
    if (companyComparison !== 0) {
      return companyComparison;
    }
    return left.title.localeCompare(right.title);
  });
}

function normalizeJobs(
  company: CompanyConfig,
  sourceType: SourceType,
  companyCareerUrl: string,
  metroPreset: ReturnType<typeof getMetroPreset>,
  jobs: Parameters<typeof buildJobResult>[0]["rawJob"][],
) {
  return jobs
    .filter((job) => job.url && !isBlockedJobUrl(job.url))
    .map((job) =>
      buildJobResult({
        company: company.company,
        companyCareerUrl,
        sourceType,
        metroPreset,
        rawJob: job,
      }),
    );
}

async function runCompanySearch(
  company: CompanyConfig,
  input: SearchRequest,
  browser: BrowserManager,
  deadline: number,
) {
  const metroPreset = getMetroPreset(input.metro);
  const query = {
    keywords: input.keywords,
    metroPreset,
    metroKey: input.metro ?? "dc_metro",
    postedWindowDays: input.postedWindowDays,
    remoteType: input.remoteType ?? "any",
  } as const;

  const tryAdapter = async (sourceType: SourceType, careerUrlOverride?: string) => {
    const effectiveCompany = careerUrlOverride ? { ...company, careerUrl: careerUrlOverride } : company;
    const adapter = resolveAdapter(effectiveCompany, sourceType);
    const remainingMs = Math.max(0, Math.min(COMPANY_TIMEOUT_MS, deadline - Date.now()));
    if (remainingMs <= 0) {
      throw new Error(`${company.company} skipped after overall timeout budget was exhausted`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);
    try {
      return await withTimeout(
        adapter({
          company: effectiveCompany,
          query,
          signal: controller.signal,
          browser,
        }),
        remainingMs,
        company.company,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const primary = await tryAdapter(company.sourceType);
    const normalizedPrimary = normalizeJobs(
      company,
      primary.sourceType,
      company.careerUrl,
      metroPreset,
      primary.jobs,
    );
    if (normalizedPrimary.length > 0 || !company.fallbackSourceType) {
      return {
        company: company.company,
        jobs: normalizedPrimary,
        completed: true,
      };
    }
  } catch (error) {
    if (!company.fallbackSourceType) {
      throw error;
    }
  }

  if (company.fallbackSourceType && company.fallbackCareerUrl) {
    const fallback = await tryAdapter(company.fallbackSourceType, company.fallbackCareerUrl);
    return {
      company: company.company,
      jobs: normalizeJobs(
        company,
        fallback.sourceType,
        company.fallbackCareerUrl ?? company.careerUrl,
        metroPreset,
        fallback.jobs,
      ),
      completed: true,
    };
  }

  return {
    company: company.company,
    jobs: [] as JobResult[],
    completed: true,
  };
}

export async function executeSearch(input: SearchRequest): Promise<SearchResponse> {
  const startedAt = Date.now();
  const deadline = startedAt + OVERALL_TIMEOUT_MS;
  const companies = getSelectedCompanies(input);
  const limit = pLimit(CONCURRENCY);
  const browser = createBrowserManager();

  try {
    const settled = await Promise.allSettled(
      companies.map((company) =>
        limit(async () => {
          const result = await runCompanySearch(company, input, browser, deadline);
          return result;
        }),
      ),
    );

    const completedCompanies: string[] = [];
    const failedCompanies: Array<{ company: string; reason: string }> = [];
    const allResults: JobResult[] = [];

    settled.forEach((result, index) => {
      const company = companies[index];
      if (result.status === "fulfilled") {
        completedCompanies.push(company.company);
        allResults.push(...result.value.jobs);
      } else {
        failedCompanies.push({
          company: company.company,
          reason: result.reason instanceof Error ? result.reason.message : "Unknown error",
        });
      }
    });

    const filtered = sortResults(dedupeJobs(applyFilters(allResults, input)));
    const response = {
      results: filtered,
      meta: {
        searchedCompanies: companies.map((company) => company.company),
        completedCompanies,
        failedCompanies,
        totalResults: allResults.length,
        totalAfterFilters: filtered.length,
        durationMs: Date.now() - startedAt,
        cacheHit: false,
      },
    } satisfies SearchResponse;

    return searchResponseSchema.parse(response);
  } finally {
    await browser.close();
  }
}

import { z } from "zod";

export const remoteTypeSchema = z.enum(["remote", "hybrid", "onsite", "unknown"]);
export const sourceTypeSchema = z.enum([
  "greenhouse",
  "workday",
  "oracle_hcm",
  "icims",
  "brassring",
  "taleo",
  "custom",
]);
export const metroSchema = z.string().default("dc_metro");

export const searchRequestSchema = z.object({
  keywords: z.string().trim().optional(),
  metro: metroSchema.optional(),
  postedWindowDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(15)]),
  companies: z.array(z.string().trim().min(1)).optional(),
  remoteType: z.enum(["remote", "hybrid", "onsite", "any"]).optional(),
});

export type RemoteType = z.infer<typeof remoteTypeSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export type JobResult = {
  id: string;
  company: string;
  title: string;
  url: string;
  locationRaw: string | null;
  metroMatch: boolean;
  remoteType: RemoteType;
  postedRaw: string | null;
  postedAt: string | null;
  postedAgeDays: number | null;
  descriptionSnippet: string | null;
  requisitionId: string | null;
  sourceType: SourceType;
  companyCareerUrl: string;
};

export const jobResultSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  url: z.string().url(),
  locationRaw: z.string().nullable(),
  metroMatch: z.boolean(),
  remoteType: remoteTypeSchema,
  postedRaw: z.string().nullable(),
  postedAt: z.string().datetime({ offset: true }).nullable(),
  postedAgeDays: z.number().nullable(),
  descriptionSnippet: z.string().nullable(),
  requisitionId: z.string().nullable(),
  sourceType: sourceTypeSchema,
  companyCareerUrl: z.string().url(),
});

export const searchResponseSchema = z.object({
  results: z.array(jobResultSchema),
  meta: z.object({
    searchedCompanies: z.array(z.string()),
    completedCompanies: z.array(z.string()),
    failedCompanies: z.array(
      z.object({
        company: z.string(),
        reason: z.string(),
      }),
    ),
    totalResults: z.number(),
    totalAfterFilters: z.number(),
    durationMs: z.number(),
    cacheHit: z.boolean(),
  }),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export type MetroPreset = {
  label: string;
  states: string[];
  cities: string[];
  locationKeywords: string[];
};

export type CompanyConfig = {
  company: string;
  aliases?: string[];
  sourceType: SourceType;
  careerUrl: string;
  fallbackSourceType?: Exclude<SourceType, "custom"> | "custom";
  fallbackCareerUrl?: string;
};

export type ScrapeQuery = {
  keywords?: string;
  metroPreset: MetroPreset;
  metroKey: string;
  postedWindowDays: 1 | 3 | 7 | 15;
  remoteType?: "remote" | "hybrid" | "onsite" | "any";
};

export type RawJobPosting = {
  title: string;
  url: string;
  locationRaw?: string | null;
  postedRaw?: string | null;
  descriptionSnippet?: string | null;
  requisitionId?: string | null;
  remoteType?: RemoteType;
  postedAt?: string | null;
};

export type AdapterContext = {
  company: CompanyConfig;
  query: ScrapeQuery;
  signal: AbortSignal;
  browser: BrowserManager;
};

export type AdapterRunResult = {
  jobs: RawJobPosting[];
  sourceType: SourceType;
};

export type Adapter = (context: AdapterContext) => Promise<AdapterRunResult>;

export type BrowserManager = {
  withPage<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

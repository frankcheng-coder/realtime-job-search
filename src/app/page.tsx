import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/60 px-6 py-8 shadow-panel backdrop-blur xl:px-10 xl:py-10">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-ember/15 via-transparent to-spruce/10" />
        <div className="relative space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-tide">
            Realtime Job Search
          </p>
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Search fresh openings from official career sites in one pass.
            </h1>
            <p className="max-w-2xl text-balance text-base text-tide sm:text-lg">
              Live search across your target companies, normalized into one feed with
              metro-aware filtering, recent-posted windows, and graceful partial failures.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <SearchForm />
      </div>
    </main>
  );
}

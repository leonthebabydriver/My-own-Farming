"use client";

import { useState } from "react";

type BusEtaResult = {
  route?: string;
  stop?: string;
  etaMinutes: number | null;
  etaSeconds: number | null;
  status?: number;
  updatedAt?: string;
};

type BusEtaResponse =
  | {
      ok: true;
      city: string;
      stopNameQuery: string;
      count: number;
      withEta: number;
      results: BusEtaResult[];
    }
  | { ok: false; error: string };

export default function Home() {
  const [stopName, setStopName] = useState("陽明山");
  const [city, setCity] = useState("Taipei");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BusEtaResponse | null>(null);

  async function runTest() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(
        `/api/tdx/bus-eta?city=${encodeURIComponent(
          city
        )}&stopName=${encodeURIComponent(stopName)}`
      );
      const json = (await res.json()) as BusEtaResponse;
      setData(json);
    } catch (err) {
      setData({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex w-full max-w-2xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Dev tool — find a farm&apos;s nearest bus stop
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Not for visitors. Use this when onboarding a new farm: search a
            nearby place name (Chinese characters) to find its real,
            live-tracked TDX stop, then add it to src/data/farms.ts.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              City
            </label>
            <input
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Taipei"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Stop name contains
            </label>
            <input
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              value={stopName}
              onChange={(e) => setStopName(e.target.value)}
              placeholder="陽明山"
            />
          </div>
          <button
            onClick={runTest}
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Fetching…" : "Test live TDX call"}
          </button>
        </div>

        {data && data.ok && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Found {data.count} result(s) for stops containing &quot;
              {data.stopNameQuery}&quot; in {data.city} — {data.withEta} with a
              live ETA right now.
            </p>
            {data.count === 0 && (
              <p className="text-sm text-zinc-500">
                No stops matched. Try a different stop name (e.g. a bus stop
                you know exists, like 台北車站 or 士林).
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {data.results.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <strong>{r.route}</strong> — {r.stop}
                  </span>
                  <span className="font-mono">
                    {r.etaMinutes !== null
                      ? `${r.etaMinutes} min`
                      : "no ETA data"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && !data.ok && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">Request failed:</p>
            <p className="mt-1 font-mono text-xs whitespace-pre-wrap">
              {data.error}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

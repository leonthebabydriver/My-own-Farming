/**
 * CWA (Central Weather Administration, Taiwan) Open Data API helper.
 *
 * This file runs SERVER-SIDE ONLY. CWA_API_KEY must never reach the browser.
 *
 * Unlike TDX, CWA auth is a single static key passed as a query param on
 * every request — no OAuth token exchange needed.
 *
 * IMPORTANT: the exact inner JSON shape of CWA's responses (the keys inside
 * each `ElementValue` object) is not fully nailed down here — CWA's schema
 * varies slightly by dataset and isn't consistently documented. Rather than
 * guess a specific key name and risk silently dropping real data (the same
 * class of bug we hit with the TDX $orderby issue), the helpers below keep
 * each ElementValue object INTACT and pass it through as-is. That means the
 * API response from our own routes will show you the real key names the
 * first time you call them for real — check that output and we'll tighten
 * the types/UI to match once confirmed.
 */

const CWA_API_BASE = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";

// Same reasoning as TDX_CACHE_TTL_MS in src/lib/tdx.ts: avoid burning
// through CWA's rate limit on repeated page loads/refreshes. Weather also
// changes slowly enough that a short cache costs nothing in freshness.
const CWA_CACHE_TTL_MS = 20_000;
const cwaResponseCache = new Map<string, { data: unknown; expiresAt: number }>();

export async function cwaGet<T>(
  datasetId: string,
  query: Record<string, string> = {}
): Promise<T> {
  const apiKey = process.env.CWA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing CWA_API_KEY environment variable. " +
        "Add it to .env.local (get one from opendata.cwa.gov.tw)."
    );
  }

  const url = new URL(`${CWA_API_BASE}/${datasetId}`);
  url.searchParams.set("Authorization", apiKey);
  url.searchParams.set("format", "JSON");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const cacheKey = url.toString();

  const cached = cwaResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(cacheKey, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429 && cached) {
      return cached.data as T;
    }
    throw new Error(
      `CWA API request failed (${datasetId}): ${res.status} ${res.statusText} ${text}`.trim()
    );
  }

  const data = (await res.json()) as T;
  cwaResponseCache.set(cacheKey, { data, expiresAt: Date.now() + CWA_CACHE_TTL_MS });
  return data;
}

// ---------------------------------------------------------------------------
// Township 3-day forecast (F-D0047-xxx — dataset ID depends on county)
// ---------------------------------------------------------------------------

export type CwaTimeEntry = {
  DataTime?: string;
  StartTime?: string;
  EndTime?: string;
  // Left as `unknown` on purpose — see file header. Each entry is normally
  // a single-key object like { "Weather": "多雲" } or { "MaxTemperature": "28" },
  // but we don't assume the key name here.
  ElementValue?: Record<string, unknown>[];
};

export type CwaWeatherElement = {
  ElementName: string;
  Time?: CwaTimeEntry[];
};

export type CwaLocation = {
  LocationName: string;
  WeatherElement?: CwaWeatherElement[];
};

type TownshipForecastResponse = {
  success?: string;
  records?: {
    Locations?: {
      LocationsName?: string;
      Location?: CwaLocation[];
    }[];
  };
};

/**
 * Fetches the 3-day township forecast for one county's dataset, filtered to
 * a specific township (locationName), e.g. datasetId="F-D0047-061"
 * (Taipei City), locationName="北投區".
 */
export async function getTownshipForecast(
  datasetId: string,
  locationName: string
): Promise<CwaLocation | null> {
  const data = await cwaGet<TownshipForecastResponse>(datasetId, {
    LocationName: locationName,
  });

  const locations = data.records?.Locations?.[0]?.Location ?? [];
  return locations.find((l) => l.LocationName === locationName) ?? locations[0] ?? null;
}

// ---------------------------------------------------------------------------
// Weather warnings / special bulletins (W-C0033-001)
// ---------------------------------------------------------------------------

type WarningsResponse = {
  success?: string;
  records?: {
    // CWA's own key naming for this dataset is inconsistent across docs
    // (seen as both "location" and "record" in different examples) — read
    // whichever is present.
    location?: unknown[];
    record?: unknown[];
    [key: string]: unknown;
  };
};

/**
 * Fetches the full weather warnings dataset (small — one entry per
 * county/area) and returns the raw records for client-side filtering by
 * county name, since we're not fully certain of the exact filter param
 * name for this dataset.
 */
export async function getWarningsRaw(): Promise<unknown> {
  const data = await cwaGet<WarningsResponse>("W-C0033-001");
  return data.records?.location ?? data.records?.record ?? data.records ?? null;
}

// ---------------------------------------------------------------------------
// Human-readable summary
// ---------------------------------------------------------------------------

export type WeatherSummaryEntry = {
  // The Chinese element name as CWA gives it, e.g. "溫度", "天氣現象".
  elementNameZh: string;
  // Whichever key CWA put inside ElementValue, e.g. "Temperature".
  valueKey: string;
  value: unknown;
  // The time window this value applies to.
  startTime?: string;
  endTime?: string;
  dataTime?: string;
};

/**
 * Confirmed live on 2026-09-20 (Taipei City / F-D0047-061): each
 * WeatherElement's Time[] entries are a hourly-ish series, and each
 * ElementValue[0] is a single-key object whose key is the English name of
 * the element (e.g. ElementName "溫度" -> ElementValue [{ "Temperature": "30" }]).
 *
 * This picks, for every element, whichever Time entry is closest to "now"
 * without being in the past (falling back to the closest past one if
 * nothing upcoming exists), so callers get one coherent "right now / very
 * soon" snapshot instead of the full multi-day series.
 */
export function summarizeUpcoming(
  location: CwaLocation,
  now: Date = new Date()
): WeatherSummaryEntry[] {
  const nowMs = now.getTime();
  const summary: WeatherSummaryEntry[] = [];

  for (const el of location.WeatherElement ?? []) {
    const times = el.Time ?? [];
    if (times.length === 0) continue;

    let best: CwaTimeEntry | null = null;
    let bestDiff = Infinity;

    for (const t of times) {
      const anchor = t.StartTime ?? t.DataTime;
      if (!anchor) continue;
      const ms = new Date(anchor).getTime();
      if (Number.isNaN(ms)) continue;

      // Prefer the soonest entry that is now-or-future; among those, closest
      // wins. If nothing is upcoming, fall back to closest overall.
      const diff = ms - nowMs;
      const score = diff >= 0 ? diff : Math.abs(diff) + 1e12; // push past entries behind future ones
      if (score < bestDiff) {
        bestDiff = score;
        best = t;
      }
    }

    if (!best || !best.ElementValue || best.ElementValue.length === 0) continue;

    const valueObj = best.ElementValue[0];
    const [valueKey, value] = Object.entries(valueObj)[0] ?? ["value", null];

    summary.push({
      elementNameZh: el.ElementName,
      valueKey,
      value,
      startTime: best.StartTime,
      endTime: best.EndTime,
      dataTime: best.DataTime,
    });
  }

  return summary;
}

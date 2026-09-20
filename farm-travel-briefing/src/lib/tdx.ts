/**
 * TDX (Transport Data eXchange, Taiwan) API helper.
 *
 * This file runs SERVER-SIDE ONLY (used from API routes / server components).
 * Never import this from a client component — TDX_CLIENT_SECRET must never
 * reach the browser.
 *
 * How TDX auth works:
 * 1. You exchange your client_id + client_secret for an access_token
 *    (OAuth2 client_credentials grant). The token is valid for ~24h.
 * 2. You attach that token as a Bearer token on every TDX data API call.
 *
 * We cache the token in memory (per server process) so we don't request a
 * new one on every single API call.
 */

const TDX_AUTH_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const TDX_API_BASE = "https://tdx.transportdata.tw/api/basic";

type CachedToken = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

// Module-level cache. Persists for the lifetime of the server process.
let cachedToken: CachedToken | null = null;

/**
 * Fetches a valid TDX access token, reusing a cached one if it hasn't
 * expired yet (with a 60s safety margin).
 */
export async function getTdxAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.TDX_CLIENT_ID;
  const clientSecret = process.env.TDX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing TDX_CLIENT_ID or TDX_CLIENT_SECRET environment variables. " +
        "Copy .env.local.example to .env.local and fill in your TDX credentials."
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TDX_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    // Auth calls should never be cached by Next.js's fetch cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `TDX auth failed: ${res.status} ${res.statusText} ${text}`.trim()
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number; // seconds
    token_type: string;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

// TDX's Basic-tier rate limit is easy to burn through: every page load that
// calls tdxGet hits the live API, and a handful of browser refreshes across
// a few farms adds up fast (we hit "429 Too Many Requests" during testing).
// A short in-memory cache means repeated requests for the SAME query within
// a small window reuse the last real response instead of making a new call.
// This is a per-server-process cache, not a visitor-facing "freshness"
// promise — 20s is short enough that live data still feels live, but long
// enough to absorb accidental refresh spam and multiple farms sharing a
// request in quick succession.
const TDX_CACHE_TTL_MS = 20_000;
const tdxResponseCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Low-level helper: calls any TDX Basic API GET endpoint with auth + JSON
 * format applied automatically. Responses are cached in-memory per exact
 * URL for TDX_CACHE_TTL_MS to avoid burning through TDX's rate limit.
 *
 * @param path - path under /api/basic, e.g. "/v2/Bus/EstimatedTimeOfArrival/City/Taipei"
 * @param query - extra query params (e.g. { $filter: "...", $top: "10" })
 */
export async function tdxGet<T>(
  path: string,
  query: Record<string, string> = {}
): Promise<T> {
  const url = new URL(TDX_API_BASE + path);
  url.searchParams.set("$format", "JSON");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const cacheKey = url.toString();

  const cached = tdxResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const token = await getTdxAccessToken();

  const res = await fetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // If TDX rate-limited us but we have a stale cached response, prefer
    // serving stale data over a hard error — it's still more useful to a
    // visitor than nothing.
    if (res.status === 429 && cached) {
      return cached.data as T;
    }
    throw new Error(
      `TDX API request failed (${path}): ${res.status} ${res.statusText} ${text}`.trim()
    );
  }

  const data = (await res.json()) as T;
  tdxResponseCache.set(cacheKey, { data, expiresAt: Date.now() + TDX_CACHE_TTL_MS });
  return data;
}

// ---------------------------------------------------------------------------
// Bus ETA — shared by the free-text test endpoint and the per-farm endpoint.
// ---------------------------------------------------------------------------

export type TdxEstimatedTimeOfArrival = {
  PlateNumb?: string;
  RouteUID: string;
  RouteID: string;
  RouteName: { Zh_tw: string; En?: string };
  Direction?: number;
  StopUID: string;
  StopID: string;
  StopName: { Zh_tw: string; En?: string };
  StopSequence?: number;
  EstimateTime?: number; // seconds until arrival; absent/null if unknown
  NextBusTime?: string;
  StopStatus?: number; // 0 normal, 1 no info, 2 not-in-service, ...
  SrcUpdateTime?: string;
  UpdateTime?: string;
};

export type BusEtaResult = {
  route?: string;
  stop?: string;
  etaSeconds: number | null;
  etaMinutes: number | null;
  status?: number;
  updatedAt?: string;
};

/**
 * Fetches live bus ETAs for every stop in `city` whose Chinese name
 * contains `stopName`, sorted soonest-first (stops/routes with no current
 * ETA data sort last, never hidden).
 *
 * Note: TDX's own $orderby on a nullable numeric field (EstimateTime) tends
 * to put nulls first, which would silently hide every row that actually has
 * a live ETA if combined with a small $top. So we fetch a larger batch
 * un-ordered and sort client-side instead.
 */
export async function getBusEtaByStopName(
  city: string,
  stopName: string
): Promise<{ results: BusEtaResult[]; withEta: number; total: number }> {
  const data = await tdxGet<TdxEstimatedTimeOfArrival[]>(
    `/v2/Bus/EstimatedTimeOfArrival/City/${encodeURIComponent(city)}`,
    {
      $filter: `contains(StopName/Zh_tw,'${stopName}')`,
      $top: "200",
    }
  );

  const simplified: BusEtaResult[] = data.map((item) => ({
    route: item.RouteName?.Zh_tw,
    stop: item.StopName?.Zh_tw,
    etaSeconds: item.EstimateTime ?? null,
    etaMinutes:
      typeof item.EstimateTime === "number"
        ? Math.round(item.EstimateTime / 60)
        : null,
    status: item.StopStatus,
    updatedAt: item.UpdateTime,
  }));

  simplified.sort((a, b) => {
    if (a.etaSeconds === null && b.etaSeconds === null) return 0;
    if (a.etaSeconds === null) return 1;
    if (b.etaSeconds === null) return -1;
    return a.etaSeconds - b.etaSeconds;
  });

  const withEta = simplified.filter((r) => r.etaMinutes !== null).length;

  return { results: simplified, withEta, total: simplified.length };
}

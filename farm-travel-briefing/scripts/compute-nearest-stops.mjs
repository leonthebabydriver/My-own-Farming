#!/usr/bin/env node
/**
 * Computes the nearest live-tracked TDX bus stop for every farm in
 * data/leisure-farms-raw.csv, using the farm's GPS coordinates (already in
 * the government dataset) and TDX's own stop-of-route data (which gives
 * every stop's real position plus which bus routes actually serve it).
 *
 * This has to run on YOUR machine, not in the assistant's sandbox — TDX's
 * API is blocked from the sandbox's network, same reason live bus data
 * never showed up when I tested from there. Your machine has no such
 * restriction (same as when you ran `npm run dev` locally).
 *
 * Usage:
 *   1. Make sure .env.local exists in the project root with your real
 *      TDX_CLIENT_ID / TDX_CLIENT_SECRET (same file you already use for
 *      `npm run dev`).
 *   2. From the project root: node scripts/compute-nearest-stops.mjs
 *   3. Output lands at data/leisure-farms-with-stops.csv
 *
 * What it does NOT do: guess. If a farm's county has no matching TDX city,
 * or TDX has no stop within a sane radius, the row is left blank rather
 * than forcing a wrong answer — you can fill those in by hand later.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// --- Load .env.local (no dependency needed — tiny hand-rolled parser) -----
function loadEnvLocal() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!existsSync(envPath)) {
    console.error(
      "Missing .env.local at the project root. Copy .env.local.example to " +
        ".env.local and fill in your real TDX_CLIENT_ID / TDX_CLIENT_SECRET first."
    );
    process.exit(1);
  }
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const TDX_CLIENT_ID = process.env.TDX_CLIENT_ID;
const TDX_CLIENT_SECRET = process.env.TDX_CLIENT_SECRET;
if (!TDX_CLIENT_ID || !TDX_CLIENT_SECRET || TDX_CLIENT_ID.includes("your_")) {
  console.error(
    "TDX_CLIENT_ID / TDX_CLIENT_SECRET in .env.local look like placeholders. " +
      "Fill in your real TDX credentials first."
  );
  process.exit(1);
}

const TDX_AUTH_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const TDX_API_BASE = "https://tdx.transportdata.tw/api/basic";

// --- Government county code -> TDX city parameter --------------------------
// TDX's Bus API is organized by these named "City" values, not by the
// numeric county codes the government dataset uses. A handful of counties
// (offshore islands, tiny counties) have little or no TDX city bus coverage
// — those are left unmapped on purpose rather than guessing a city.
const COUNTY_TO_TDX_CITY = {
  63000: "Taipei",
  64000: "Kaohsiung",
  65000: "NewTaipei",
  66000: "Taichung",
  67000: "Tainan",
  68000: "Taoyuan",
  10002: "YilanCounty",
  10004: "HsinchuCounty",
  10005: "MiaoliCounty",
  10007: "ChanghuaCounty",
  10008: "NantouCounty",
  10009: "YunlinCounty",
  10010: "ChiayiCounty",
  10013: "PingtungCounty",
  10014: "TaitungCounty",
  10015: "HualienCounty",
  10017: "PenghuCounty",
  10020: "LienchiangCounty",
  9020: "KinmenCounty",
};

// --- Auth --------------------------------------------------------------
let cachedToken = null;
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.accessToken;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: TDX_CLIENT_ID,
    client_secret: TDX_CLIENT_SECRET,
  });
  const res = await fetch(TDX_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`TDX auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches every route's stop list for a city (StopOfRoute), which gives us
 * each physical stop's position PLUS which route(s) actually serve it —
 * more useful here than the plain Stop endpoint, since we want to show
 * routes alongside the nearest stop, same as the farms already in the app.
 * Retries once on 429 (rate limit) with a short backoff.
 */
async function fetchStopsOfRoute(city) {
  const token = await getAccessToken();
  const url = new URL(`${TDX_API_BASE}/v2/Bus/StopOfRoute/City/${city}`);
  url.searchParams.set("$format", "JSON");
  url.searchParams.set("$top", "30000");

  // TDX's Basic tier rate limit gets tighter the more cities you fetch
  // back-to-back in one run. Retry with a growing wait (10s, 30s, 60s)
  // rather than giving up fast — a big city's data can also just take TDX
  // longer to assemble, which shows up as the same 429/slow response.
  const backoffsMs = [10_000, 30_000, 60_000];
  for (let attempt = 0; attempt <= backoffsMs.length; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < backoffsMs.length) {
      const wait = backoffsMs[attempt];
      console.log(`  ...rate limited fetching ${city}, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(
      `TDX StopOfRoute failed for ${city}: ${res.status} ${await res.text()}`
    );
  }
  throw new Error(`TDX StopOfRoute for ${city}: gave up after retries`);
}

/**
 * Builds a StopUID -> { name, lat, lon, routes: Set } map for a city from
 * its raw StopOfRoute payload. The same physical stop (same StopUID) often
 * appears under many routes, so we merge them here.
 */
function buildStopIndex(stopOfRouteData) {
  const index = new Map();
  for (const route of stopOfRouteData) {
    const routeName = route.RouteName?.Zh_tw ?? route.RouteName?.En ?? "?";
    for (const stop of route.Stops ?? []) {
      const uid = stop.StopUID;
      if (!uid) continue;
      const lat = stop.StopPosition?.PositionLat;
      const lon = stop.StopPosition?.PositionLon;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      if (!index.has(uid)) {
        index.set(uid, {
          name: stop.StopName?.Zh_tw ?? "",
          lat,
          lon,
          routes: new Set(),
        });
      }
      index.get(uid).routes.add(routeName);
    }
  }
  return index;
}

// Haversine distance in meters between two lat/lon points.
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function findNearestStop(stopIndex, farmLat, farmLon) {
  let best = null;
  let bestDist = Infinity;
  for (const stop of stopIndex.values()) {
    const d = distanceMeters(farmLat, farmLon, stop.lat, stop.lon);
    if (d < bestDist) {
      bestDist = d;
      best = stop;
    }
  }
  if (!best) return null;
  return {
    stopName: best.name,
    distanceMeters: Math.round(bestDist),
    routes: Array.from(best.routes).sort(),
  };
}

// --- Minimal CSV parsing (handles quoted fields with commas/newlines) -----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // Strip a leading UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function csvField(value) {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// --- Main ----------------------------------------------------------------
async function main() {
  const inputPath = path.join(PROJECT_ROOT, "data", "leisure-farms-raw.csv");
  const outputPath = path.join(
    PROJECT_ROOT,
    "data",
    "leisure-farms-with-stops.csv"
  );

  const rows = parseCsv(readFileSync(inputPath, "utf-8"));
  const header = rows[0];
  const dataRows = rows.slice(1);
  const col = Object.fromEntries(header.map((name, i) => [name, i]));

  console.log(`Loaded ${dataRows.length} farms from ${inputPath}`);

  // Optional: `node scripts/compute-nearest-stops.mjs Taipei` (or a
  // comma-separated list) restricts the run to just those TDX cities —
  // much faster and gentler on the rate limit when you only need a
  // handful of farms right now. With no argument, it processes every
  // city that has at least one farm (the full nationwide run).
  const cityFilterArg = process.argv[2];
  const cityFilter = cityFilterArg
    ? new Set(cityFilterArg.split(",").map((s) => s.trim()))
    : null;
  if (cityFilter) {
    console.log(`Restricting this run to: ${Array.from(cityFilter).join(", ")}`);
  }

  // Group farms by TDX city so we only fetch each city's stop data once.
  const byCity = new Map();
  const unmapped = [];
  for (const row of dataRows) {
    const countyCode = row[col.County];
    const city = COUNTY_TO_TDX_CITY[countyCode];
    if (!city) {
      unmapped.push(row);
      continue;
    }
    if (cityFilter && !cityFilter.has(city)) continue;
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city).push(row);
  }

  if (unmapped.length > 0) {
    console.log(
      `${unmapped.length} farms are in counties with no TDX city bus coverage mapped ` +
        `(offshore islands etc.) — their stop columns will be left blank.`
    );
  }

  const results = new Map(); // row -> { stopName, distanceMeters, routes }

  const failedCities = [];
  let cityNum = 0;
  for (const [city, farmRows] of byCity) {
    cityNum++;
    console.log(
      `[${cityNum}/${byCity.size}] Fetching stops for ${city} (${farmRows.length} farms)...`
    );
    // One city failing (rate limit, TDX hiccup) shouldn't lose the work
    // already done for every other city — log it and move on; that city's
    // farms are left blank in the output and can be re-run later on their
    // own with the city-filter argument.
    let stopOfRouteData;
    try {
      stopOfRouteData = await fetchStopsOfRoute(city);
    } catch (err) {
      console.log(`  ...giving up on ${city}: ${err.message}`);
      failedCities.push(city);
      continue;
    }
    const stopIndex = buildStopIndex(stopOfRouteData);
    console.log(`  ${stopIndex.size} unique stops found in ${city}`);

    for (const row of farmRows) {
      const lat = parseFloat(row[col.Latitude]);
      const lon = parseFloat(row[col.Longitude]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const nearest = findNearestStop(stopIndex, lat, lon);
      if (nearest) results.set(row, nearest);
    }

    // Be polite to TDX's rate limit between cities.
    await sleep(1500);
  }

  const outHeader = [
    "FarmNm_CH",
    "FarmNm_EN",
    "County",
    "Township",
    "Address_CH",
    "Longitude",
    "Latitude",
    "WebURL",
    "NearestStopName",
    "NearestStopDistanceMeters",
    "Routes",
  ];
  const outRows = [outHeader.join(",")];

  for (const row of dataRows) {
    const nearest = results.get(row);
    outRows.push(
      [
        csvField(row[col.FarmNm_CH]),
        csvField(row[col.FarmNm_EN]),
        csvField(row[col.County]),
        csvField(row[col.Township]),
        csvField(row[col.Address_CH]),
        csvField(row[col.Longitude]),
        csvField(row[col.Latitude]),
        csvField(row[col.WebURL]),
        csvField(nearest?.stopName ?? ""),
        csvField(nearest?.distanceMeters ?? ""),
        csvField(nearest ? nearest.routes.join("; ") : ""),
      ].join(",")
    );
  }

  writeFileSync(outputPath, outRows.join("\n"), "utf-8");
  console.log(`\nDone. Wrote ${dataRows.length} rows to ${outputPath}`);
  console.log(
    `Matched a nearest stop for ${results.size} of ${dataRows.length} farms.`
  );
  if (failedCities.length > 0) {
    console.log(
      `\nCould not fetch these cities (rate-limited or TDX error), their farms ` +
        `are blank in the output — re-run later with just those, e.g.\n` +
        `  node scripts/compute-nearest-stops.mjs ${failedCities.join(",")}\n` +
        `Failed: ${failedCities.join(", ")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

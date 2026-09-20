/**
 * Curated farm -> nearest-stop mapping.
 *
 * This is first-party data that public APIs can't give us — someone has to
 * actually confirm which real, live-tracked TDX stop is the right one to
 * send a visitor to for each farm. Add a new entry here for each farm as
 * it's onboarded.
 *
 * `stopName` must be a substring that matches the stop's Chinese name in
 * TDX (StopName/Zh_tw) — see src/app/api/tdx/bus-eta/route.ts for how that
 * search works. `routes` is just informational (which route numbers serve
 * that stop) so we can show it to the visitor without another API call.
 */

export type Farm = {
  id: string;
  name: string;
  nameZh?: string;
  address: string;
  city: string; // TDX city parameter, e.g. "Taipei"
  // A short, human-picked area label used for the homepage's location
  // filter — e.g. "Beitou", "Yangmingshan", "Zhuzihu". Not derived from the
  // address automatically, since "which area does this farm belong to" is a
  // judgment call, not a lookup.
  area: string;
  hasCafe: boolean;
  hasWorkshop: boolean;
  nearestStop: {
    stopName: string; // Chinese name, used to query TDX
    routes: string[]; // route numbers/names known to serve that stop
  };
  weather: {
    // CWA township-forecast dataset ID for the county this farm is in.
    // Taipei City = "F-D0047-061". See src/lib/cwa.ts.
    countyForecastDatasetId: string;
    // The township name as CWA's LocationName expects it, e.g. "北投區".
    townshipName: string;
    // County name as CWA warnings data expects it, e.g. "臺北市".
    countyName: string;
  };
  notes?: string;
};

export const farms: Farm[] = [
  {
    id: "jaifu-garden",
    name: "Jaifu Garden",
    nameZh: "佳福花園",
    address:
      "112 Taipei City, Beitou District, Hutian Village, Yangming Creek Walkway, near No. 68",
    city: "Taipei",
    area: "Beitou",
    hasCafe: true,
    hasWorkshop: true,
    nearestStop: {
      stopName: "風架口",
      routes: ["小8", "129", "小9(台灣好行-北投竹子湖)"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "北投區",
      countyName: "臺北市",
    },
    notes:
      "Confirmed live via TDX on 2026-09-20: 小8, 129 and 小9 (Taiwan Tourist Shuttle Beitou–Zhuzihu) all serve this stop.",
  },
  {
    id: "minyangpu",
    name: "Minyangpu",
    address:
      "112 Taipei City, Beitou District, Zhuzihu Road (near Jaifu Garden) — search Google Maps for 陽圃休閒農莊",
    city: "Taipei",
    area: "Beitou",
    hasCafe: false,
    hasWorkshop: true,
    nearestStop: {
      // Confirmed close to Jaifu Garden (2026-09-20) — reuses the same
      // confirmed-live stop rather than a fresh search.
      stopName: "風架口",
      routes: ["小8", "129", "小9(台灣好行-北投竹子湖)"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "北投區",
      countyName: "臺北市",
    },
    notes:
      "Confirmed close to Jaifu Garden on 2026-09-20 — shares Jaifu Garden's stop (風架口) rather than a separately verified one.",
  },
  {
    id: "datitian",
    name: "Datitian",
    address:
      "112 Taipei City, Beitou District, Hutian Village, Yangming Creek Walkway, near No. 33-7",
    city: "Taipei",
    area: "Beitou",
    hasCafe: true,
    hasWorkshop: true,
    nearestStop: {
      // Confirmed live via TDX on 2026-09-20: exact stop name "竹子湖"
      // (Zhuzi Lake), matched against the farm's Google Maps "Bus station"
      // listing.
      stopName: "竹子湖",
      routes: ["小8"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "北投區",
      countyName: "臺北市",
    },
    notes:
      "Confirmed live via TDX on 2026-09-20: 小8 serves the exact-match stop 竹子湖, which also matches Google Maps' own \"Bus station\" listing for this location.",
  },
];

export function getFarmById(id: string): Farm | undefined {
  return farms.find((f) => f.id === id);
}

/** Distinct area labels across all farms, for the location filter dropdown. */
export function getAllAreas(): string[] {
  return Array.from(new Set(farms.map((f) => f.area))).sort();
}

/** Distinct route names across all farms, for the route filter dropdown. */
export function getAllRoutes(): string[] {
  return Array.from(
    new Set(farms.flatMap((f) => f.nearestStop.routes))
  ).sort();
}

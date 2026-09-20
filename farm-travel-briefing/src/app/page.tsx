"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { farms, getAreasByCity, type Farm } from "@/data/farms";
import { useLanguage, type Lang, type UI } from "@/lib/i18n";

// Leaflet reaches for `window` as soon as it's imported, which breaks
// Next's server-side render — loading it only on the client (with a plain
// placeholder while it loads) is what actually fixes that, not just where
// FarmMap happens to be used on the page.
const FarmMap = dynamic(() => import("@/components/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
      Loading map…
    </div>
  ),
});

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "VN" },
  { code: "ja", label: "JP" },
  { code: "ko", label: "KR" },
];

function FarmCard({
  farm,
  lang,
  t,
}: {
  farm: Farm;
  lang: Lang;
  t: (key: keyof typeof UI) => string;
}) {
  const [showAmenities, setShowAmenities] = useState(false);
  const hasAnyAmenity = farm.hasCafe || farm.hasWorkshop || farm.hasRestaurant;

  return (
    <Link
      href={`/briefing?farmId=${encodeURIComponent(farm.id)}`}
      className="relative flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium text-black dark:text-zinc-50">
          {lang === "zh" && farm.nameZh ? farm.nameZh : farm.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {farm.area}
          </span>
          {hasAnyAmenity && (
            // "group" scopes CSS-only hover (desktop mouse) to just this
            // wrapper, so it never touches React state — click (touch/tap)
            // is handled separately below, purely via state. Mixing the two
            // through JS event handlers caused a real bug: a click's mouse
            // movement fired hover-open first, then the click's own toggle
            // immediately closed it again. Keeping them independent (CSS
            // for hover, state for click) avoids that race entirely.
            <div className="group relative">
              <button
                type="button"
                aria-label="Show amenities"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAmenities((v) => !v);
                }}
                className="rounded-full px-1.5 py-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                •••
              </button>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`${
                  showAmenities ? "flex" : "hidden"
                } group-hover:flex absolute right-0 top-8 z-10 flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900`}
              >
                {farm.hasCafe && (
                  <span className="whitespace-nowrap text-amber-700 dark:text-amber-300">
                    ☕ {t("cafeYes")}
                  </span>
                )}
                {farm.hasWorkshop && (
                  <span className="whitespace-nowrap text-sky-700 dark:text-sky-300">
                    🛠️ {t("workshopYes")}
                  </span>
                )}
                {farm.hasRestaurant && (
                  <span className="whitespace-nowrap text-rose-700 dark:text-rose-300">
                    🍽️ {t("restaurantYes")}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {lang === "zh" && farm.addressZh ? farm.addressZh : farm.address}
      </span>
      <span className="text-xs text-zinc-500">
        {t("routesLabel")}: {farm.nearestStop.routes.join(", ")}
      </span>
      <span className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
        {t("viewBriefing")}
      </span>
    </Link>
  );
}

const INITIAL_VISIBLE = 6;
const LOAD_MORE_STEP = 20;

export default function Home() {
  const { lang, setLang, t } = useLanguage();
  const [query, setQuery] = useState("");
  // Empty set = no area constraint ("All areas"). Checking a city checks
  // every district under it at once; checking a district checks just that
  // one — both live in the same set, so a city reads as "checked" whenever
  // all of its districts are in the set.
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  // Which cities' district lists are expanded — collapsed by default, click
  // a city name to reveal its districts.
  const [expandedCities, setExpandedCities] = useState<Set<string>>(
    new Set()
  );
  const [cafeOnly, setCafeOnly] = useState(false);
  const [workshopOnly, setWorkshopOnly] = useState(false);
  const [restaurantOnly, setRestaurantOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const areasByCity = useMemo(getAreasByCity, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farms.filter((farm) => {
      const matchesQuery =
        q === "" ||
        farm.name.toLowerCase().includes(q) ||
        (farm.nameZh ?? "").toLowerCase().includes(q) ||
        farm.address.toLowerCase().includes(q);

      const matchesArea =
        selectedAreas.size === 0 || selectedAreas.has(farm.area);

      // Checkbox filters combine with AND: each checked box narrows the
      // result further. Unchecked boxes place no constraint.
      const matchesCafe = !cafeOnly || farm.hasCafe;
      const matchesWorkshop = !workshopOnly || farm.hasWorkshop;
      const matchesRestaurant = !restaurantOnly || farm.hasRestaurant;

      return (
        matchesQuery &&
        matchesArea &&
        matchesCafe &&
        matchesWorkshop &&
        matchesRestaurant
      );
    });
  }, [query, selectedAreas, cafeOnly, workshopOnly, restaurantOnly]);

  const filtersActive =
    query !== "" ||
    selectedAreas.size > 0 ||
    cafeOnly ||
    workshopOnly ||
    restaurantOnly;

  // Any filter/search change invalidates how far the list was expanded —
  // collapse back to the initial view rather than showing a huge list for
  // a narrower search.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [query, selectedAreas, cafeOnly, workshopOnly, restaurantOnly]);

  function toggleCity(city: string, cityAreas: string[]) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      const allSelected = cityAreas.every((a) => next.has(a));
      for (const a of cityAreas) {
        if (allSelected) next.delete(a);
        else next.add(a);
      }
      return next;
    });
    // Checking a city reveals which districts got selected instead of
    // leaving the visitor to expand it themselves to find out.
    setExpandedCities((prev) => new Set(prev).add(city));
  }

  function toggleArea(a: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleExpanded(city: string) {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  }

  const visibleFarms = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      {/* Header / hero — the photo sits behind the title with a warm
          gradient wash over it (picked up from the maroon in the photo and
          an earthy green for "farm"), so the title reads as part of the
          image rather than a caption bolted onto it. */}
      <header className="relative w-full overflow-hidden">
        {/* 5/8 of the previous height (224px/288px -> 140px/180px). */}
        <div className="relative h-[140px] w-full sm:h-[180px]">
          <Image
            src="/hero-v3.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_45%]"
          />
          {/* Color wash: emerald (farms) blending toward a warm edge,
              darkening toward the bottom so white text stays readable over
              any part of the image. */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-800/50 to-rose-900/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <div className="absolute right-3 top-3 flex shrink-0 flex-wrap justify-end gap-1 rounded-full bg-white/15 p-0.5 text-xs backdrop-blur-sm">
            {LANG_OPTIONS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`rounded-full px-2 py-1 ${
                  lang === code ? "bg-white text-black" : "text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 sm:p-6">
            <Image
              src="/logo.png"
              alt="Yinzhi Collective logo"
              width={88}
              height={88}
              className="shrink-0 rounded-full bg-white/90 p-1.5 ring-2 ring-white/80 sm:h-24 sm:w-24"
            />
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-sm sm:text-5xl">
                {t("appTitle")}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/90 drop-shadow-sm sm:text-base">
                {t("appSubtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        {/* Sidebar (left) + results (right) */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <aside className="flex w-full flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:w-64 md:shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t("search")}
              </label>
              <input
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {t("area")}
                </label>
                {selectedAreas.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAreas(new Set())}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {t("allAreas")}
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto rounded border border-zinc-300 p-2 dark:border-zinc-700">
                {areasByCity.map(({ city, areas }) => {
                  const checkedCount = areas.filter((a) =>
                    selectedAreas.has(a)
                  ).length;
                  const isExpanded = expandedCities.has(city);
                  return (
                    <div key={city} className="mb-1 last:mb-0">
                      <div className="flex items-center gap-1 rounded px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                        <input
                          type="checkbox"
                          checked={checkedCount === areas.length}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate =
                                checkedCount > 0 &&
                                checkedCount < areas.length;
                            }
                          }}
                          onChange={() => toggleCity(city, areas)}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-black dark:accent-white"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpanded(city)}
                          className="flex flex-1 cursor-pointer items-center gap-1 text-left text-sm font-medium text-zinc-800 dark:text-zinc-200"
                        >
                          <span
                            className={`inline-block text-[10px] text-zinc-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                          {city}
                          {checkedCount > 0 && (
                            <span className="text-xs font-normal text-zinc-400">
                              ({checkedCount}/{areas.length})
                            </span>
                          )}
                        </button>
                      </div>
                      {isExpanded && (
                      <div className="ml-5 flex flex-col">
                        {areas.map((a) => (
                          <label
                            key={a}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAreas.has(a)}
                              onChange={() => toggleArea(a)}
                              className="h-3.5 w-3.5 rounded border-zinc-300 accent-black dark:accent-white"
                            />
                            {a}
                          </label>
                        ))}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pins for whatever the current search/filters leave in
                `filtered` — narrowing the list on the left narrows the map
                too, without needing a separate "search this area" step. */}
            <FarmMap farms={filtered} lang={lang} viewBriefingLabel={t("viewBriefing")} />

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("filters")}
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={cafeOnly}
                    onChange={(e) => setCafeOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 accent-black dark:accent-white"
                  />
                  ☕ {t("cafeYes")}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={workshopOnly}
                    onChange={(e) => setWorkshopOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 accent-black dark:accent-white"
                  />
                  🛠️ {t("workshopYes")}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={restaurantOnly}
                    onChange={(e) => setRestaurantOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 accent-black dark:accent-white"
                  />
                  🍽️ {t("restaurantYes")}
                </label>
              </div>
            </div>
          </aside>

          <div className="flex flex-1 flex-col gap-4">
            {filtered.length === 0 && (
              <p className="text-sm text-zinc-500">
                {filtersActive ? t("noMatch") : t("noFarms")}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleFarms.map((farm) => (
                <FarmCard key={farm.id} farm={farm} lang={lang} t={t} />
              ))}
            </div>

            {/* Cumulative reveal, not a separate page or a grid tile — a
                small standalone pill centered below the results; each click
                grows the same list by 20 rather than swapping it out. */}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((v) =>
                      Math.min(filtered.length, v + LOAD_MORE_STEP)
                    )
                  }
                  className="flex items-center gap-2 rounded-full border-2 border-dashed border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:bg-zinc-800/60"
                >
                  <span className="text-base text-zinc-400 dark:text-zinc-500">
                    +
                  </span>
                  {t("moreFarms")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

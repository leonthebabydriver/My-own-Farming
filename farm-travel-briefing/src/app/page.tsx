"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { farms, getAllAreas, getAllRoutes, type Farm } from "@/data/farms";
import { useLanguage, type Lang, type UI } from "@/lib/i18n";

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
  const hasAnyAmenity = farm.hasCafe || farm.hasWorkshop;

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
              </div>
            </div>
          )}
        </div>
      </div>

      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {farm.address}
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

export default function Home() {
  const { lang, setLang, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [route, setRoute] = useState("all");
  const [cafeOnly, setCafeOnly] = useState(false);
  const [workshopOnly, setWorkshopOnly] = useState(false);

  const areas = useMemo(getAllAreas, []);
  const routes = useMemo(getAllRoutes, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farms.filter((farm) => {
      const matchesQuery =
        q === "" ||
        farm.name.toLowerCase().includes(q) ||
        (farm.nameZh ?? "").toLowerCase().includes(q) ||
        farm.address.toLowerCase().includes(q);

      const matchesArea = area === "all" || farm.area === area;

      const matchesRoute =
        route === "all" || farm.nearestStop.routes.includes(route);

      // Checkbox filters combine with AND: each checked box narrows the
      // result further. Unchecked boxes place no constraint.
      const matchesCafe = !cafeOnly || farm.hasCafe;
      const matchesWorkshop = !workshopOnly || farm.hasWorkshop;

      return (
        matchesQuery &&
        matchesArea &&
        matchesRoute &&
        matchesCafe &&
        matchesWorkshop
      );
    });
  }, [query, area, route, cafeOnly, workshopOnly]);

  const filtersActive =
    query !== "" ||
    area !== "all" ||
    route !== "all" ||
    cafeOnly ||
    workshopOnly;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Yinzhi Collective logo"
              width={40}
              height={40}
              className="rounded-md"
            />
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {t("appTitle")}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("appSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1 rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-800">
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-2 py-1 ${
                lang === "en"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-500"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("zh")}
              className={`rounded-full px-2 py-1 ${
                lang === "zh"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-500"
              }`}
            >
              中文
            </button>
          </div>
        </div>

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
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t("area")}
              </label>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="all">{t("allAreas")}</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t("busRoute")}
              </label>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              >
                <option value="all">{t("allRoutes")}</option>
                {routes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

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
              {filtered.map((farm) => (
                <FarmCard key={farm.id} farm={farm} lang={lang} t={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

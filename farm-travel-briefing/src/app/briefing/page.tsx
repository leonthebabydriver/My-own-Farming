"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage, translateWeatherTerm, type Lang } from "@/lib/i18n";

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "VN" },
  { code: "ja", label: "JP" },
  { code: "ko", label: "KR" },
];

type BusResult = {
  route?: string;
  stop?: string;
  etaMinutes: number | null;
  status?: number;
};

type WeatherSummaryEntry = {
  elementNameZh: string;
  valueKey: string;
  value: unknown;
};

type BriefingResponse = {
  ok: boolean;
  error?: string;
  farm?: {
    id: string;
    name: string;
    nameZh?: string;
    address: string;
    addressZh?: string;
  };
  transport?: {
    ok: boolean;
    error?: string;
    stopName?: string;
    withEta?: number;
    results?: BusResult[];
  };
  weather?: {
    ok: boolean;
    error?: string;
    township?: string;
    summary?: WeatherSummaryEntry[];
  };
};

// Friendly English labels for the weather elements we know how to show. In
// Chinese mode we use the element's own elementNameZh instead (already
// returned by the API), so nothing needs translating there.
const WEATHER_LABELS_EN: Record<string, string> = {
  Temperature: "Temperature",
  ApparentTemperature: "Feels like",
  DewPoint: "Dew point",
  RelativeHumidity: "Humidity",
  ComfortIndex: "Comfort index",
  WindSpeed: "Wind speed",
  WindDirection: "Wind direction",
  ProbabilityOfPrecipitation: "Rain chance",
  Weather: "Sky condition",
  WeatherDescription: "Summary",
};

function BriefingContent() {
  const params = useSearchParams();
  const farmId = params.get("farmId") ?? "jaifu-garden";
  const { lang, setLang, t } = useLanguage();

  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/briefing?farmId=${encodeURIComponent(farmId)}`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) =>
        setData({ ok: false, error: err instanceof Error ? err.message : String(err) })
      )
      .finally(() => setLoading(false));
  }, [farmId]);

  const LangToggle = (
    <div className="flex shrink-0 flex-wrap gap-1 rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-800">
      {LANG_OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`rounded-full px-2 py-1 ${
            lang === code
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-zinc-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500">Loading briefing…</div>
    );
  }

  if (!data || !data.ok || !data.farm) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Couldn&apos;t load this briefing.</p>
          <p className="mt-1 font-mono text-xs whitespace-pre-wrap">
            {data?.error ?? "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const { farm, transport, weather } = data;
  const liveBuses = (transport?.results ?? []).filter(
    (r) => r.etaMinutes !== null
  );

  const summaryDescription = weather?.summary?.find(
    (s) => s.valueKey === "WeatherDescription"
  );
  const otherWeather = (weather?.summary ?? []).filter(
    (s) => s.valueKey !== "WeatherDescription"
  );

  // We only show CWA's own pre-written sentence in Chinese mode — it's
  // already Chinese text from the live API, and we're not running it
  // through an AI translator. In English mode we compose an equivalent
  // sentence from the structured values instead, translating the couple of
  // Chinese terms (sky condition, wind direction) via a small dictionary.
  const skyCondition = weather?.summary?.find((s) => s.valueKey === "Weather");
  const rainChance = weather?.summary?.find(
    (s) => s.valueKey === "ProbabilityOfPrecipitation"
  );
  const tempEntry = weather?.summary?.find((s) => s.valueKey === "Temperature");
  const windDir = weather?.summary?.find((s) => s.valueKey === "WindDirection");

  const englishSummary =
    skyCondition || tempEntry
      ? [
          skyCondition
            ? translateWeatherTerm(String(skyCondition.value), "en")
            : null,
          tempEntry ? `${tempEntry.value}°C` : null,
          rainChance ? `${rainChance.value}% chance of rain` : null,
          windDir ? translateWeatherTerm(String(windDir.value), "en") : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {lang === "zh" && farm.nameZh ? farm.nameZh : farm.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {lang === "zh" && farm.addressZh ? farm.addressZh : farm.address}
          </p>
        </div>
        {LangToggle}
      </div>

      {/* Transport */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("howToGetThere")} — {transport?.stopName}
        </h2>

        {!transport?.ok && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("transportUnavailable")}
          </p>
        )}

        {transport?.ok && liveBuses.length === 0 && (
          <p className="text-sm text-zinc-500">{t("noLiveBuses")}</p>
        )}

        {transport?.ok && liveBuses.length > 0 && (
          <ul className="flex flex-col gap-2">
            {liveBuses.slice(0, 6).map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{r.route}</span>
                <span className="font-mono">
                  {r.etaMinutes} {t("min")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Weather */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("weather")} — {weather?.township}
        </h2>

        {!weather?.ok && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("weatherUnavailable")}
          </p>
        )}

        {weather?.ok && lang === "zh" && summaryDescription && (
          <p className="mb-4 rounded bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {String(summaryDescription.value)}
          </p>
        )}

        {weather?.ok && lang !== "zh" && englishSummary && (
          <p className="mb-4 rounded bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {englishSummary}
          </p>
        )}

        {weather?.ok && otherWeather.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {otherWeather.map((s, i) => (
              <div
                key={i}
                className="rounded border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <p className="text-xs text-zinc-500">
                  {lang === "zh"
                    ? s.elementNameZh
                    : WEATHER_LABELS_EN[s.valueKey] ?? s.elementNameZh}
                </p>
                <p className="text-sm font-medium">
                  {translateWeatherTerm(String(s.value), lang)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-zinc-400">{t("liveDataFooter")}</p>
    </div>
  );
}

export default function BriefingPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-500">Loading…</div>}
    >
      <BriefingContent />
    </Suspense>
  );
}

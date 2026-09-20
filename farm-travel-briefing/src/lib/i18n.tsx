"use client";

/**
 * Simple client-side EN/ZH language toggle.
 *
 * This is NOT AI translation — it's a pre-written dictionary of UI strings
 * plus a small lookup table for the handful of Chinese weather terms CWA
 * returns (sky condition, wind direction), since those come from the live
 * API only in Chinese and we're not calling an AI model to translate them.
 * Anything not in these dictionaries falls back to the original text rather
 * than breaking.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "lang";

type Dict = Record<string, { en: string; zh: string }>;

export const UI: Dict = {
  appTitle: { en: "Hello Taiwan Farms", zh: "Hello Taiwan Farms" },
  appSubtitle: {
    en: "Pick a booked farm visit to see live transport and weather guidance for getting there.",
    zh: "選擇已預約的農場行程，查看即時交通與天氣資訊。",
  },
  search: { en: "Search", zh: "搜尋" },
  searchPlaceholder: { en: "Farm name…", zh: "農場名稱…" },
  area: { en: "Area", zh: "地區" },
  allAreas: { en: "All areas", zh: "全部地區" },
  busRoute: { en: "Bus route", zh: "公車路線" },
  allRoutes: { en: "All routes", zh: "全部路線" },
  filters: { en: "Filters", zh: "篩選條件" },
  cafeYes: { en: "Has cafe", zh: "有咖啡廳" },
  workshopYes: { en: "Has workshop", zh: "有工作坊" },
  noMatch: { en: "No farms match your search/filters.", zh: "沒有符合搜尋/篩選條件的農場。" },
  noFarms: {
    en: "No farms are set up yet.",
    zh: "尚未設定任何農場。",
  },
  viewBriefing: { en: "View Travel Briefing →", zh: "查看旅遊須知 →" },
  routesLabel: { en: "Routes", zh: "路線" },
  howToGetThere: { en: "How to get there", zh: "交通方式" },
  weather: { en: "Weather", zh: "天氣" },
  transportUnavailable: {
    en: "Live bus data is unavailable right now. Check live transport before you leave.",
    zh: "目前無法取得即時公車資訊，出發前請自行查詢。",
  },
  noLiveBuses: {
    en: "No live arrivals right now for this stop — service may be outside operating hours, or there's a temporary gap in tracking. Check again closer to departure.",
    zh: "此站目前無即時到站資訊，可能已過營運時間或追蹤暫時中斷，請於出發前再次查詢。",
  },
  weatherUnavailable: {
    en: "Live weather data is unavailable right now. Check the forecast yourself before you leave.",
    zh: "目前無法取得即時天氣資訊，出發前請自行查詢天氣預報。",
  },
  liveDataFooter: {
    en: "Live data from TDX and CWA — refresh this page for the latest.",
    zh: "資料來源：TDX 與 CWA（中央氣象署）— 重新整理頁面以取得最新資訊。",
  },
  min: { en: "min", zh: "分鐘" },
};

/** Translates a handful of common CWA Chinese weather terms into English. */
export const WEATHER_TERMS_EN: Record<string, string> = {
  // Sky condition (天氣現象)
  "晴": "Clear",
  "晴時多雲": "Mostly clear",
  "多雲": "Cloudy",
  "多雲時晴": "Mostly cloudy",
  "多雲時陰": "Mostly overcast",
  "陰": "Overcast",
  "陰時多雲": "Mostly overcast",
  "短暫雨": "Brief rain",
  "午後短暫雷陣雨": "Afternoon thunderstorms",
  "陣雨": "Showers",
  "雷雨": "Thunderstorms",
  "雷陣雨": "Thundershowers",
  "有雨": "Rainy",
  "小雨": "Light rain",
  // Wind direction (風向)
  "東北風": "Northeast wind",
  "東風": "East wind",
  "東南風": "Southeast wind",
  "南風": "South wind",
  "西南風": "Southwest wind",
  "西風": "West wind",
  "西北風": "Northwest wind",
  "北風": "North wind",
  "無風": "Calm",
};

export function translateWeatherTerm(zhValue: string, lang: Lang): string {
  if (lang === "zh") return zhValue;
  return WEATHER_TERMS_EN[zhValue] ?? zhValue;
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof UI) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh") setLangState(stored);
    } catch {
      // localStorage unavailable — fall back to default "en" silently.
    }
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only.
    }
  }

  function t(key: keyof typeof UI): string {
    return UI[key][lang];
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

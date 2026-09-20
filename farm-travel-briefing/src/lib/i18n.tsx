"use client";

/**
 * Simple client-side language toggle: EN / 中文 / Tiếng Việt / 日本語 / 한국어.
 *
 * This is NOT AI translation — it's a pre-written dictionary of UI strings
 * plus a small lookup table for the handful of Chinese weather terms CWA
 * returns (sky condition, wind direction), since those come from the live
 * API only in Chinese and we're not calling an AI model to translate them.
 * Anything not in these dictionaries falls back to the original text rather
 * than breaking. The weather-term table only has an English translation
 * (see WEATHER_TERMS_EN below) — vi/ja/ko fall back to that English version
 * rather than raw Chinese, since a partial translation beats none.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "zh" | "vi" | "ja" | "ko";

const STORAGE_KEY = "lang";
const VALID_LANGS: Lang[] = ["en", "zh", "vi", "ja", "ko"];

type Dict = Record<string, Record<Lang, string>>;

export const UI: Dict = {
  appTitle: {
    en: "Hello Taiwan Farms",
    zh: "Hello Taiwan Farms",
    vi: "Hello Taiwan Farms",
    ja: "Hello Taiwan Farms",
    ko: "Hello Taiwan Farms",
  },
  appSubtitle: {
    en: "Pick a booked farm visit to see live transport and weather guidance for getting there.",
    zh: "選擇已預約的農場行程，查看即時交通與天氣資訊。",
    vi: "Chọn chuyến thăm nông trại đã đặt để xem hướng dẫn giao thông và thời tiết trực tiếp.",
    ja: "予約済みの農場訪問を選ぶと、現地までのリアルタイム交通・天気情報が確認できます。",
    ko: "예약한 농장 방문을 선택하면 실시간 교통 및 날씨 안내를 확인할 수 있습니다.",
  },
  search: { en: "Search", zh: "搜尋", vi: "Tìm kiếm", ja: "検索", ko: "검색" },
  searchPlaceholder: {
    en: "Farm name…",
    zh: "農場名稱…",
    vi: "Tên nông trại…",
    ja: "農場名…",
    ko: "농장 이름…",
  },
  area: { en: "Area", zh: "地區", vi: "Khu vực", ja: "エリア", ko: "지역" },
  allAreas: {
    en: "All areas",
    zh: "全部地區",
    vi: "Tất cả khu vực",
    ja: "すべてのエリア",
    ko: "전체 지역",
  },
  filters: {
    en: "Filters",
    zh: "篩選條件",
    vi: "Bộ lọc",
    ja: "絞り込み",
    ko: "필터",
  },
  cafeYes: {
    en: "Has cafe",
    zh: "有咖啡廳",
    vi: "Có quán cà phê",
    ja: "カフェあり",
    ko: "카페 있음",
  },
  workshopYes: {
    en: "Has workshop",
    zh: "有工作坊",
    vi: "Có xưởng trải nghiệm",
    ja: "体験工房あり",
    ko: "체험 공방 있음",
  },
  restaurantYes: {
    en: "Has restaurant",
    zh: "有餐廳",
    vi: "Có nhà hàng",
    ja: "レストランあり",
    ko: "식당 있음",
  },
  noMatch: {
    en: "No farms match your search/filters.",
    zh: "沒有符合搜尋/篩選條件的農場。",
    vi: "Không có nông trại nào phù hợp với tìm kiếm/bộ lọc của bạn.",
    ja: "検索・絞り込み条件に一致する農場がありません。",
    ko: "검색/필터 조건에 맞는 농장이 없습니다.",
  },
  noFarms: {
    en: "No farms are set up yet.",
    zh: "尚未設定任何農場。",
    vi: "Chưa có nông trại nào được thiết lập.",
    ja: "まだ農場が登録されていません。",
    ko: "아직 등록된 농장이 없습니다.",
  },
  viewBriefing: {
    en: "View Travel Briefing →",
    zh: "查看旅遊須知 →",
    vi: "Xem thông tin di chuyển →",
    ja: "旅行案内を見る →",
    ko: "여행 안내 보기 →",
  },
  routesLabel: {
    en: "Routes",
    zh: "路線",
    vi: "Tuyến xe",
    ja: "バス路線",
    ko: "노선",
  },
  howToGetThere: {
    en: "How to get there",
    zh: "交通方式",
    vi: "Cách di chuyển",
    ja: "行き方",
    ko: "가는 방법",
  },
  weather: { en: "Weather", zh: "天氣", vi: "Thời tiết", ja: "天気", ko: "날씨" },
  transportUnavailable: {
    en: "Live bus data is unavailable right now. Check live transport before you leave.",
    zh: "目前無法取得即時公車資訊，出發前請自行查詢。",
    vi: "Hiện chưa có dữ liệu xe buýt trực tiếp. Vui lòng kiểm tra giao thông trước khi khởi hành.",
    ja: "現在バスのリアルタイム情報を取得できません。出発前にご自身でご確認ください。",
    ko: "현재 실시간 버스 정보를 가져올 수 없습니다. 출발 전에 직접 확인해 주세요.",
  },
  noLiveBuses: {
    en: "No live arrivals right now for this stop — service may be outside operating hours, or there's a temporary gap in tracking. Check again closer to departure.",
    zh: "此站目前無即時到站資訊，可能已過營運時間或追蹤暫時中斷，請於出發前再次查詢。",
    vi: "Hiện trạm này chưa có dữ liệu xe đến trực tiếp — có thể ngoài giờ hoạt động hoặc gián đoạn theo dõi tạm thời. Vui lòng kiểm tra lại gần giờ khởi hành.",
    ja: "現在このバス停にはリアルタイムの到着情報がありません。運行時間外か、追跡が一時的に途切れている可能性があります。出発が近づいたら再度ご確認ください。",
    ko: "현재 이 정류장의 실시간 도착 정보가 없습니다. 운행 시간이 아니거나 추적이 일시적으로 끊겼을 수 있습니다. 출발 직전에 다시 확인해 주세요.",
  },
  weatherUnavailable: {
    en: "Live weather data is unavailable right now. Check the forecast yourself before you leave.",
    zh: "目前無法取得即時天氣資訊，出發前請自行查詢天氣預報。",
    vi: "Hiện chưa có dữ liệu thời tiết trực tiếp. Vui lòng tự kiểm tra dự báo trước khi khởi hành.",
    ja: "現在リアルタイムの天気情報を取得できません。出発前にご自身で天気予報をご確認ください。",
    ko: "현재 실시간 날씨 정보를 가져올 수 없습니다. 출발 전에 직접 예보를 확인해 주세요.",
  },
  liveDataFooter: {
    en: "Live data from TDX and CWA — refresh this page for the latest.",
    zh: "資料來源：TDX 與 CWA（中央氣象署）— 重新整理頁面以取得最新資訊。",
    vi: "Dữ liệu trực tiếp từ TDX và CWA — làm mới trang để cập nhật.",
    ja: "TDXおよびCWA（中央気象署）のリアルタイムデータです。最新情報はページを更新してください。",
    ko: "TDX 및 CWA(중앙기상서)의 실시간 데이터입니다. 최신 정보는 페이지를 새로고침하세요.",
  },
  min: { en: "min", zh: "分鐘", vi: "phút", ja: "分", ko: "분" },
  moreFarms: {
    en: "with more farms",
    zh: "顯示更多農場",
    vi: "xem thêm nông trại",
    ja: "もっと見る",
    ko: "농장 더 보기",
  },
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
  // Only Chinese gets the original Chinese term back; every other language
  // (including vi/ja/ko, which don't have their own weather-term table yet)
  // falls back to the English translation rather than raw Chinese.
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
      if (stored && (VALID_LANGS as string[]).includes(stored)) {
        setLangState(stored as Lang);
      }
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

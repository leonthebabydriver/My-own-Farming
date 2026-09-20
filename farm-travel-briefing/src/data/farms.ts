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
  // Full address in Mandarin (county + township + the government dataset's
  // original Chinese street line), shown only when the visitor picks
  // Chinese — every other language falls back to `address` above. Not
  // every farm has this (the first 3 were hand-researched in English only).
  addressZh?: string;
  // GPS coordinates, straight from the government dataset — used to place
  // the pin on the homepage map. Missing for a handful of farms whose
  // government-listed coordinates were (0,0) or absent; those just don't
  // get a pin rather than showing one in the wrong place.
  lat?: number;
  lng?: number;
  city: string; // TDX city parameter, e.g. "Taipei"
  // A short, human-picked area label used for the homepage's location
  // filter — e.g. "Beitou", "Yangmingshan", "Zhuzihu". Not derived from the
  // address automatically, since "which area does this farm belong to" is a
  // judgment call, not a lookup.
  area: string;
  hasCafe: boolean;
  hasWorkshop: boolean;
  hasRestaurant: boolean;
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
    hasRestaurant: false,
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
    hasRestaurant: false,
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
    hasRestaurant: false,
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

  // ---------------------------------------------------------------------
  // Batch 2: Taipei / Taoyuan / Tainan, sourced from the government
  // licensed-leisure-farm dataset (data.gov.tw/dataset/24873) + TDX nearest-
  // stop computation (scripts/compute-nearest-stops.mjs) + amenity/English-
  // name research. Added 2026-09-20. hasCafe/hasWorkshop/hasRestaurant and
  // English names vary in confidence — see each farm's notes field. routes:
  // [] means the nearest stop was found manually (Google Maps) rather than
  // computed from TDX data, so no route list was pre-filled; the app still
  // resolves live routes for it automatically by stop name at request time.
  // ---------------------------------------------------------------------
  {
    id: "taipei-01",
    name: "二崎生態休閒農場",
    address: "Taipei City, Beitou District, Datun Village, Fuxing 3rd Rd., Ln. 355, No. 39",
    addressZh: "臺北市北投區大屯里復興三路355巷39號",
    lat: 25.154717,
    lng: 121.498798,
    city: "Taipei",
    area: "Beitou",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "大彎",
      routes: ["小6"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "北投區",
      countyName: "臺北市",
    },
  },
  {
    id: "taipei-02",
    name: "慈音山莊休閒農場",
    address: "Taipei City, Wenshan District, Laoquan St., Ln. 26, No. 11-2",
    addressZh: "臺北市文山區老泉街26巷11-2號",
    lat: 24.966229,
    lng: 121.566256,
    city: "Taipei",
    area: "Wenshan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "慈音山莊",
      routes: ["小11"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "文山區",
      countyName: "臺北市",
    },
  },
  {
    id: "taipei-03",
    name: "日月滿休閒農場",
    address: "Taipei City, Shilin District, Pingdeng Village, Pingjing St., No. 150",
    addressZh: "臺北市士林區平等里平菁街150號",
    lat: 25.121713,
    lng: 121.571584,
    city: "Taipei",
    area: "Shilin",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "大坪尾",
      routes: ["303"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "士林區",
      countyName: "臺北市",
    },
  },
  {
    id: "taipei-04",
    name: "杏花林休閒農場",
    address: "Taipei City, Wenshan District, Laoquan St., Ln. 45, No. 30",
    addressZh: "臺北市文山區老泉街45巷30號",
    lat: 24.96898,
    lng: 121.576574,
    city: "Taipei",
    area: "Wenshan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "杏花林(老泉里)",
      routes: ["貓空右線"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "文山區",
      countyName: "臺北市",
    },
  },
  {
    id: "taipei-05",
    name: "柏泰園休閒農場",
    address: "Taipei City, Beitou District, Lixian Rd., No. 77",
    addressZh: "臺北市北投區立賢路 77 號",
    lat: 25.114661,
    lng: 121.50099,
    city: "Taipei",
    area: "Beitou",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "北投垃圾焚化廠",
      routes: ["550"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "北投區",
      countyName: "臺北市",
    },
    notes:
      "very little public info exists for this farm",
  },
  {
    id: "taipei-06",
    name: "梅居休閒農場",
    address: "Taipei City, Shilin District, Pingdeng Village, Pingjing St., Ln. 43, No. 99",
    addressZh: "臺北市士林區平等里平菁街43巷99號",
    lat: 25.141247,
    lng: 121.575238,
    city: "Taipei",
    area: "Shilin",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: true,
    nearestStop: {
      stopName: "內寮",
      routes: ["小19"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "士林區",
      countyName: "臺北市",
    },
    notes:
      "restaurant: has an on-site vegetarian restaurant",
  },
  {
    id: "taipei-07",
    name: "清香休閒農場",
    address: "Taipei City, Neihu District, Dahu St., No. 206",
    addressZh: "臺北市內湖區大湖街206號",
    city: "Taipei",
    area: "Neihu",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "興善宮",
      routes: [],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "內湖區",
      countyName: "臺北市",
    },
    notes:
      "workshop: official gov description confirms DIY. Nearest stop confirmed by Leon 2026-09-20: 興善宮 (Xingshan Temple) - routes serving this stop still need to be filled in.",
  },
  {
    id: "taipei-08",
    name: "White Rock Organic Farm",
    nameZh: "白石森活休閒農場",
    address: "Taipei City, Neihu District, Bishan Rd., No. 58",
    addressZh: "臺北市內湖區碧山路58號",
    lat: 25.105096,
    lng: 121.594055,
    city: "Taipei",
    area: "Neihu",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "石崁",
      routes: ["小2"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "內湖區",
      countyName: "臺北市",
    },
    notes:
      "English name White Rock Organic Farm: unverified — from own site title.",
  },
  {
    id: "taipei-09",
    name: "福田園教育休閒農場",
    address: "Taipei City, Shilin District, Jingshan Rd., Ln. 131, No. 18",
    addressZh: "臺北市士林區菁山路131巷18號",
    lat: 25.14452,
    lng: 121.568367,
    city: "Taipei",
    area: "Shilin",
    hasCafe: true,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "衛星電台",
      routes: ["303"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "士林區",
      countyName: "臺北市",
    },
    notes:
      "cafe: has an on-site cafe \"楓咖啡\" per outside sources",
  },
  {
    id: "taipei-10",
    name: "老泉養生休閒農場",
    address: "Taipei City, Wenshan District, Laoquan St., Ln. 26, No. 12",
    addressZh: "臺北市文山區老泉街26巷12號",
    lat: 24.970621,
    lng: 121.568136,
    city: "Taipei",
    area: "Wenshan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: true,
    nearestStop: {
      stopName: "大春山莊",
      routes: ["小11"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "文山區",
      countyName: "臺北市",
    },
    notes:
      "restaurant: own description mentions creative dining",
  },
  {
    id: "taipei-11",
    name: "鄉村休閒農場",
    address: "Taipei City, Neihu District, Dahu St., No. 206",
    addressZh: "臺北市內湖區大湖街206號",
    lat: 25.10316,
    lng: 121.609038,
    city: "Taipei",
    area: "Neihu",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "大邱田",
      routes: ["小3"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-061",
      townshipName: "內湖區",
      countyName: "臺北市",
    },
    notes:
      "workshop: official gov description confirms DIY",
  },
  {
    id: "tainan-01",
    name: "Fairy Lake Leisure Farm",
    nameZh: "仙湖休閒農場(仙湖農場)",
    address: "Tainan City, Dongshan District, Nanshi Village, Neighborhood 1, Helaoliao, No. 6-2",
    addressZh: "臺南市東山區南勢村1鄰賀老寮6-2號",
    lat: 23.265934,
    lng: 120.48229,
    city: "Tainan",
    area: "Dongshan",
    hasCafe: true,
    hasWorkshop: false,
    hasRestaurant: true,
    nearestStop: {
      stopName: "內埔仔",
      routes: ["黃7"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "東山區",
      countyName: "臺南市",
    },
    notes:
      "English name Fairy Lake Leisure Farm: official — from government dataset.",
  },
  {
    id: "tainan-02",
    name: "南元休閒農場",
    address: "Tainan City, Liuying District, Guoyi Village, Nanhu, No. 25",
    addressZh: "臺南市柳營區果毅里南湖25號",
    lat: 23.240099,
    lng: 120.378579,
    city: "Tainan",
    area: "Liuying",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "南元農場",
      routes: ["黃2"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "柳營區",
      countyName: "臺南市",
    },
    notes:
      "own site's homepage didn't show amenity detail",
  },
  {
    id: "tainan-03",
    name: "吉園休閒農場",
    address: "Tainan City, Madou District, Nanshi Village, Zongye, No. 104-1",
    addressZh: "臺南市麻豆區南勢里總爺104-1號",
    lat: 23.187421,
    lng: 120.270826,
    city: "Tainan",
    area: "Madou",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "麻豆總爺護理之家",
      routes: ["橘10-1"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "麻豆區",
      countyName: "臺南市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "tainan-04",
    name: "DaKeng Leisure Farm",
    nameZh: "大坑休閒農場",
    address: "Tainan City, Xinhua District, Dakeng Village, No. 82",
    addressZh: "臺南市新化區大坑里82號",
    lat: 23.00722,
    lng: 120.3905,
    city: "Tainan",
    area: "Xinhua",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: true,
    nearestStop: {
      stopName: "大坑休閒農場",
      routes: ["綠13"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "新化區",
      countyName: "臺南市",
    },
    notes:
      "restaurant: confirmed on own site English name DaKeng Leisure Farm: from own site title.",
  },
  {
    id: "tainan-05",
    name: "臺南鴨莊休閒農場",
    address: "Tainan City, Guantian District, Duba Village, Sankuaicuo, No. 178-1",
    addressZh: "臺南市官田區渡拔里三塊厝178-1號",
    lat: 23.173516,
    lng: 120.338286,
    city: "Tainan",
    area: "Guantian",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "渡子頭",
      routes: ["橘4"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "官田區",
      countyName: "臺南市",
    },
    notes:
      "workshop/restaurant: confirmed on own site",
  },
  {
    id: "tainan-06",
    name: "走馬瀨休閒農場",
    address: "Tainan City, Danei District, Erxi Village, Qiziwa, No. 60",
    addressZh: "臺南市大內區二溪里唭子瓦60號",
    lat: 23.122445,
    lng: 120.418478,
    city: "Tainan",
    area: "Danei",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "其子瓦(舊社1)",
      routes: ["橘21"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "大內區",
      countyName: "臺南市",
    },
    notes:
      "workshop/restaurant: confirmed on own site",
  },
  {
    id: "tainan-07",
    name: "關子嶺開心休閒農場",
    address: "Tainan City, Baihe District, Guanling Village, Neighborhood 8, Nanliao, No. 19-16",
    addressZh: "臺南市白河區關嶺里8鄰南寮19之16號",
    lat: 23.322287,
    lng: 120.495783,
    city: "Tainan",
    area: "Baihe",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "坪頂三龍宮",
      routes: ["黃12-1"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-077",
      townshipName: "白河區",
      countyName: "臺南市",
    },
    notes:
      "site unreachable (expired SSL cert)",
  },
  {
    id: "taoyuan-01",
    name: "九斗休閒農場",
    address: "Taoyuan City, Xinwu District, Jiudou Village, Wugu Rd., No. 205",
    addressZh: "桃園市新屋區九斗里五谷路205號",
    lat: 24.960752,
    lng: 121.128945,
    city: "Taoyuan",
    area: "Xinwu",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "九斗合作農場",
      routes: ["T602"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "新屋區",
      countyName: "桃園市",
    },
    notes:
      "workshop: own site confirms DIY",
  },
  {
    id: "taoyuan-02",
    name: "千郁休閒農場",
    address: "Taoyuan City, Luzhu District, Kengzi Village, Bade 2nd Rd., No. 288",
    addressZh: "桃園市蘆竹區坑子里八德二路288號",
    lat: 25.069672,
    lng: 121.339338,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "茶工廠",
      routes: ["5069"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "workshop: from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-03",
    name: "向陽休閒農場",
    address: "Taoyuan City, Guanyin District, Lanpu Village, Neighborhood 11, No. 52",
    addressZh: "桃園市觀音區藍埔里11鄰52號",
    lat: 25.007832,
    lng: 121.111642,
    city: "Taoyuan",
    area: "Guanyin",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "向陽農場",
      routes: ["T518"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "觀音區",
      countyName: "桃園市",
    },
    notes:
      "site unreachable (SSL error) — workshop/restaurant from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-04",
    name: "圓康休閒農場",
    address: "Taoyuan City, Longtan District, Daping Village, Minzhishi 6th St., Ln. 87, Aly. 49, No. 71",
    addressZh: "桃園市龍潭區大平里民治十六街87巷49弄71號",
    city: "Taoyuan",
    area: "Longtan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "民治七街口",
      routes: [],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "龍潭區",
      countyName: "桃園市",
    },
    notes:
      "Nearest stop confirmed by Leon 2026-09-20: 民治七街口 (Minzhi 7th St. Intersection)",
  },
  {
    id: "taoyuan-05",
    name: "大吾疆莊園休閒農場(皇家薇庭)",
    address: "Taoyuan City, Taoyuan District, Zhuangjing Rd., Sec. 2, No. 369",
    addressZh: "桃園市桃園區莊敬路二段369號",
    lat: 25.018807,
    lng: 121.287625,
    city: "Taoyuan",
    area: "Taoyuan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "銀店埤",
      routes: ["L111"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "桃園區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-06",
    name: "大溪花海休閒農場",
    address: "Taoyuan City, Daxi District, Fuxing Rd., Sec. 1, Ln. 1093, No. 29",
    addressZh: "桃園市大溪區復興路一段1093巷29號",
    lat: 24.84232,
    lng: 121.291208,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "慈湖",
      routes: ["501", "502", "506"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "site unreachable (server error)",
  },
  {
    id: "taoyuan-07",
    name: "Goodtimes",
    nameZh: "好時節休閒農場",
    address: "Taoyuan City, Daxi District, Kangzhuang Rd., Sec. 3, No. 225",
    addressZh: "桃園市大溪區康莊路三段225號",
    lat: 24.854354,
    lng: 121.28211,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "頂埔尾",
      routes: ["5110", "5110A"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "English name Goodtimes: from own site title.",
  },
  {
    id: "taoyuan-08",
    name: "Tomita",
    nameZh: "富田香草休閒農場",
    address: "Taoyuan City, Daxi District, Fuan Village, Touliao 1st Rd., Ln. 29, No. 59",
    addressZh: "桃園市大溪區福安里頭寮一路29巷59號",
    lat: 24.839922,
    lng: 121.284528,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: true,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "頭寮城",
      routes: ["5097"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "English name Tomita: unverified — own brand name used on site.",
  },
  {
    id: "taoyuan-09",
    name: "小人國休閒農場(ARCADIA覓秘午憩)",
    address: "Taoyuan City, Longtan District, Gaoyuan Rd., No. 980",
    addressZh: "桃園市龍潭區高原路980號",
    lat: 24.829677,
    lng: 121.192854,
    city: "Taoyuan",
    area: "Longtan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "高原",
      routes: ["5653"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "龍潭區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-10",
    name: "小木屋休閒農場",
    address: "Taoyuan City, Luzhu District, Kengzi Village, Maoweiqi, Neighborhood 12, No. 1-6",
    addressZh: "桃園市蘆竹區坑子村貓尾崎12鄰1-6號",
    lat: 25.081659,
    lng: 121.344692,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "愛民",
      routes: ["5071", "5071B"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "no info found beyond gov listing",
  },
  {
    id: "taoyuan-11",
    name: "山裡生活自然休閒農場",
    address: "Taoyuan City, Fuxing District, Dawo Rd., No. 601",
    addressZh: "桃園市復興區大窩路601號",
    lat: 24.838796,
    lng: 121.358972,
    city: "Taoyuan",
    area: "Fuxing",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "蝙蝠洞",
      routes: ["5107", "5107A", "5107B", "5107C"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "復興區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-12",
    name: "康田休閒農場",
    address: "Taoyuan City, Daxi District, Ruiyuan Village, Luoyusong Rd., No. 100",
    addressZh: "桃園市大溪區瑞源里落羽松路100號",
    lat: 24.870738,
    lng: 121.256832,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "配銷所",
      routes: ["5044", "5050", "5056", "725"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-13",
    name: "戀戀空港灣休閒農場",
    address: "Taoyuan City, Luzhu District, Kengkou Village, Xiaogushan Rd., No. 183-1",
    addressZh: "桃園市蘆竹區坑口里小古山路183-1號",
    lat: 25.108111,
    lng: 121.285425,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: true,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "出水坑",
      routes: ["5020"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "cafe: from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-14",
    name: "捷美休閒農場",
    address: "Taoyuan City, Guanyin District, Daku Village, Neighborhood 6, Xinhua Rd., Sec. 2, No. 41",
    addressZh: "桃園市觀音區大堀里6鄰新華路二段41號",
    city: "Taoyuan",
    area: "Guanyin",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "大堀活動中心",
      routes: [],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "觀音區",
      countyName: "桃園市",
    },
    notes:
      "Nearest stop confirmed by Leon 2026-09-20: 大堀活動中心",
  },
  {
    id: "taoyuan-15",
    name: "曦之麗休閒農場",
    address: "Taoyuan City, Yangmei District, Zhaomen Rd.",
    addressZh: "桃園市楊梅區楊梅照門道路",
    lat: 24.887924,
    lng: 121.147664,
    city: "Taoyuan",
    area: "Yangmei",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "八方園餐廳",
      routes: ["L615"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "楊梅區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-16",
    name: "林家古厝休閒農場",
    address: "Taoyuan City, Guanyin District, Dafu Rd., No. 221",
    addressZh: "桃園市觀音區大富路221號",
    lat: 24.998836,
    lng: 121.128688,
    city: "Taoyuan",
    area: "Guanyin",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: true,
    nearestStop: {
      stopName: "大田蓮園",
      routes: ["T513", "T518"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "觀音區",
      countyName: "桃園市",
    },
    notes:
      "workshop/restaurant: own site (shared w/ 捷美)",
  },
  {
    id: "taoyuan-17",
    name: "桃蘆坑休閒農場",
    address: "Taoyuan City, Luzhu District, Shanlin Rd., Sec. 3, No. 855-1",
    addressZh: "桃園市蘆竹區山林路三段855-1號",
    lat: 25.078933,
    lng: 121.3323,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: true,
    nearestStop: {
      stopName: "土地公口",
      routes: ["5071", "5071B"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "restaurant: from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-18",
    name: "樺音山莊休閒農場",
    address: "Taoyuan City, Fuxing District, Sanmin Village, Jiguopai Rd., Ln. 162, No. 230",
    addressZh: "桃園市復興區三民里基國派路162巷230號",
    lat: 24.833305,
    lng: 121.341548,
    city: "Taoyuan",
    area: "Fuxing",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "王厝",
      routes: ["5107", "5107B", "5107C", "F906"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "復興區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-19",
    name: "水月休閒農場(水悅莊園)",
    address: "Taoyuan City, Zhongli District, Sanmin Village, Daxiang St., No. 218",
    addressZh: "桃園市中壢區三民里大享街218號",
    lat: 24.972983,
    lng: 121.191717,
    city: "Taoyuan",
    area: "Zhongli",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "中大湖",
      routes: ["133", "133A", "173"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "中壢區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-20",
    name: "江陵日觀休閒農場",
    address: "Taoyuan City, Yangmei District, Xigaoshanding, No. 15-2",
    addressZh: "桃園市楊梅區西高山頂15-2號",
    lat: 24.929968,
    lng: 121.135136,
    city: "Taoyuan",
    area: "Yangmei",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "童話森林社區",
      routes: ["L613"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "楊梅區",
      countyName: "桃園市",
    },
    notes:
      "their link is broken/dead",
  },
  {
    id: "taoyuan-21",
    name: "泉園休閒農場",
    address: "Taoyuan City, Luzhu District, Kengkou Village, Xiaogushan Rd., No. 183",
    addressZh: "桃園市蘆竹區坑口里小古山路183號",
    lat: 25.108567,
    lng: 121.284728,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "出水坑",
      routes: ["5020"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-22",
    name: "海灣星空休閒農場",
    address: "Taoyuan City, Luzhu District, Xiaogushan Rd., No. 38",
    addressZh: "桃園市蘆竹區小古山路38號",
    lat: 25.102879,
    lng: 121.290704,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "蘆竹老人長期照顧中心",
      routes: ["L309", "L309A", "L309B"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "their listed URL now points to a different, unrelated farm — data may be stale",
  },
  {
    id: "taoyuan-23",
    name: "石門森林休閒農場",
    address: "Taoyuan City, Daxi District, Sanceng Sec., Amuping Sub-sec. (land-lot address, no street number)",
    addressZh: "桃園市大溪區三層段阿姆坪小段",
    lat: 24.816451,
    lng: 121.309036,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "阿姆坪碼頭",
      routes: ["5099", "5099A"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "workshop: from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-24",
    name: "竹峰茗茶休閒農場",
    address: "Taoyuan City, Luzhu District, Kengzi Village, Neighborhood 12, Maoweiqi, No. 1",
    addressZh: "桃園市蘆竹區坑子里12鄰貓尾崎1號",
    lat: 25.08246,
    lng: 121.346805,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: false,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "井仔厝",
      routes: ["5069", "5071", "5071B"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "workshop: from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-25",
    name: "維多利亞休閒農場",
    address: "Taoyuan City, Taoyuan District, Minzu Rd., No. 669",
    addressZh: "桃園市桃園區民族路669號",
    lat: 24.829964,
    lng: 121.233664,
    city: "Taoyuan",
    area: "Taoyuan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "里界",
      routes: ["5049"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "桃園區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-26",
    name: "蓮荷園休閒農場",
    address: "Taoyuan City, Guanyin District, Lanpu Village, Jinhua Rd., No. 690",
    addressZh: "桃園市觀音區藍埔里金華路690號",
    lat: 25.01296,
    lng: 121.115828,
    city: "Taoyuan",
    area: "Guanyin",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "向陽農場",
      routes: ["T518"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "觀音區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-27",
    name: "蘆菴休閒農場",
    address: "Taoyuan City, Longtan District, Shanghua Village, Neighborhood 2, Dashun Rd., No. 369",
    addressZh: "桃園市龍潭區上華里2鄰大順路369號",
    lat: 24.853516,
    lng: 121.220815,
    city: "Taoyuan",
    area: "Longtan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "雙連街口",
      routes: ["5044", "5048", "5049", "5051", "5055"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "龍潭區",
      countyName: "桃園市",
    },
    notes:
      "own site says meals not included",
  },
  {
    id: "taoyuan-28",
    name: "蘇家莊園休閒農場",
    address: "Taoyuan City, Daxi District, Fuan Village, Neighborhood 3, Fuxing Rd., Sec. 1, No. 997",
    addressZh: "桃園市大溪區福安里3鄰復興路一段997號",
    lat: 24.841902,
    lng: 121.288385,
    city: "Taoyuan",
    area: "Daxi",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "草嶺",
      routes: ["5090", "5091", "5093", "5094", "5099", "5104", "5104A", "5104B", "5105", "5106", "5106A", "5106B", "5107", "5107A", "5107C", "5109"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大溪區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-29",
    name: "虎頭山休閒農場",
    address: "Taoyuan City, Taoyuan District, Chenggong Rd., Sec. 3, Ln. 821, No. 66",
    addressZh: "桃園市桃園區成功路三段821巷66號",
    lat: 25.016734,
    lng: 121.327195,
    city: "Taoyuan",
    area: "Taoyuan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "虎頭山環保公園",
      routes: ["213"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "桃園區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-30",
    name: "豐田休閒農場",
    address: "Taoyuan City, Luzhu District, Kengzi Village, Shanlin Rd., Sec. 3, Ln. 332, Aly. 51, No. 22",
    addressZh: "桃園市蘆竹區坑子里山林路三段332巷51弄22號",
    lat: 25.078311,
    lng: 121.324412,
    city: "Taoyuan",
    area: "Luzhu",
    hasCafe: true,
    hasWorkshop: true,
    hasRestaurant: false,
    nearestStop: {
      stopName: "公田",
      routes: ["5071", "5071A"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "蘆竹區",
      countyName: "桃園市",
    },
    notes:
      "from gov description text only, lower confidence",
  },
  {
    id: "taoyuan-31",
    name: "陽榮休閒農場",
    address: "Taoyuan City, Dayuan District, Huaxing Rd., Sec. 2, No. 2",
    addressZh: "桃園市大園區華興路二段2號",
    lat: 25.048184,
    lng: 121.198595,
    city: "Taoyuan",
    area: "Dayuan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "頂莊",
      routes: ["5081C"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "大園區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
  {
    id: "taoyuan-32",
    name: "龍潭快樂休閒農場",
    address: "Taoyuan City, Longtan District, Chenggong Rd., Ln. 377, Aly. 46, No. 155-1",
    addressZh: "桃園市龍潭區成功路377巷46弄155-1號",
    lat: 24.883689,
    lng: 121.227737,
    city: "Taoyuan",
    area: "Longtan",
    hasCafe: false,
    hasWorkshop: false,
    hasRestaurant: false,
    nearestStop: {
      stopName: "伯公下",
      routes: ["5645", "5672"],
    },
    weather: {
      countyForecastDatasetId: "F-D0047-005",
      townshipName: "龍潭區",
      countyName: "桃園市",
    },
    notes:
      "no web presence found",
  },
];

export function getFarmById(id: string): Farm | undefined {
  return farms.find((f) => f.id === id);
}

/** Distinct area labels across all farms, for the location filter dropdown. */
export function getAllAreas(): string[] {
  return Array.from(new Set(farms.map((f) => f.area))).sort();
}

/**
 * Area labels grouped by city, for a two-level (city -> district) location
 * filter — e.g. { Taipei: ["Beitou", "Shilin", ...], Taoyuan: [...] }.
 * Cities and, within each city, areas are both alphabetical.
 */
export function getAreasByCity(): { city: string; areas: string[] }[] {
  const byCity = new Map<string, Set<string>>();
  for (const f of farms) {
    if (!byCity.has(f.city)) byCity.set(f.city, new Set());
    byCity.get(f.city)!.add(f.area);
  }
  return Array.from(byCity.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([city, areas]) => ({
      city,
      areas: Array.from(areas).sort(),
    }));
}

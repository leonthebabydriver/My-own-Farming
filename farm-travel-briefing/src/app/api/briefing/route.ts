import { NextRequest, NextResponse } from "next/server";
import { getBusEtaByStopName } from "@/lib/tdx";
import { getTownshipForecast, getWarningsRaw, summarizeUpcoming } from "@/lib/cwa";
import { getFarmById, farms } from "@/data/farms";

/**
 * GET /api/briefing?farmId=jaifu-garden
 *
 * Combines the two verified data sources (TDX live bus ETAs, CWA weather)
 * into one response for a given farm. This is what the browser page at
 * /briefing?farmId=... renders. Each half is fetched independently and
 * failures don't take down the other — if TDX is down but CWA is fine (or
 * vice versa), you still get a partial, honest briefing rather than a
 * blank error page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  if (!farmId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing farmId query param.",
        availableFarms: farms.map((f) => ({ id: f.id, name: f.name })),
      },
      { status: 400 }
    );
  }

  const farm = getFarmById(farmId);

  if (!farm) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown farmId "${farmId}".`,
        availableFarms: farms.map((f) => ({ id: f.id, name: f.name })),
      },
      { status: 404 }
    );
  }

  const [transportResult, weatherResult] = await Promise.allSettled([
    getBusEtaByStopName(farm.city, farm.nearestStop.stopName),
    (async () => {
      const forecast = await getTownshipForecast(
        farm.weather.countyForecastDatasetId,
        farm.weather.townshipName
      );
      const warningsRaw = await getWarningsRaw();
      return {
        summary: forecast ? summarizeUpcoming(forecast) : [],
        warningsRaw,
      };
    })(),
  ]);

  return NextResponse.json({
    ok: true,
    farm: {
      id: farm.id,
      name: farm.name,
      nameZh: farm.nameZh,
      address: farm.address,
      addressZh: farm.addressZh,
    },
    transport:
      transportResult.status === "fulfilled"
        ? { ok: true, stopName: farm.nearestStop.stopName, ...transportResult.value }
        : { ok: false, error: String(transportResult.reason) },
    weather:
      weatherResult.status === "fulfilled"
        ? { ok: true, township: farm.weather.townshipName, ...weatherResult.value }
        : { ok: false, error: String(weatherResult.reason) },
  });
}

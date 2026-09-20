import { NextRequest, NextResponse } from "next/server";
import { getTownshipForecast, getWarningsRaw, summarizeUpcoming } from "@/lib/cwa";
import { getFarmById, farms } from "@/data/farms";

/**
 * GET /api/cwa/farm-weather?farmId=jaifu-garden
 *
 * Looks up the farm's curated township (src/data/farms.ts) and returns:
 * - `forecast`: the FULL 3-day, hourly-ish forecast for that township,
 *   every element, every time slot, unmodified — the complete raw picture.
 * - `summary`: the same data collapsed to one "right now / very soon"
 *   value per element, for quick-glance use (e.g. a "leave by" alert).
 *   This is derived from `forecast`, not a separate fetch — nothing is
 *   trimmed from the full data to produce it.
 * - `warningsRaw`: the full weather-warnings dataset, so we can see for
 *   ourselves whether this farm's county currently has any active warning.
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

  try {
    const [forecast, warningsRaw] = await Promise.all([
      getTownshipForecast(
        farm.weather.countyForecastDatasetId,
        farm.weather.townshipName
      ),
      getWarningsRaw(),
    ]);

    const summary = forecast ? summarizeUpcoming(forecast) : [];

    return NextResponse.json({
      ok: true,
      farm: { id: farm.id, name: farm.name, nameZh: farm.nameZh },
      township: farm.weather.townshipName,
      county: farm.weather.countyName,
      summary,
      forecast,
      warningsRaw,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

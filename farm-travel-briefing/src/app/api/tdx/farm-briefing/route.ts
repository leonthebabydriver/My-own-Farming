import { NextRequest, NextResponse } from "next/server";
import { getBusEtaByStopName } from "@/lib/tdx";
import { getFarmById, farms } from "@/data/farms";

/**
 * GET /api/tdx/farm-briefing?farmId=jaifu-garden
 *
 * Looks up the farm's curated nearest stop (src/data/farms.ts) and returns
 * live bus ETAs for it — no manual stop searching required. This is the
 * shape the eventual visitor-facing "Travel Briefing" will be built on.
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
    const { results, withEta, total } = await getBusEtaByStopName(
      farm.city,
      farm.nearestStop.stopName
    );

    return NextResponse.json({
      ok: true,
      farm: {
        id: farm.id,
        name: farm.name,
        nameZh: farm.nameZh,
        address: farm.address,
      },
      nearestStop: farm.nearestStop,
      count: total,
      withEta,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

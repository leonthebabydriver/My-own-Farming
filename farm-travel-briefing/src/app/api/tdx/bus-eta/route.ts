import { NextRequest, NextResponse } from "next/server";
import { getBusEtaByStopName } from "@/lib/tdx";

/**
 * GET /api/tdx/bus-eta?city=Taipei&stopName=陽明山
 *
 * Free-text test endpoint: fetches live bus ETAs for stops whose name
 * contains `stopName`, in the given city. Useful for finding a farm's
 * nearest stop during setup. For a known farm, use
 * /api/tdx/farm-briefing?farmId=... instead — see src/data/farms.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "Taipei";
  const stopName = searchParams.get("stopName") ?? "陽明山";

  try {
    const { results, withEta, total } = await getBusEtaByStopName(
      city,
      stopName
    );

    return NextResponse.json({
      ok: true,
      city,
      stopNameQuery: stopName,
      count: total,
      withEta,
      results: results.slice(0, 30),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { claimRosterRefresh, refreshRoster } from "@/lib/refresh";

export const maxDuration = 60;

/**
 * Called by the page when it loads, so a reload shows new games without waiting
 * for the cron. Public on purpose: the shared cooldown bounds what it can cost
 * however often it's called. Answers with the ids of the players it recomputed.
 */
export async function POST(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  if (game !== "lol" && game !== "tft") {
    return NextResponse.json({ error: "game debe ser lol o tft" }, { status: 400 });
  }

  try {
    if (!(await claimRosterRefresh(game))) return NextResponse.json({ updated: [] });
    const results = await refreshRoster(game);
    const updated = results.filter((r) => r.ok && !r.skipped).map((r) => r.id);
    return NextResponse.json({ updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

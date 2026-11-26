import { NextRequest, NextResponse, after } from "next/server";
import { claimRosterRefresh, refreshRoster, type GameName } from "@/lib/refresh";

export const maxDuration = 60;

/**
 * Runs the same per-player stats computation the site does on page load, but
 * on a schedule (cron-job.org calls this route) instead of only when a
 * visitor has a tab open. This is what makes LP-per-match tracking and the
 * TFT match-history backfill reliable: Riot never exposes LP gained in a
 * single match directly, so trackLpPerMatch has to see the roster often
 * enough that at most one new ranked game appears between checks — otherwise
 * it can't tell which game caused the LP change and leaves it blank.
 *
 * `?game=lol` or `?game=tft` refreshes only that roster. The workflow calls
 * both in parallel as separate requests — as the tracked roster grew, doing
 * LoL and TFT together in one request (even though they already ran
 * concurrently inside it) started occasionally missing Vercel's 60s
 * (Hobby-plan) function timeout. Splitting them gives each its own 60s
 * budget instead of sharing one. Omitting the param keeps the old combined
 * behavior for manual/browser testing.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const game = req.nextUrl.searchParams.get("game");
  const requested: GameName[] = game === "lol" || game === "tft" ? [game] : ["lol", "tft"];

  // A page load may have refreshed a game moments ago; running it again would
  // only risk Riot's rate limit.
  const claims = await Promise.all(requested.map(claimRosterRefresh));
  const running = requested.filter((_, i) => claims[i]);

  // Respond right away and do the Riot calls after the response is sent.
  // External schedulers (cron-job.org's free plan cuts requests off at 30s)
  // would otherwise time out while the refresh is still running. The work
  // keeps its own maxDuration budget inside after().
  after(async () => {
    const results = (await Promise.all(running.map(refreshRoster))).flat();
    const failed = results.filter((r) => !r.ok);
    const skipped = results.filter((r) => r.skipped).length;
    console.log(
      `[cron/refresh] game=${game ?? "all"} ran=${running.join(",") || "none"} players=${results.length} unchanged=${skipped} failed=${failed.length}`,
      failed.length ? JSON.stringify(failed) : ""
    );
  });

  return NextResponse.json({ accepted: true, game: game ?? "all", running });
}

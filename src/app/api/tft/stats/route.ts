import { NextRequest, NextResponse } from "next/server";
import { getTftRankedEntries, getTftRecentMatches } from "@/lib/riot";
import { getCachedStats, setCachedStats, trackLpPerMatch } from "@/lib/kv";
import { totalLp } from "@/lib/rank";
import type { TftStats } from "@/lib/tft";

// Shared across every viewer so concurrent page loads (and the client's own
// poll interval) don't each hit the Riot API for the same data. Matches the
// client's polling cadence so a cache-miss recompute happens roughly once
// per poll cycle instead of piling up extra ones inside the same window.
const STATS_CACHE_TTL_SECONDS = 20 * 60;
const DISPLAY_MATCH_COUNT = 10;

export async function GET(req: NextRequest) {
  const puuid = req.nextUrl.searchParams.get("puuid");
  const region = req.nextUrl.searchParams.get("region");

  if (!puuid || !region) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  // v2: the response gained lobby data and a summary, so bodies cached under
  // the old key would render as an empty match list until they expired.
  const cacheKey = `tft-stats-cache:v2:${puuid}:${region}`;
  const cached = await getCachedStats(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const [ranked, recent] = await Promise.all([
      getTftRankedEntries(puuid, region),
      getTftRecentMatches(puuid, region),
    ]);

    // Only standard ranked LP can be attributed to the ranked matches shown;
    // the Double Up fallback entry climbs on a separate ladder.
    const currentTotalLp = ranked?.queueType === "RANKED_TFT" ? totalLp(ranked) : null;
    const lpDeltas =
      currentTotalLp !== null
        ? await trackLpPerMatch(
            puuid,
            recent.matches.map((m) => m.matchId),
            currentTotalLp,
            "tft"
          )
        : {};

    // In TFT ranked, Riot counts every top-4 finish as a "win".
    const rankedGames = ranked ? ranked.wins + ranked.losses : 0;

    const responseBody: NonNullable<TftStats> = {
      ranked,
      summary: {
        games: recent.sampleSize,
        avgPlacement: recent.avgPlacement,
        winRate: recent.winRate,
        top4Rate: ranked && rankedGames > 0 ? ranked.wins / rankedGames : null,
      },
      matches: recent.matches.slice(0, DISPLAY_MATCH_COUNT).map((m) => ({
        ...m,
        lpChange: lpDeltas[m.matchId] ?? null,
      })),
    };

    await setCachedStats(cacheKey, responseBody, STATS_CACHE_TTL_SECONDS);
    return NextResponse.json(responseBody);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

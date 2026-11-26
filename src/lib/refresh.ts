import {
  claimRefresh,
  getPlayers,
  getRefreshState,
  setRefreshState,
  touchCachedStats,
  type Player,
} from "@/lib/kv";
import {
  STATS_CACHE_TTL_SECONDS,
  checkLolPlayer,
  checkTftPlayer,
  computeLolStats,
  computeTftStats,
  lolStatsCacheKey,
  tftStatsCacheKey,
} from "@/lib/statsService";

export type GameName = "lol" | "tft";

const PLAYERS_KEYS: Record<GameName, string> = { lol: "players:lol", tft: "players:tft" };

// Minimum gap between two runs for the same game. A run asks Riot about every
// player (about 70 calls for 24 of them) and a personal key allows 100 every two
// minutes, so two runs must never land closer together than that.
const COOLDOWN_SECONDS = 3 * 60;

// An unchanged player's cached stats get their expiry extended this often,
// comfortably before STATS_CACHE_TTL_SECONDS runs out.
const TOUCH_AFTER_MS = 2 * 60 * 60 * 1000;

export type RefreshResult = { id: string; ok: boolean; skipped?: boolean; error?: string };

type Game<Profile> = {
  name: "lol" | "tft";
  cacheKey: (puuid: string, region: string) => string;
  check: (puuid: string, region: string) => Promise<{ signature: string; profile: Profile }>;
  // Resolves to false while the result is still partial and needs another run.
  compute: (puuid: string, region: string, profile: Profile) => Promise<boolean>;
};

/**
 * Refreshes every tracked player one at a time instead of in parallel.
 * Riot's per-key rate limit is shared across every player in the group, so
 * bursting N requests at once is what used to trip it when several browser
 * tabs polled together; a small stagger here keeps a single cron run safe
 * even as the roster grows.
 *
 * Players with nothing new are skipped: recomputing everyone on every run is
 * what used up Redis's monthly bandwidth in a few days.
 */
async function refreshAll<Profile>(
  players: Player[],
  game: Game<Profile>
): Promise<RefreshResult[]> {
  if (players.length === 0) return [];
  const state = await getRefreshState(game.name);
  let stateChanged = false;
  const results: RefreshResult[] = [];

  for (const { id, puuid, region } of players) {
    try {
      const { signature, profile } = await game.check(puuid, region);
      const previous = state[puuid];
      const unchanged = previous?.signature === signature;

      if (unchanged && Date.now() - previous.touchedAt < TOUCH_AFTER_MS) {
        results.push({ id, ok: true, skipped: true });
      } else if (
        unchanged &&
        (await touchCachedStats(game.cacheKey(puuid, region), STATS_CACHE_TTL_SECONDS))
      ) {
        state[puuid] = { signature, touchedAt: Date.now() };
        stateChanged = true;
        results.push({ id, ok: true, skipped: true });
      } else {
        if (await game.compute(puuid, region, profile)) {
          state[puuid] = { signature, touchedAt: Date.now() };
        } else {
          delete state[puuid];
        }
        stateChanged = true;
        results.push({ id, ok: true });
      }
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (stateChanged) await setRefreshState(game.name, state);
  return results;
}

type ProfileOf<Check extends (...args: never[]) => Promise<{ profile: unknown }>> = Awaited<
  ReturnType<Check>
>["profile"];

const LOL_GAME: Game<ProfileOf<typeof checkLolPlayer>> = {
  name: "lol",
  cacheKey: (puuid, region) => lolStatsCacheKey(puuid, region),
  check: checkLolPlayer,
  compute: async (puuid, region, profile) => {
    await computeLolStats(puuid, region, profile);
    return true;
  },
};

const TFT_GAME: Game<ProfileOf<typeof checkTftPlayer>> = {
  name: "tft",
  cacheKey: (puuid, region) => tftStatsCacheKey(puuid, region),
  check: checkTftPlayer,
  compute: async (puuid, region, profile) =>
    !(await computeTftStats(puuid, region, profile)).incomplete,
};

/** False if this game was refreshed (or is being refreshed) moments ago. */
export function claimRosterRefresh(game: GameName): Promise<boolean> {
  return claimRefresh(game, COOLDOWN_SECONDS);
}

/** Brings every player of one game up to date. Claim the run first. */
export async function refreshRoster(game: GameName): Promise<RefreshResult[]> {
  const players = await getPlayers(PLAYERS_KEYS[game]);
  return game === "lol" ? refreshAll(players, LOL_GAME) : refreshAll(players, TFT_GAME);
}

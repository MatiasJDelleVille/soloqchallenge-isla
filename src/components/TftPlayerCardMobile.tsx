"use client";

import type { Player } from "@/lib/kv";
import type { TftStats } from "./TftPlayerRow";
import LpGapBox, { type LpGap } from "./LpGapBox";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function placementColor(placement: number) {
  if (placement <= 4) return "text-emerald-400";
  return "text-red-400";
}

// MetaTFT uses its own short region slugs instead of Riot's platform ids.
const PLATFORM_TO_METATFT: Record<string, string> = {
  na1: "na",
  br1: "br",
  la1: "lan",
  la2: "las",
  oc1: "oce",
  euw1: "euw",
  eun1: "eune",
  tr1: "tr",
  ru: "ru",
  kr: "kr",
  jp1: "jp",
};

export default function TftPlayerCardMobile({
  rank,
  player,
  stats,
  error,
  loading,
  lpGap,
  expanded,
  onToggle,
}: {
  rank: number;
  player: Player;
  stats: TftStats;
  error: string | null;
  loading: boolean;
  lpGap: LpGap;
  expanded: boolean;
  onToggle: () => void;
}) {
  const total = stats?.ranked ? stats.ranked.wins + stats.ranked.losses : 0;
  const winrate = total > 0 ? Math.round((stats!.ranked!.wins / total) * 100) : null;
  const avgPlacement =
    stats?.matches && stats.matches.length > 0
      ? (
          stats.matches.reduce((acc, m) => acc + m.placement, 0) / stats.matches.length
        ).toFixed(1)
      : null;

  // MetaTFT uses its own short region slugs instead of Riot's platform ids.
  const region = PLATFORM_TO_METATFT[player.region] ?? player.region;
  const metaTftUrl = `https://www.metatft.com/player/${region}/${encodeURIComponent(
    player.game_name
  )}-${encodeURIComponent(player.tag_line)}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div onClick={onToggle} className="flex items-center gap-3 p-4 cursor-pointer">
        <span className="text-white/40 font-mono w-5 shrink-0">{rank}</span>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">
            {player.game_name}
            <span className="text-white/40">#{player.tag_line}</span>
          </p>
          {loading && <p className="text-sm text-white/40">Cargando...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {stats?.ranked ? (
            <p className="text-sm text-white/60">
              {stats.ranked.tier} {stats.ranked.rank} ({stats.ranked.leaguePoints} LP)
            </p>
          ) : (
            stats && <p className="text-sm text-white/40">Sin ranked</p>
          )}
        </div>

        <LpGapBox {...lpGap} />

        <a
          href={metaTftUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Ver en MetaTFT"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition shrink-0 p-1.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.metatft.com/myicon3.ico"
            alt="MetaTFT"
            className="w-full h-full object-contain"
          />
        </a>
      </div>

      {(stats?.ranked || avgPlacement) && (
        <div className="flex items-center gap-4 px-4 pb-4 -mt-1 flex-wrap">
          {stats?.ranked && (
            <>
              <span className="text-white font-bold text-lg">{winrate}%</span>
              <span className="text-emerald-400">W: {stats.ranked.wins}</span>
              <span className="text-red-400">L: {stats.ranked.losses}</span>
            </>
          )}
          {avgPlacement && (
            <span className="text-white/60">AVG Placement: {avgPlacement}</span>
          )}
        </div>
      )}

      {expanded && stats?.matches && (
        <div className="border-t border-white/10 p-3 flex flex-col gap-2">
          {stats.matches.length === 0 && (
            <p className="text-white/40 px-1">Sin partidas recientes</p>
          )}
          {stats.matches.map((m) => (
            <div
              key={m.matchId}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg w-8 ${placementColor(m.placement)}`}>
                  #{m.placement}
                </span>
                <div>
                  <p className="text-white font-medium">Nivel {m.level}</p>
                  <p className="text-sm text-white/40">
                    {formatDuration(m.gameLengthSeconds)}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-medium ${placementColor(m.placement)}`}>
                {m.placement <= 4 ? "Top 4" : "Bottom 4"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

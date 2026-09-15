"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { TftLobbyPlayer, TftMatch, TftTrait, TftUnit } from "@/lib/tft";

const PLACEMENT_COLORS: Record<number, string> = {
  1: "#f2c14e",
  2: "#c5ccd4",
  3: "#c98a53",
  4: "#4e9b7e",
};

function placementColor(placement: number) {
  return PLACEMENT_COLORS[placement] ?? "#5c5f6a";
}

const COST_COLORS: Record<number, string> = {
  1: "#8d939c",
  2: "#1faa7b",
  3: "#2f82d8",
  4: "#b252dc",
  5: "#efb43b",
};

function costColor(cost: number) {
  return COST_COLORS[cost] ?? "#e8505b";
}

// Riot trait style: 1 bronze, 2 silver, 3 gold (also unique single-unit traits), 4 prismatic.
const TRAIT_STYLE_COLORS: Record<number, string> = {
  1: "#a8703f",
  2: "#98a3ad",
  3: "#d9ad3f",
  4: "#b77cf0",
};

function stageLabel(lastRound: number) {
  if (lastRound <= 4) return `1-${lastRound}`;
  const r = lastRound - 5;
  return `${Math.floor(r / 7) + 2}-${(r % 7) + 1}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 60) return `hace ${Math.max(minutes, 1)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

function SwordsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-[#c9cbd1]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 4l9 9M20 4l-9 9M7 17l-3 3M17 17l3 3M6 14l4 4M18 14l-4 4" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <ellipse cx="12" cy="15" rx="8" ry="4.5" fill="#a9812a" />
      <ellipse cx="12" cy="12" rx="8" ry="4.5" fill="#e8b84a" />
      <ellipse cx="12" cy="12" rx="5" ry="2.6" fill="#f6d57f" />
    </svg>
  );
}

function TraitChip({ trait }: { trait: TftTrait }) {
  return (
    <span
      title={`${trait.displayName} (${trait.numUnits})`}
      className="inline-flex items-center gap-0.5 h-[22px] pl-0.5 pr-1 rounded-[4px] border bg-[#25262c] text-[11px] font-semibold text-[#d7d8dc]"
      style={{ borderColor: TRAIT_STYLE_COLORS[trait.style] ?? "#5c5f6a" }}
    >
      {trait.icon && <img src={trait.icon} alt={trait.displayName} className="w-4 h-4" />}
      {trait.numUnits}
    </span>
  );
}

function UnitIcon({ unit, size }: { unit: TftUnit; size: number }) {
  return (
    <div className="flex flex-col items-center" style={{ width: size }} title={unit.name}>
      <div
        className="h-3 leading-3 text-[11px] tracking-[-1px]"
        style={{ color: unit.tier >= 3 ? "#f2c14e" : "#cfd6de" }}
      >
        {unit.tier >= 2 ? "★".repeat(unit.tier) : ""}
      </div>
      <div
        className="rounded-[4px] overflow-hidden bg-[#2a2b31] border-2"
        style={{ width: size, height: size, borderColor: costColor(unit.cost) }}
      >
        {unit.icon && <img src={unit.icon} alt={unit.name} className="w-full h-full object-cover" />}
      </div>
      <div className="flex -mt-2.5 h-4 gap-px">
        {unit.items.map((item, i) =>
          item.icon ? (
            <img
              key={`${item.name}-${i}`}
              src={item.icon}
              alt={item.displayName}
              title={item.displayName}
              className="w-4 h-4 rounded-[2px] border border-black/70"
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function Board({ player, unitSize }: { player: TftLobbyPlayer; unitSize: number }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex flex-wrap gap-1">
        {player.traits.map((t) => (
          <TraitChip key={t.name} trait={t} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {player.units.map((u, i) => (
          <UnitIcon key={`${u.characterId}-${i}`} unit={u} size={unitSize} />
        ))}
      </div>
    </div>
  );
}

function Avatar({ src, level, size }: { src: string | null; level: number; size: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full overflow-hidden bg-[#2a2b31] border border-[#3a3c44]">
        {src && <img src={src} alt="" className="w-full h-full object-cover" />}
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-[4px] bg-[#17181c] border border-[#3a3c44] text-[11px] font-bold text-white flex items-center justify-center">
        {level}
      </span>
    </div>
  );
}

function LobbyStats({ player, maxBoardValue }: { player: TftLobbyPlayer; maxBoardValue: number }) {
  const pct = maxBoardValue > 0 ? (player.boardValue / maxBoardValue) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5 w-16 shrink-0 text-[13px] text-[#d7d8dc]">
      <div className="flex items-center gap-1.5" title="Jugadores eliminados">
        <SwordsIcon />
        {player.playersEliminated}
      </div>
      <div title="Valor del tablero en oro">
        <div className="flex items-center gap-1.5">
          <CoinIcon />
          {player.boardValue}
        </div>
        <div className="mt-1 h-1 rounded bg-[#34363d]">
          <div className="h-full rounded bg-[#e0b454]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function LobbyRow({
  player,
  tracked,
  maxBoardValue,
}: {
  player: TftLobbyPlayer;
  tracked: boolean;
  maxBoardValue: number;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] ${tracked ? "bg-[#2a2b31]" : "bg-[#1f2025]"}`}
      style={{ borderLeftColor: tracked ? placementColor(player.placement) : "transparent" }}
    >
      <span
        className="w-6 shrink-0 text-center text-xl font-bold"
        style={{ color: placementColor(player.placement) }}
      >
        {player.placement}
      </span>
      <Avatar src={player.avatar} level={player.level} size={52} />
      <div className="w-40 shrink-0 min-w-0">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: tracked ? "#e8b857" : "#e6e6e6" }}
        >
          {player.gameName}
          <span className="text-[#8b8d95] font-normal">#{player.tagLine}</span>
        </p>
        <p className="text-xs text-[#8b8d95]">
          {formatDuration(player.timeEliminated)} • {stageLabel(player.lastRound)}
        </p>
      </div>
      <LobbyStats player={player} maxBoardValue={maxBoardValue} />
      <Board player={player} unitSize={44} />
    </div>
  );
}

function MatchCard({ match, trackedPuuid }: { match: TftMatch; trackedPuuid: string }) {
  const [open, setOpen] = useState(false);
  const tracked = match.participants.find((p) => p.puuid === trackedPuuid);
  if (!tracked) return null;

  const maxBoardValue = Math.max(...match.participants.map((p) => p.boardValue));
  const color = placementColor(match.placement);

  return (
    <div className="rounded-lg overflow-hidden bg-[#1f2025] border border-[#2e3037]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left border-l-4 hover:bg-[#25262c] transition"
        style={{ borderLeftColor: color }}
      >
        <div className="w-24 shrink-0">
          <p className="text-2xl font-bold leading-none" style={{ color }}>
            {match.placement}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#e6e6e6]">Ranked</p>
          <p className="text-xs text-[#8b8d95]">{timeAgo(match.gameDatetime)}</p>
          <p className="text-xs text-[#8b8d95]">
            {formatDuration(match.gameLengthSeconds)} • {stageLabel(match.lastRound)}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 w-20 shrink-0">
          <Avatar src={tracked.avatar} level={tracked.level} size={56} />
          {match.lpChange !== null && (
            <span
              className={`text-xs font-bold ${match.lpChange >= 0 ? "text-[#4fd18b]" : "text-[#f0626b]"}`}
            >
              {match.lpChange >= 0 ? "+" : ""}
              {match.lpChange} LP
            </span>
          )}
        </div>
        <LobbyStats player={tracked} maxBoardValue={maxBoardValue} />
        <div className="flex-1 min-w-0">
          <Board player={tracked} unitSize={44} />
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 shrink-0 text-[#c9cbd1] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#2e3037]">
          <div className="flex items-end gap-1 px-2 pt-2 bg-[#191a1e]">
            <span className="px-4 py-2 rounded-t-md bg-[#1f2025] text-sm font-semibold text-white">
              Players
            </span>
          </div>
          <div className="flex flex-col divide-y divide-[#2a2c33]">
            {match.participants.map((p) => (
              <LobbyRow
                key={p.puuid}
                player={p}
                tracked={p.puuid === trackedPuuid}
                maxBoardValue={maxBoardValue}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TftMatchList({
  matches,
  trackedPuuid,
}: {
  matches: TftMatch[];
  trackedPuuid: string;
}) {
  if (matches.length === 0) {
    return <p className="text-white/40 px-1">Sin partidas ranked recientes</p>;
  }
  return (
    <div className="flex flex-col gap-2 min-w-[820px]">
      {matches.map((m) => (
        <MatchCard key={m.matchId} match={m} trackedPuuid={trackedPuuid} />
      ))}
    </div>
  );
}

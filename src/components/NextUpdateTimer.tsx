"use client";

import { useEffect, useState } from "react";

/**
 * Data refreshes on its own via a server-side cron (see
 * src/app/api/cron/refresh, scheduled by .github/workflows/refresh.yml),
 * so viewers don't need to reload for LP tracking to stay accurate — this
 * just shows when the next update lands.
 *
 * Counts down to the next fixed clock boundary (e.g. every 10 min lands on
 * :00/:10/:20/...) instead of "intervalMs since this browser's last fetch",
 * so a reload doesn't push the displayed countdown back out. While the check a
 * page load triggers is still running, it says so instead.
 */
export default function NextUpdateTimer({
  intervalMs,
  refreshing = false,
}: {
  intervalMs: number;
  refreshing?: boolean;
}) {
  // Starts null so the server-rendered markup (no "now" to count down from)
  // matches the client's first render; the effect below then starts ticking.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const nextBoundary = Math.ceil(now / intervalMs) * intervalMs;
  const totalSeconds = Math.ceil((nextBoundary - now) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <p className="text-white/30 text-sm mb-6">
      {refreshing
        ? "Buscando partidas nuevas…"
        : `Próxima actualización en ${minutes}:${seconds.toString().padStart(2, "0")}`}
    </p>
  );
}

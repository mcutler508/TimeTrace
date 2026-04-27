import { useEffect, useState } from 'react';
import {
  fetchLeaderboard,
  fetchPlayerRank,
  isLeaderboardConfigured,
  type LeaderboardEntry,
} from '../game/leaderboard';
import { haptics } from '../game/haptics';
import { sfx } from '../game/audio';

interface Props {
  playerId: string;
  playerName: string;
  onHome: () => void;
}

type Status = 'loading' | 'ready' | 'error' | 'empty' | 'unconfigured';

export default function LeaderboardScreen({ playerId, playerName, onHome }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [meRank, setMeRank] = useState<number | null>(null);
  const [meEntry, setMeEntry] = useState<LeaderboardEntry | null>(null);
  const [rawFetch, setRawFetch] = useState<string>('(not fetched yet)');

  async function rawProbe() {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setRawFetch('NO ENV VARS');
        return;
      }
      const r = await fetch(
        `${url}/rest/v1/players?select=id,name,total_points&order=total_points.desc.nullslast&limit=50`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        },
      );
      const t = await r.text();
      setRawFetch(`HTTP ${r.status} · ${t.slice(0, 400)}`);
    } catch (e) {
      setRawFetch(`THREW: ${(e as Error).message}`);
    }
  }

  async function load() {
    if (!isLeaderboardConfigured()) {
      setStatus('unconfigured');
      return;
    }
    setStatus('loading');
    try {
      const list = await fetchLeaderboard(50);
      console.info('[leaderboard] fetched', list.length, 'players');
      setEntries(list);
      try {
        const mine = await fetchPlayerRank(playerId);
        if (mine) {
          setMeRank(mine.rank);
          setMeEntry(mine.entry);
        } else {
          setMeRank(null);
          setMeEntry(null);
        }
      } catch (rankErr) {
        console.warn('[leaderboard] rank lookup failed but list loaded', rankErr);
      }
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.warn('[leaderboard] load failed', err);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    rawProbe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `TT · status=${status} · entries=${entries.length} · meRank=${
        meRank ?? 'null'
      }`;
    }
    // eslint-disable-next-line no-console
    console.log('[leaderboard render]', {
      status,
      entriesLength: entries.length,
      meRank,
      ids: entries.map((e) => e.id),
      names: entries.map((e) => e.name),
    });
  });

  const meInTopList = meRank != null && meRank <= entries.length;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#ff0044',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 12,
          padding: '6px 10px',
          textAlign: 'center',
          letterSpacing: '0.05em',
        }}
      >
        DEBUG · status={status} · entries={entries.length} · meRank=
        {meRank ?? 'null'} · names=[
        {entries.map((e) => e.name).join(', ') || 'EMPTY'}]
      </div>
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-7 pb-6 gap-5 overflow-y-auto" style={{ paddingTop: 50 }}>
      <header className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            haptics.micro();
            sfx.tap();
            onHome();
          }}
          className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-yellow text-splat-black"
        >
          ← HOME
        </button>
        <div className="text-poster text-base tracking-[0.18em] text-splat-paper text-sticker">
          LEADERBOARD
        </div>
        <button
          onClick={() => {
            haptics.tap();
            sfx.tap();
            load();
          }}
          aria-label="Refresh"
          className="btn-sticker-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-poster bg-splat-cyan text-splat-black"
        >
          ↻
        </button>
      </header>

      <div className="card-sticker px-3 py-2 -rotate-[0.4deg] flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.32em] text-splat-yellow font-poster">
            YOU
          </div>
          <div className="text-poster text-base text-splat-paper text-sticker leading-tight mt-0.5">
            {playerName || 'NO NAME'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.32em] text-splat-yellow font-poster">
            {meRank != null ? 'RANK' : 'UNRANKED'}
          </div>
          <div className="text-poster text-2xl text-splat-paper tabular-nums leading-none mt-0.5">
            {meRank != null ? `#${meRank}` : '—'}
          </div>
          {meEntry && (
            <div className="text-[10px] text-splat-paper/65 font-poster tabular-nums mt-0.5">
              {meEntry.total_points} pts
            </div>
          )}
        </div>
      </div>

      {status === 'loading' && entries.length === 0 && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border-2 border-splat-paper/15 bg-splat-paper/5 h-12 animate-pulse"
            />
          ))}
        </div>
      )}

      {status === 'unconfigured' && (
        <div className="card-sticker px-4 py-4 text-center">
          <div className="text-poster text-sm text-splat-paper">LEADERBOARD OFFLINE</div>
          <p className="text-[12px] text-splat-paper/65 mt-2 leading-snug">
            Supabase isn't configured for this build. Local play still works.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="card-sticker px-4 py-4 flex flex-col gap-3">
          <div className="text-poster text-sm text-splat-pink">CAN'T REACH BOARD</div>
          <p className="text-[12px] text-splat-paper/65 leading-snug">
            Couldn't talk to the server. Check your connection and try again.
          </p>
          <button
            onClick={() => {
              haptics.tap();
              load();
            }}
            className="btn-sticker py-2.5 text-poster text-sm tracking-[0.18em] bg-splat-yellow text-splat-black"
          >
            RETRY
          </button>
        </div>
      )}

      {status === 'empty' && entries.length === 0 && (
        <div className="card-sticker px-4 py-5 text-center">
          <div className="text-poster text-sm text-splat-paper">EMPTY BOARD</div>
          <p className="text-[12px] text-splat-paper/70 mt-2 leading-snug">
            Be the first to set a score. Beat any level's best to claim rank #1.
          </p>
        </div>
      )}

      <div
        style={{
          background: '#ffe83d',
          color: '#0a0708',
          border: '3px solid #0a0708',
          borderRadius: 12,
          padding: '12px 14px',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        DEBUG · status={status} · entries.length={entries.length} ·
        meRank={meRank ?? 'null'} · ids=[
        {entries.map((e) => e.name).join(', ') || 'EMPTY'}]
      </div>

      <div
        style={{
          background: '#001a33',
          color: '#88ddff',
          border: '2px dashed #88ddff',
          padding: 10,
          fontFamily: 'monospace',
          fontSize: 11,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}
      >
        RAW PROBE (no supabase-js): {rawFetch}
      </div>

      <div style={{ display: 'block', width: '100%' }}>
        {entries.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: 'block',
              width: '100%',
              minHeight: 60,
              padding: '14px 16px',
              marginBottom: 10,
              borderRadius: 12,
              border: '3px solid #ffe83d',
              background: '#1a0e2e',
              color: '#fff5e0',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          >
            #{i + 1} · {e.name} · {e.total_points} pts · streak {e.best_streak}
            {e.id === playerId ? ' ← YOU' : ''}
          </div>
        ))}
        {entries.length === 0 && (
          <div
            style={{
              padding: 16,
              border: '3px solid #ff3da4',
              background: '#1a0e2e',
              color: '#ff3da4',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 700,
            }}
          >
            ENTRIES ARRAY IS EMPTY IN RENDER (but debug bar might say otherwise)
          </div>
        )}
      </div>

      {entries.length > 0 && meRank != null && !meInTopList && (
        <div className="sticky bottom-2 mt-2 card-sticker px-3 py-2.5 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-splat-black bg-splat-yellow text-splat-black">
            <span className="text-poster text-sm tabular-nums">#{meRank}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-poster text-sm text-splat-yellow text-glow-gold leading-tight truncate">
              {playerName} <span className="text-[9px] text-splat-yellow/75 ml-1">YOU</span>
            </div>
            <div className="text-[10px] text-splat-paper/55 font-poster tracking-[0.18em]">
              Keep climbing — beat a level's best to advance
            </div>
          </div>
          {meEntry && (
            <div className="text-poster text-lg text-splat-paper tabular-nums">
              {meEntry.total_points}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

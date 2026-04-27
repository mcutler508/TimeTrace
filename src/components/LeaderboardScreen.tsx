import { useEffect, useState } from 'react';
import {
  fetchLeaderboard,
  fetchPlayerRank,
  isLeaderboardConfigured,
  type LeaderboardEntry,
} from '../game/leaderboard';
import { haptics } from '../game/haptics';

interface Props {
  playerId: string;
  playerName: string;
  onHome: () => void;
}

type Status = 'loading' | 'ready' | 'error' | 'empty' | 'unconfigured';

const RANK_TROPHY: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-splat-yellow', text: 'text-splat-black', label: '1' },
  2: { bg: 'bg-splat-cyan', text: 'text-splat-black', label: '2' },
  3: { bg: 'bg-splat-lime', text: 'text-splat-black', label: '3' },
};

export default function LeaderboardScreen({ playerId, playerName, onHome }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [meRank, setMeRank] = useState<number | null>(null);
  const [meEntry, setMeEntry] = useState<LeaderboardEntry | null>(null);

  async function load() {
    if (!isLeaderboardConfigured()) {
      setStatus('unconfigured');
      return;
    }
    setStatus('loading');
    try {
      const [list, mine] = await Promise.all([
        fetchLeaderboard(50),
        fetchPlayerRank(playerId),
      ]);
      setEntries(list);
      if (mine) {
        setMeRank(mine.rank);
        setMeEntry(mine.entry);
      } else {
        setMeRank(null);
        setMeEntry(null);
      }
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const meInTopList = meRank != null && meRank <= entries.length;

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto px-5 pt-7 pb-6 gap-5 overflow-y-auto">
      <header className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            haptics.micro();
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

      {status === 'loading' && (
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

      {status === 'empty' && (
        <div className="card-sticker px-4 py-5 text-center">
          <div className="text-poster text-sm text-splat-paper">EMPTY BOARD</div>
          <p className="text-[12px] text-splat-paper/70 mt-2 leading-snug">
            Be the first to set a score. Beat any level's best to claim rank #1.
          </p>
        </div>
      )}

      {status === 'ready' && (
        <ol className="flex flex-col gap-2">
          {entries.map((e, i) => {
            const rank = i + 1;
            const isMe = e.id === playerId;
            const trophy = RANK_TROPHY[rank];
            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                  isMe
                    ? 'border-splat-yellow bg-splat-yellow/10'
                    : 'border-splat-paper/15 bg-splat-paper/5'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 border-splat-black ${
                    trophy ? trophy.bg + ' ' + trophy.text : 'bg-splat-paper/10 text-splat-paper'
                  }`}
                >
                  <span className="text-poster text-sm tabular-nums">
                    {trophy ? trophy.label : rank}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-poster text-sm leading-tight truncate ${
                      isMe ? 'text-splat-yellow text-glow-gold' : 'text-splat-paper'
                    }`}
                  >
                    {e.name}
                    {isMe && (
                      <span className="ml-2 text-[9px] tracking-[0.2em] text-splat-yellow/85">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-splat-paper/55 font-poster tracking-[0.18em]">
                    Streak {e.best_streak}
                  </div>
                </div>
                <div className="text-poster text-lg text-splat-paper tabular-nums">
                  {e.total_points}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {status === 'ready' && meRank != null && !meInTopList && (
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
  );
}

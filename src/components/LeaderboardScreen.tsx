import { useEffect, useMemo, useState } from 'react';
import {
  fetchLeaderboard,
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

type LoadState = 'loading' | 'ok' | 'error' | 'unconfigured';

const TOP_ACCENT: Record<number, { fill: string; ring: string; label: string; medal: string }> = {
  1: { fill: '#ffe83d', ring: 'rgba(255,232,61,0.55)', label: 'CHAMPION', medal: '🏆' },
  2: { fill: '#3df0ff', ring: 'rgba(61,240,255,0.55)', label: 'CONTENDER', medal: '🥈' },
  3: { fill: '#a4ff3d', ring: 'rgba(164,255,61,0.55)', label: 'CHALLENGER', medal: '🥉' },
};

const ROW_TILTS = ['rotate(-0.4deg)', 'rotate(0.5deg)', 'rotate(-0.3deg)'];

export default function LeaderboardScreen({ playerId, onHome }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function load() {
    if (!isLeaderboardConfigured()) {
      setLoadState('unconfigured');
      return;
    }
    setLoadState('loading');
    try {
      const list = await fetchLeaderboard(50);
      setEntries(list);
      setLoadState('ok');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setLoadState('error');
    }
  }

  useEffect(() => {
    load();
  }, [playerId]);

  const myRow = useMemo(() => {
    const idx = entries.findIndex((e) => e.id === playerId);
    return idx >= 0 ? { rank: idx + 1, entry: entries[idx] } : null;
  }, [entries, playerId]);

  const topPoints = entries[0]?.total_points ?? 0;

  return (
    <div
      style={{
        padding: '24px 18px 28px',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        zIndex: 5,
        minHeight: '100vh',
        color: '#fff5e0',
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => {
            haptics.micro();
            sfx.tap();
            onHome();
          }}
          className="btn-sticker-sm"
          style={{
            padding: '6px 12px',
            background: '#ffe83d',
            color: '#0a0708',
            fontFamily: '"Bungee", Impact, sans-serif',
            fontSize: 11,
            letterSpacing: '0.22em',
            cursor: 'pointer',
          }}
        >
          ← HOME
        </button>
        <button
          onClick={() => {
            haptics.tap();
            sfx.tap();
            load();
          }}
          aria-label="Refresh"
          className="btn-sticker-sm"
          style={{
            padding: '6px 12px',
            background: '#3df0ff',
            color: '#0a0708',
            fontFamily: '"Bungee", Impact, sans-serif',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ↻
        </button>
      </header>

      <div style={{ marginTop: 20, marginBottom: 16 }}>
        <div
          className="text-poster"
          style={{
            fontSize: 11,
            letterSpacing: '0.4em',
            color: '#ffe83d',
            textShadow: '0 0 12px rgba(255,232,61,0.6)',
          }}
        >
          GLOBAL
        </div>
        <h1
          className="text-poster text-rainbow"
          style={{
            fontSize: 44,
            lineHeight: 0.95,
            margin: '4px 0 0',
            letterSpacing: '0.02em',
          }}
        >
          LEADER<br />BOARD.
        </h1>
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <Chip color="#ffe83d" label="PLAYERS" value={entries.length} />
        {myRow && <Chip color="#3df0ff" label="YOUR RANK" value={`#${myRow.rank}`} />}
        {myRow && <Chip color="#ff3da4" label="YOUR PTS" value={myRow.entry.total_points} />}
      </div>

      {loadState === 'loading' && entries.length === 0 && (
        <div
          style={{
            padding: 22,
            background: '#14102a',
            border: '3px solid #0a0708',
            borderRadius: 14,
            boxShadow: '5px 5px 0 0 #0a0708',
            color: '#88ddff',
            fontFamily: '"Bungee", Impact, sans-serif',
            letterSpacing: '0.3em',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          LOADING…
        </div>
      )}

      {loadState === 'error' && (
        <div
          style={{
            padding: 18,
            background: '#1a0a18',
            border: '3px solid #ff3da4',
            borderRadius: 14,
            boxShadow: '5px 5px 0 0 #0a0708',
          }}
        >
          <div
            className="text-poster"
            style={{ color: '#ff3da4', fontSize: 14, letterSpacing: '0.2em' }}
          >
            CAN'T REACH BOARD
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,245,224,0.7)', marginTop: 6 }}>
            {errorMsg || 'Check your connection.'}
          </div>
          <button
            onClick={load}
            className="btn-sticker"
            style={{
              marginTop: 12,
              padding: '8px 18px',
              background: '#ffe83d',
              color: '#0a0708',
              fontFamily: '"Bungee", Impact, sans-serif',
              fontSize: 12,
              letterSpacing: '0.22em',
              cursor: 'pointer',
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {loadState === 'unconfigured' && (
        <div
          style={{
            padding: 18,
            background: '#14102a',
            border: '3px solid #0a0708',
            borderRadius: 14,
            boxShadow: '5px 5px 0 0 #0a0708',
            color: '#fff5e0',
            textAlign: 'center',
          }}
        >
          <div className="text-poster" style={{ fontSize: 14, letterSpacing: '0.22em' }}>
            BOARD OFFLINE
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Local play still works. Set up Supabase env vars to enable.
          </div>
        </div>
      )}

      {loadState === 'ok' && entries.length === 0 && (
        <div
          style={{
            padding: 22,
            background: '#14102a',
            border: '3px solid #0a0708',
            borderRadius: 14,
            boxShadow: '5px 5px 0 0 #0a0708',
            textAlign: 'center',
          }}
        >
          <div className="text-poster" style={{ fontSize: 14, letterSpacing: '0.22em', color: '#ffe83d' }}>
            EMPTY BOARD
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Be the first to set a score. Beat any level's best to claim rank #1.
          </div>
        </div>
      )}

      {loadState === 'ok' &&
        entries.map((e, i) => {
          const rank = i + 1;
          const isMe = e.id === playerId;
          const accent = TOP_ACCENT[rank];
          const levels = Object.keys(e.level_scores || {}).length;
          const tilt = ROW_TILTS[i % ROW_TILTS.length];
          const pctOfTop = topPoints > 0 ? Math.min(1, e.total_points / topPoints) : 0;

          return (
            <div
              key={e.id}
              style={{
                position: 'relative',
                marginBottom: 14,
                transform: tilt,
              }}
            >
              {accent && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 16,
                    background: accent.fill,
                    color: '#0a0708',
                    fontFamily: '"Bungee", Impact, sans-serif',
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    padding: '3px 10px',
                    border: '2px solid #0a0708',
                    borderRadius: 999,
                    boxShadow: '3px 3px 0 0 #0a0708',
                    zIndex: 2,
                  }}
                >
                  {accent.medal} {accent.label}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 0,
                  padding: 0,
                  borderRadius: 16,
                  border: '3px solid #0a0708',
                  background: isMe
                    ? 'linear-gradient(135deg, #2a1f08 0%, #14102a 100%)'
                    : '#14102a',
                  boxShadow: isMe
                    ? `7px 7px 0 0 #0a0708, 0 0 0 2px ${accent?.ring || 'rgba(255,232,61,0.55)'}`
                    : '6px 6px 0 0 #0a0708',
                  overflow: 'hidden',
                  minHeight: 84,
                }}
              >
                {/* Rank chip column */}
                <div
                  style={{
                    flex: '0 0 auto',
                    width: 70,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: accent
                      ? accent.fill
                      : 'repeating-linear-gradient(135deg, #2a2240 0 8px, #1f1838 8px 16px)',
                    borderRight: '3px solid #0a0708',
                  }}
                >
                  <div
                    className="text-poster"
                    style={{
                      fontSize: rank <= 3 ? 32 : 24,
                      lineHeight: 1,
                      color: accent ? '#0a0708' : '#fff5e0',
                      textShadow: accent ? 'none' : '0 0 10px rgba(255,245,224,0.4)',
                    }}
                  >
                    #{rank}
                  </div>
                </div>

                {/* Player info column */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '14px 14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span
                      className="text-poster"
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        color: isMe ? '#ffe83d' : '#fff5e0',
                        textShadow: isMe
                          ? '0 0 12px rgba(255,232,61,0.7)'
                          : '0 1px 0 rgba(0,0,0,0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: '0 1 auto',
                      }}
                    >
                      {e.name}
                    </span>
                    {isMe && (
                      <span
                        style={{
                          flex: '0 0 auto',
                          background: '#ffe83d',
                          color: '#0a0708',
                          fontFamily: '"Bungee", Impact, sans-serif',
                          fontSize: 9,
                          letterSpacing: '0.18em',
                          padding: '2px 6px',
                          border: '2px solid #0a0708',
                          borderRadius: 6,
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Points bar */}
                  <div
                    style={{
                      position: 'relative',
                      height: 6,
                      background: 'rgba(255,245,224,0.08)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${Math.max(2, pctOfTop * 100)}%`,
                        background: accent
                          ? accent.fill
                          : 'linear-gradient(90deg, #3df0ff 0%, #a44dff 100%)',
                        boxShadow: accent ? `0 0 8px ${accent.ring}` : '0 0 8px rgba(61,240,255,0.5)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Stat icon="⚡" value={`Streak ${e.best_streak}`} />
                    <Stat icon="◆" value={`${levels} ${levels === 1 ? 'level' : 'levels'}`} />
                  </div>
                </div>

                {/* Points column */}
                <div
                  style={{
                    flex: '0 0 auto',
                    minWidth: 90,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.32)',
                    borderLeft: '2px dashed rgba(255,245,224,0.18)',
                  }}
                >
                  <div
                    className="text-poster"
                    style={{
                      fontSize: 22,
                      lineHeight: 1,
                      color: isMe ? '#ffe83d' : '#fff5e0',
                      fontVariantNumeric: 'tabular-nums',
                      textShadow: isMe
                        ? '0 0 14px rgba(255,232,61,0.55)'
                        : '0 1px 0 rgba(0,0,0,0.6)',
                    }}
                  >
                    {e.total_points}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.32em',
                      color: 'rgba(255,245,224,0.55)',
                      marginTop: 4,
                      textTransform: 'uppercase',
                      fontFamily: '"Bungee", Impact, sans-serif',
                    }}
                  >
                    pts
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      {/* Footer note */}
      {loadState === 'ok' && entries.length > 0 && (
        <div
          style={{
            marginTop: 8,
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.32em',
            color: 'rgba(255,245,224,0.45)',
            fontFamily: '"Bungee", Impact, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          Set a new best to climb
        </div>
      )}
    </div>
  );
}

function Chip({ color, label, value }: { color: string; label: string; value: string | number }) {
  return (
    <div
      style={{
        background: color,
        color: '#0a0708',
        border: '2px solid #0a0708',
        borderRadius: 999,
        padding: '5px 11px',
        boxShadow: '3px 3px 0 0 #0a0708',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        fontFamily: '"Bungee", Impact, sans-serif',
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: '0.22em', opacity: 0.75 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}

function Stat({ icon, value }: { icon: string; value: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        letterSpacing: '0.14em',
        color: 'rgba(255,245,224,0.7)',
        fontFamily: '"Bungee", Impact, sans-serif',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ color: '#ffe83d' }}>{icon}</span>
      {value}
    </div>
  );
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface LeaderboardEntry {
  id: string;
  name: string;
  total_points: number;
  best_streak: number;
  level_scores: Record<string, number>;
  updated_at: string;
}

export interface SubmitScorePayload {
  id: string;
  name: string;
  totalPoints: number;
  bestStreak: number;
  levelScores: Record<string, number>;
}

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

let cachedClient: SupabaseClient | null = null;

export function isLeaderboardConfigured(): boolean {
  return URL.length > 0 && KEY.length > 0;
}

function getClient(): SupabaseClient | null {
  if (!isLeaderboardConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function submitScore(payload: SubmitScorePayload): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const trimmed = payload.name.trim().slice(0, 20);
  if (!trimmed) return false;
  try {
    const { error } = await client.from('players').upsert(
      {
        id: payload.id,
        name: trimmed,
        total_points: Math.max(0, Math.floor(payload.totalPoints)),
        best_streak: Math.max(0, Math.floor(payload.bestStreak)),
        level_scores: payload.levelScores,
      },
      { onConflict: 'id' },
    );
    if (error) {
      console.warn('[leaderboard] submitScore error', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[leaderboard] submitScore threw', err);
    return false;
  }
}

export async function updateName(playerId: string, name: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return false;
  try {
    const { error } = await client
      .from('players')
      .update({ name: trimmed })
      .eq('id', playerId);
    if (error) {
      console.warn('[leaderboard] updateName error', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[leaderboard] updateName threw', err);
    return false;
  }
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('players')
      .select('id, name, total_points, best_streak, level_scores, updated_at')
      .order('total_points', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit);
    if (error) {
      console.warn('[leaderboard] fetchLeaderboard error', error.message);
      throw error;
    }
    return (data ?? []) as LeaderboardEntry[];
  } catch (err) {
    console.warn('[leaderboard] fetchLeaderboard threw', err);
    throw err;
  }
}

export async function fetchPlayerRank(
  playerId: string,
): Promise<{ rank: number; entry: LeaderboardEntry } | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const { data: me, error: meErr } = await client
      .from('players')
      .select('id, name, total_points, best_streak, level_scores, updated_at')
      .eq('id', playerId)
      .maybeSingle();
    if (meErr) {
      console.warn('[leaderboard] fetchPlayerRank me error', meErr.message);
      return null;
    }
    if (!me) return null;
    const { count, error: countErr } = await client
      .from('players')
      .select('id', { count: 'exact', head: true })
      .gt('total_points', me.total_points);
    if (countErr) {
      console.warn('[leaderboard] fetchPlayerRank count error', countErr.message);
      return null;
    }
    return {
      rank: (count ?? 0) + 1,
      entry: me as LeaderboardEntry,
    };
  } catch (err) {
    console.warn('[leaderboard] fetchPlayerRank threw', err);
    return null;
  }
}

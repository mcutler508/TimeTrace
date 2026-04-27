import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashPasscode, normalizeHandle } from './auth';

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

export type SignUpError =
  | 'name-taken'
  | 'invalid-name'
  | 'invalid-passcode'
  | 'unconfigured'
  | 'network';

export type SignInError =
  | 'not-found'
  | 'wrong-passcode'
  | 'invalid-name'
  | 'invalid-passcode'
  | 'unconfigured'
  | 'network';

export interface SignUpResult {
  ok: boolean;
  error?: SignUpError;
}

export interface SignInResult {
  ok: boolean;
  player?: LeaderboardEntry;
  error?: SignInError;
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

export async function isHandleAvailable(name: string): Promise<boolean | null> {
  const client = getClient();
  if (!client) return null;
  const handle = normalizeHandle(name);
  if (!handle) return false;
  try {
    const { data, error } = await client
      .from('players')
      .select('id')
      .eq('name_lower', handle.toLowerCase())
      .maybeSingle();
    if (error) {
      console.warn('[leaderboard] isHandleAvailable error', error.message);
      return null;
    }
    return data == null;
  } catch (err) {
    console.warn('[leaderboard] isHandleAvailable threw', err);
    return null;
  }
}

export async function signUp(
  id: string,
  name: string,
  passcode: string,
): Promise<SignUpResult> {
  const client = getClient();
  if (!client) return { ok: false, error: 'unconfigured' };
  const handle = normalizeHandle(name);
  if (!handle) return { ok: false, error: 'invalid-name' };
  if (!/^\d{4}$/.test(passcode)) return { ok: false, error: 'invalid-passcode' };
  const passcode_hash = await hashPasscode(passcode);

  try {
    const { error } = await client.from('players').insert({
      id,
      name: handle,
      passcode_hash,
      total_points: 0,
      best_streak: 0,
      level_scores: {},
    });
    if (error) {
      // Postgres unique-violation code is 23505. Supabase forwards it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (error as any).code as string | undefined;
      if (code === '23505') return { ok: false, error: 'name-taken' };
      console.warn('[leaderboard] signUp error', error.message);
      return { ok: false, error: 'network' };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[leaderboard] signUp threw', err);
    return { ok: false, error: 'network' };
  }
}

export async function signIn(
  name: string,
  passcode: string,
): Promise<SignInResult> {
  const client = getClient();
  if (!client) return { ok: false, error: 'unconfigured' };
  const handle = normalizeHandle(name);
  if (!handle) return { ok: false, error: 'invalid-name' };
  if (!/^\d{4}$/.test(passcode)) return { ok: false, error: 'invalid-passcode' };
  const passcode_hash = await hashPasscode(passcode);

  try {
    const { data, error } = await client
      .from('players')
      .select('id, name, total_points, best_streak, level_scores, updated_at, passcode_hash')
      .eq('name_lower', handle.toLowerCase())
      .maybeSingle();
    if (error) {
      console.warn('[leaderboard] signIn error', error.message);
      return { ok: false, error: 'network' };
    }
    if (!data) return { ok: false, error: 'not-found' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stored = (data as any).passcode_hash as string | null;
    if (!stored || stored !== passcode_hash) {
      return { ok: false, error: 'wrong-passcode' };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { passcode_hash: _omit, ...rest } = data as any;
    return { ok: true, player: rest as LeaderboardEntry };
  } catch (err) {
    console.warn('[leaderboard] signIn threw', err);
    return { ok: false, error: 'network' };
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

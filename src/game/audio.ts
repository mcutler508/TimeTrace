import type { Grade } from './types';

const PREF_KEY = 'timetrace-sound-v1';

const BPM = 128;
const SECONDS_PER_BEAT = 60 / BPM;
const STEP_DURATION = SECONDS_PER_BEAT / 4; // 16th note
const STEPS_PER_BAR = 16;
const BARS_PER_LOOP = 8;
const STEPS_PER_LOOP = STEPS_PER_BAR * BARS_PER_LOOP;
const SCHEDULE_AHEAD = 0.1;
const SCHEDULER_INTERVAL_MS = 25;
const MASTER_GAIN_ON = 0.25;

// 8-bar bass progression (A minor): A1, A1, E1, G1, A1, A1, E1, D1
const BASS_FREQS_BY_BAR = [
  55.0, // A1
  55.0,
  41.2, // E1
  49.0, // G1
  55.0,
  55.0,
  41.2,
  36.71, // D1
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicScheduler: ReturnType<typeof setInterval> | null = null;
let nextStepTime = 0;
let currentStep = 0;
let noiseBuffer: AudioBuffer | null = null;
let visibilityHookInstalled = false;

export function isSoundSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.AudioContext !== 'undefined' ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).webkitAudioContext !== 'undefined'
  );
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function persistEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
  } catch {
    /* noop */
  }
}

function ensureNoiseBuffer(c: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 0.5);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function installVisibilityHook() {
  if (visibilityHookInstalled || typeof document === 'undefined') return;
  visibilityHookInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      stopScheduler();
      ctx.suspend().catch(() => {});
    } else if (getSoundEnabled()) {
      ctx.resume().catch(() => {});
      startScheduler();
    }
  });
}

export function bootAudio(): boolean {
  if (!isSoundSupported()) return false;
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = getSoundEnabled() ? MASTER_GAIN_ON : 0;
    master.connect(ctx.destination);
    ensureNoiseBuffer(ctx);
    installVisibilityHook();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (getSoundEnabled() && !musicScheduler) {
    startScheduler();
  }
  return true;
}

export function setSoundEnabled(enabled: boolean) {
  persistEnabled(enabled);
  if (!ctx || !master) {
    if (enabled) bootAudio();
    return;
  }
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(enabled ? MASTER_GAIN_ON : 0, now + 0.2);
  if (enabled && !musicScheduler) startScheduler();
}

function startScheduler() {
  if (!ctx || musicScheduler) return;
  nextStepTime = ctx.currentTime + 0.05;
  currentStep = 0;
  musicScheduler = setInterval(tickScheduler, SCHEDULER_INTERVAL_MS);
}

function stopScheduler() {
  if (musicScheduler) {
    clearInterval(musicScheduler);
    musicScheduler = null;
  }
}

function tickScheduler() {
  if (!ctx) return;
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(currentStep, nextStepTime);
    currentStep = (currentStep + 1) % STEPS_PER_LOOP;
    nextStepTime += STEP_DURATION;
  }
}

function scheduleStep(step: number, time: number) {
  const stepInBar = step % STEPS_PER_BAR;
  const bar = Math.floor(step / STEPS_PER_BAR);

  // Kick on every beat (steps 0, 4, 8, 12)
  if (stepInBar % 4 === 0) {
    playKick(time);
  }

  // Closed hi-hat on offbeats (e.g., 8th-note offbeats: 2, 6, 10, 14 → between every kick)
  if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
    playHat(time, false);
  }

  // Open hi-hat once a bar for variation
  if (stepInBar === 14 && bar % 2 === 1) {
    playHat(time, true);
  }

  // Bass note on beat 1 of every bar + a sustain decay
  if (stepInBar === 0) {
    const bassFreq = BASS_FREQS_BY_BAR[bar % BASS_FREQS_BY_BAR.length];
    playBass(time, bassFreq, SECONDS_PER_BEAT * 1.6);
  }
  if (stepInBar === 8) {
    const bassFreq = BASS_FREQS_BY_BAR[bar % BASS_FREQS_BY_BAR.length];
    playBass(time, bassFreq * 1.5, SECONDS_PER_BEAT * 0.6); // 5th
  }

  // Stab chord on bar 1 of every 4 bars
  if (stepInBar === 0 && bar % 4 === 0) {
    playStab(time);
  }
}

function playKick(time: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.18);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.85, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 0.25);
}

function playHat(time: number, open: boolean) {
  if (!ctx || !master) return;
  const buf = ensureNoiseBuffer(ctx);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'highpass';
  bp.frequency.value = 6000;
  const gain = ctx.createGain();
  const dur = open ? 0.18 : 0.06;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(open ? 0.18 : 0.14, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(bp);
  bp.connect(gain);
  gain.connect(master);
  src.start(time);
  src.stop(time + dur + 0.02);
}

function playBass(time: number, freq: number, dur: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(800, time);
  lp.frequency.exponentialRampToValueAtTime(300, time + dur);
  lp.Q.value = 4;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.32, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function playStab(time: number) {
  if (!ctx || !master) return;
  const freqs = [440, 523.25, 659.25]; // A4, C5, E5 (A minor stab)
  const dur = 0.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2200, time);
  lp.frequency.exponentialRampToValueAtTime(800, time + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.18, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  lp.connect(gain);
  gain.connect(master);
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    osc.connect(lp);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
}

// ---------- SFX ----------

function blip(
  type: OscillatorType,
  freq: number,
  dur: number,
  gainPeak = 0.18,
  freqEnd?: number,
) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
  }
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gainPeak, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function arp(freqs: number[], stepDur: number, gainPeak: number, type: OscillatorType = 'triangle') {
  if (!ctx || !master) return;
  const start = ctx.currentTime;
  freqs.forEach((f, i) => {
    const t = start + i * stepDur;
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = type;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur);
    osc.connect(g);
    g.connect(master!);
    osc.start(t);
    osc.stop(t + stepDur + 0.02);
  });
}

function chord(freqs: number[], dur: number, gainPeak: number) {
  if (!ctx || !master) return;
  const start = ctx.currentTime;
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gainPeak / freqs.length, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

export const sfx = {
  tap: () => blip('triangle', 880, 0.04, 0.16),
  start: () => blip('square', 220, 0.07, 0.18),
  stop: () => blip('triangle', 440, 0.1, 0.18),
  perfect: () => arp([523.25, 659.25, 783.99, 1046.5], 0.07, 0.22, 'triangle'),
  elite: () => arp([659.25, 880, 1046.5], 0.08, 0.2, 'sine'),
  great: () => blip('sine', 523.25, 0.25, 0.2),
  close: () => blip('triangle', 330, 0.15, 0.18),
  miss: () => blip('square', 220, 0.35, 0.18, 165),
  newBest: () => arp([523.25, 659.25, 783.99, 1046.5, 1318.51], 0.08, 0.2, 'sine'),
  unlock: () => chord([523.25, 783.99, 1046.5], 0.7, 0.28),
  forGrade(grade: Grade) {
    switch (grade) {
      case 'Perfect':
        return this.perfect();
      case 'Elite':
        return this.elite();
      case 'Great':
        return this.great();
      case 'Close':
        return this.close();
      case 'Miss':
        return this.miss();
    }
  },
};

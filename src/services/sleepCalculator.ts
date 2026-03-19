export type FlexibilityMinutes = 0 | 15 | 30;

export type WakePlan = {
  suggestedWakeAt: number;
  suggestedSleepAt: number;
  cycles: number;
  targetWakeAt: number;
  flexibilityMinutes: FlexibilityMinutes;
};

type CalculateArgs = {
  currentTime: Date;
  targetWakeTime: Date;
  flexibility: FlexibilityMinutes;
  sleepLatencyMinutes?: number; // default 15
  cycleLengthMinutes?: number; // default 90
  minCycles?: number; // default 3 (planning from now)
  maxCycles?: number; // default 6
};

function clampDateToTodayOrTomorrow(baseNow: Date, target: Date) {
  const out = new Date(baseNow);
  out.setHours(target.getHours(), target.getMinutes(), 0, 0);
  if (out.getTime() <= baseNow.getTime()) {
    out.setDate(out.getDate() + 1);
  }
  return out;
}

function abs(n: number) {
  return n < 0 ? -n : n;
}

export function calculateWakeTime({
  currentTime,
  targetWakeTime,
  flexibility,
  sleepLatencyMinutes = 15,
  cycleLengthMinutes = 90,
  minCycles = 3,
  maxCycles = 6,
}: CalculateArgs): WakePlan {
  const now = new Date(currentTime);
  const target = clampDateToTodayOrTomorrow(now, targetWakeTime);

  const latencyMs = sleepLatencyMinutes * 60_000;
  const cycleMs = cycleLengthMinutes * 60_000;
  const sleepStart = new Date(now.getTime() + latencyMs);

  const windowStart = target.getTime() - flexibility * 60_000;
  const windowEnd = target.getTime() + flexibility * 60_000;

  const candidates: { wakeAt: number; cycles: number }[] = [];
  for (let n = minCycles; n <= maxCycles; n++) {
    candidates.push({ wakeAt: sleepStart.getTime() + cycleMs * n, cycles: n });
  }

  // Score:
  // 1) inside window wins, closest to target
  // 2) otherwise closest to window (prefer after windowStart slightly)
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const inWindow = c.wakeAt >= windowStart && c.wakeAt <= windowEnd;
    const distToTarget = abs(c.wakeAt - target.getTime());
    const distToWindow =
      c.wakeAt < windowStart ? windowStart - c.wakeAt : c.wakeAt > windowEnd ? c.wakeAt - windowEnd : 0;
    const penalty = inWindow ? 0 : 10_000_000_000; // strong bias for in-window
    const score = penalty + distToTarget + distToWindow * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return {
    suggestedWakeAt: best.wakeAt,
    suggestedSleepAt: sleepStart.getTime(),
    cycles: best.cycles,
    targetWakeAt: target.getTime(),
    flexibilityMinutes: flexibility,
  };
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}


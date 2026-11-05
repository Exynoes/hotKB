import { createRng } from './rng.js';
import type { ErrorMode } from './engine.js';

/**
 * BOT-01 : cinq niveaux. Plages de MPM visé et taux d'erreur indicatifs de l'énoncé
 * (« Impossible » : 140+ → 140–170 retenu pour un comportement borné).
 */
export const BOT_LEVELS = ['noob', 'debutant', 'intermediaire', 'expert', 'impossible'] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export const BOT_PROFILES: Record<BotLevel, { minWpm: number; maxWpm: number; errorRate: number; name: string }> = {
  noob: { minWpm: 10, maxWpm: 20, errorRate: 0.12, name: 'Noob' },
  debutant: { minWpm: 20, maxWpm: 35, errorRate: 0.08, name: 'Débutant' },
  intermediaire: { minWpm: 35, maxWpm: 60, errorRate: 0.05, name: 'Intermédiaire' },
  expert: { minWpm: 70, maxWpm: 100, errorRate: 0.02, name: 'Expert' },
  impossible: { minWpm: 140, maxWpm: 170, errorRate: 0.005, name: 'Impossible' },
};

/** Un événement = une frappe du bot, avec l'état cumulé juste après. */
export interface BotEvent {
  t: number;
  pos: number;
  correct: number;
  total: number;
  errors: number;
  keyErrors: [char: string, count: number][];
}

export interface BotTimeline {
  level: BotLevel;
  targetWpm: number;
  events: BotEvent[];
}

const HARD_CHAR = /[A-Z0-9.,;:!?'"()-]/;

/**
 * BOT-02, BOT-03, BOT-05 : génère la chronologie complète d'un bot à partir d'une graine.
 * - vitesse variable : deux oscillations lentes (accélérations / ralentissements) + hésitations en début de mot ;
 * - mots difficiles (majuscules, chiffres, ponctuation) tapés plus lentement ;
 * - erreurs : en mode « correction », une frappe fausse puis une pause de correction ; en mode libre, la faute avance.
 * Même graine + même texte + même niveau = même chronologie (testable).
 */
export function generateBotTimeline(seed: number, level: BotLevel, text: string, mode: ErrorMode): BotTimeline {
  const rng = createRng(seed);
  const profile = BOT_PROFILES[level];
  const targetWpm = profile.minWpm + rng() * (profile.maxWpm - profile.minWpm);
  const baseDelay = 60000 / (targetWpm * 5);
  const p1 = 4000 + rng() * 4000;
  const p2 = 11000 + rng() * 6000;
  const f1 = rng() * Math.PI * 2;
  const f2 = rng() * Math.PI * 2;

  const events: BotEvent[] = [];
  const keyErrors = new Map<string, number>();
  let t = 400 + rng() * 600; // temps de réaction au départ
  let pos = 0;
  let correct = 0;
  let total = 0;
  let errors = 0;
  const snapshot = () => [...keyErrors.entries()];

  while (pos < text.length) {
    const expected = text[pos];
    const speed = 1 + 0.25 * Math.sin((2 * Math.PI * t) / p1 + f1) + 0.15 * Math.sin((2 * Math.PI * t) / p2 + f2);
    let delay = (baseDelay / Math.max(0.5, speed)) * (0.75 + rng() * 0.5);
    if (HARD_CHAR.test(expected)) delay *= 1.4;
    if (pos > 0 && text[pos - 1] === ' ' && rng() < 0.12) delay += 200 + rng() * 500; // hésitation
    t += delay;

    if (rng() < profile.errorRate) {
      total++;
      errors++;
      keyErrors.set(expected, (keyErrors.get(expected) ?? 0) + 1);
      if (mode === 'free') pos++;
      else t += 200 + rng() * 300; // temps de correction
    } else {
      total++;
      correct++;
      pos++;
    }
    events.push({ t: Math.round(t), pos, correct, total, errors, keyErrors: snapshot() });
  }
  return { level, targetWpm: Math.round(targetWpm * 10) / 10, events };
}

/** État du bot à l'instant `elapsedMs` (dernier événement déjà survenu). */
export function botStateAt(timeline: BotTimeline, elapsedMs: number): BotEvent | null {
  const ev = timeline.events;
  if (ev.length === 0 || ev[0].t > elapsedMs) return null;
  let lo = 0;
  let hi = ev.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ev[mid].t <= elapsedMs) lo = mid;
    else hi = mid - 1;
  }
  return ev[lo];
}

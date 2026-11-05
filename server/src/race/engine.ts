/**
 * Règles de frappe et de classement — logique pure, sans I/O (TEST-01).
 * Définitions de l'annexe A de l'énoncé : MPM net = (caractères corrects ÷ 5) ÷ minutes ;
 * MPM brut = (caractères tapés ÷ 5) ÷ minutes ; précision = frappes correctes ÷ frappes totales.
 */

export type ErrorMode = 'correct' | 'free';

export interface Run {
  text: string;
  /** Caractères validés (position dans le texte). */
  pos: number;
  /** Frappes correctes / totales / erreurs. */
  correct: number;
  total: number;
  errors: number;
  /** Touches manquées : caractère attendu → nombre d'erreurs (RES-03). */
  keyErrors: Record<string, number>;
  /** Frappes refusées parce que physiquement impossibles (COURSE-06). */
  rejected: number;
}

export function newRun(text: string): Run {
  return { text, pos: 0, correct: 0, total: 0, errors: 0, keyErrors: {}, rejected: 0 };
}

/** Plafond de vitesse plausible : 25 frappes/s (≈ 300 MPM), plus une petite rafale de tolérance. */
export const MAX_KEYS_PER_SECOND = 25;
const BURST = 8;

/**
 * Applique une rafale de frappes. Le serveur ne croit pas le client sur la progression :
 * il rejoue les frappes contre le texte (COURSE-06) et rejette l'excédent impossible.
 * Retourne le nombre de frappes acceptées.
 */
export function applyKeys(run: Run, keys: string, mode: ErrorMode, elapsedMs: number): number {
  if (elapsedMs < 0) {
    run.rejected += keys.length;
    return 0;
  }
  const budget = Math.floor((elapsedMs / 1000) * MAX_KEYS_PER_SECOND) + BURST - run.total;
  let accepted = 0;
  for (const c of keys) {
    if (run.pos >= run.text.length) break;
    if (accepted >= budget) {
      run.rejected++;
      continue;
    }
    accepted++;
    run.total++;
    const expected = run.text[run.pos];
    if (c === expected) {
      run.correct++;
      run.pos++;
    } else {
      run.errors++;
      run.keyErrors[expected] = (run.keyErrors[expected] ?? 0) + 1;
      if (mode === 'free') run.pos++;
    }
  }
  return accepted;
}

export function progressOf(run: Run): number {
  return run.text.length === 0 ? 1 : Math.min(1, run.pos / run.text.length);
}

export function isFinished(run: Run): boolean {
  return run.pos >= run.text.length;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function netWpm(correct: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return round1(correct / 5 / (elapsedMs / 60000));
}

export function rawWpm(total: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return round1(total / 5 / (elapsedMs / 60000));
}

export function accuracyOf(correct: number, total: number): number {
  return total === 0 ? 100 : round1((correct / total) * 100);
}

export type PlayerStatus = 'termine' | 'temps_ecoule' | 'abandon';

export interface RankInput {
  id: string;
  status: PlayerStatus;
  /** Temps d'arrivée en ms (si terminé). */
  timeMs: number | null;
  /** Progression (0–1) à la fin du temps ou au moment de l'abandon. */
  progress: number;
}

/**
 * COURSE-10 : 1) ceux qui ont terminé, par temps d'arrivée ; 2) ceux qui n'ont pas terminé
 * avant la fin du temps, par progression ; 3) ceux qui ont abandonné, par progression à l'abandon.
 */
export function rankPlayers(players: RankInput[]): string[] {
  const group = (p: RankInput) => (p.status === 'termine' ? 0 : p.status === 'temps_ecoule' ? 1 : 2);
  return [...players]
    .sort((a, b) => {
      const g = group(a) - group(b);
      if (g !== 0) return g;
      if (group(a) === 0) return (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity);
      return b.progress - a.progress;
    })
    .map((p) => p.id);
}

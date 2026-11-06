import type { Rng } from './rng.js';

/**
 * BONUS-01 à BONUS-04 — bonus de remontée.
 * Points de contrôle : 25 %, 50 % et 75 % du texte, atteints par le meneur.
 * « En retard » : dernier au classement, ou à plus de 25 points de progression derrière le meneur.
 * Chaque joueur en retard reçoit au plus 3 bonus par course (plafond sur le bénéficiaire).
 * Types : « −3 mots » (aide le retardataire), « +3 mots » (ralentit le meneur), « brouillard » (ralentit le meneur).
 */
export const BONUS_TYPES = ['minus3', 'plus3', 'fog'] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export const CHECKPOINTS = [0.25, 0.5, 0.75] as const;
export const MAX_BONUSES_PER_PLAYER = 3;
export const LAG_THRESHOLD = 0.25;
export const FOG_DURATION_MS = 4000;

export interface BonusPlayer {
  id: string;
  progress: number;
  /** Actif : en course (ni terminé, ni abandonné, ni déconnecté). */
  active: boolean;
  bonusesReceived: number;
}

export interface BonusEvent {
  type: BonusType;
  /** Joueur qui subit l'effet (retardataire pour « −3 mots », meneur sinon). */
  targetId: string;
  /** Retardataire qui a déclenché le bonus. */
  beneficiaryId: string;
  checkpoint: number;
}

/**
 * Évalue le point de contrôle `checkpoint` : retourne les bonus à appliquer.
 * Fonction pure, déterministe pour un générateur à graine donné.
 */
export function evaluateCheckpoint(players: BonusPlayer[], checkpoint: number, rng: Rng): BonusEvent[] {
  const active = players.filter((p) => p.active);
  if (active.length < 2) return [];
  const leader = active.reduce((a, b) => (b.progress > a.progress ? b : a));
  const lowest = Math.min(...active.map((p) => p.progress));
  const events: BonusEvent[] = [];
  for (const p of active) {
    if (p.id === leader.id || p.bonusesReceived >= MAX_BONUSES_PER_PLAYER) continue;
    const behind = leader.progress - p.progress;
    const isLast = p.progress === lowest;
    if (!isLast && behind < LAG_THRESHOLD) continue;
    const type = rng.pick(BONUS_TYPES);
    events.push({ type, targetId: type === 'minus3' ? p.id : leader.id, beneficiaryId: p.id, checkpoint });
    p.bonusesReceived++;
  }
  return events;
}

/** BONUS-04 : retire les 3 derniers mots, sans jamais passer sous le mot en cours de frappe. */
export function removeLastWords(text: string, pos: number, count = 3): string {
  let end = text.length;
  for (let i = 0; i < count; i++) {
    const cut = text.lastIndexOf(' ', end - 1);
    if (cut === -1) break;
    end = cut;
  }
  // garde au moins le mot qui contient la position courante
  const wordEnd = text.indexOf(' ', pos);
  const minEnd = wordEnd === -1 ? text.length : wordEnd;
  return text.slice(0, Math.max(end, minEnd));
}

/** BONUS-04 : ajoute 3 mots de réserve à la fin du texte du meneur. */
export function appendWords(text: string, reserve: string[], used: number, count = 3): { text: string; used: number } {
  const extra = reserve.slice(used, used + count);
  if (extra.length === 0) return { text, used };
  return { text: `${text} ${extra.join(' ')}`, used: used + extra.length };
}

import { describe, expect, it } from 'vitest';
import { accuracyOf, applyKeys, isFinished, netWpm, newRun, progressOf, rankPlayers, rawWpm } from '../src/race/engine.js';

describe('applyKeys (COURSE-04, COURSE-06, CONF-08)', () => {
  it('avance sur les frappes correctes', () => {
    const run = newRun('chat noir');
    applyKeys(run, 'chat', 'correct', 5000);
    expect(run.pos).toBe(4);
    expect(run.correct).toBe(4);
    expect(progressOf(run)).toBeCloseTo(4 / 9);
  });

  it("mode correction : l'erreur bloque la progression mais est comptée", () => {
    const run = newRun('chat');
    applyKeys(run, 'cxat', 'correct', 5000);
    expect(run.pos).toBe(1);
    expect(run.errors).toBe(3); // x, a et t sont refusés tant que « h » n'est pas tapé
    expect(run.keyErrors).toEqual({ h: 3 });
    applyKeys(run, 'hat', 'correct', 5100);
    expect(isFinished(run)).toBe(true);
  });

  it('mode libre : la faute avance mais reste comptabilisée', () => {
    const run = newRun('chat');
    applyKeys(run, 'cxat', 'free', 5000);
    expect(isFinished(run)).toBe(true);
    expect(run.errors).toBe(1);
    expect(run.correct).toBe(3);
  });

  it('refuse toute frappe avant le départ', () => {
    const run = newRun('chat');
    expect(applyKeys(run, 'chat', 'correct', -10)).toBe(0);
    expect(run.pos).toBe(0);
  });

  it('rejette une vitesse impossible (saut de progression)', () => {
    const text = 'a'.repeat(500);
    const run = newRun(text);
    applyKeys(run, text, 'correct', 1000); // 500 frappes en 1 seconde
    expect(run.pos).toBeLessThan(40);
    expect(run.rejected).toBeGreaterThan(400);
  });

  it("ignore les frappes après la fin du texte", () => {
    const run = newRun('ab');
    applyKeys(run, 'abcd', 'correct', 5000);
    expect(run.total).toBe(2);
  });
});

describe('statistiques (annexe A)', () => {
  it('MPM net, MPM brut et précision', () => {
    expect(netWpm(300, 60000)).toBe(60);
    expect(rawWpm(330, 60000)).toBe(66);
    expect(accuracyOf(95, 100)).toBe(95);
    expect(accuracyOf(0, 0)).toBe(100);
    expect(netWpm(10, 0)).toBe(0);
  });
});

describe('classement (COURSE-10)', () => {
  it('terminés par temps, puis temps écoulé par progression, puis abandons', () => {
    const order = rankPlayers([
      { id: 'abandon-haut', status: 'abandon', timeMs: null, progress: 0.9 },
      { id: 'lent', status: 'termine', timeMs: 40000, progress: 1 },
      { id: 'ecoule-bas', status: 'temps_ecoule', timeMs: null, progress: 0.3 },
      { id: 'rapide', status: 'termine', timeMs: 20000, progress: 1 },
      { id: 'ecoule-haut', status: 'temps_ecoule', timeMs: null, progress: 0.8 },
    ]);
    expect(order).toEqual(['rapide', 'lent', 'ecoule-haut', 'ecoule-bas', 'abandon-haut']);
  });
});

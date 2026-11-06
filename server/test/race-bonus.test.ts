import { describe, expect, it } from 'vitest';
import { appendWords, BONUS_TYPES, evaluateCheckpoint, removeLastWords } from '../src/race/bonus.js';
import { createRng } from '../src/race/rng.js';

const p = (id: string, progress: number, bonusesReceived = 0, active = true) => ({ id, progress, active, bonusesReceived });

describe('bonus de remontée (BONUS-01 à BONUS-04)', () => {
  it("n'accorde rien à un joueur qui n'est ni dernier ni à 25 % du meneur", () => {
    const players = [p('a', 0.5), p('b', 0.45), p('c', 0.4)];
    // c est dernier : seul c reçoit un bonus
    const events = evaluateCheckpoint(players, 0.5, createRng(1));
    expect(events.map((e) => e.beneficiaryId)).toEqual(['c']);
  });

  it('accorde un bonus à un joueur à plus de 25 % derrière même sans être dernier', () => {
    const players = [p('a', 0.8), p('b', 0.3), p('c', 0.1)];
    const events = evaluateCheckpoint(players, 0.75, createRng(2));
    expect(events.map((e) => e.beneficiaryId).sort()).toEqual(['b', 'c']);
  });

  it("plafonne à 3 bonus par joueur et par course", () => {
    const players = [p('a', 0.8), p('b', 0.1, 3)];
    expect(evaluateCheckpoint(players, 0.75, createRng(3))).toEqual([]);
  });

  it('ignore les joueurs inactifs et ne fait rien en dessous de deux joueurs', () => {
    expect(evaluateCheckpoint([p('a', 0.5), p('b', 0.1, 0, false)], 0.5, createRng(1))).toEqual([]);
  });

  it('existe au moins 3 types dont un qui aide et un qui ralentit', () => {
    expect(BONUS_TYPES.length).toBeGreaterThanOrEqual(3);
    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const [e] = evaluateCheckpoint([p('a', 0.9), p('b', 0.1)], 0.75, createRng(seed));
      seen.add(e.type);
      if (e.type === 'minus3') expect(e.targetId).toBe('b');
      else expect(e.targetId).toBe('a');
    }
    expect(seen.size).toBe(3);
  });

  it('retire 3 mots sans passer sous le mot en cours', () => {
    expect(removeLastWords('un deux trois quatre cinq six', 2)).toBe('un deux trois');
    expect(removeLastWords('un deux trois quatre', 8)).toBe('un deux trois');
    // curseur dans le dernier mot : on garde au moins ce mot
    expect(removeLastWords('un deux trois quatre cinq', 21)).toBe('un deux trois quatre cinq');
  });

  it('ajoute 3 mots de réserve', () => {
    const r = appendWords('un deux', ['a', 'b', 'c', 'd'], 0);
    expect(r).toEqual({ text: 'un deux a b c', used: 3 });
    expect(appendWords(r.text, ['a', 'b', 'c', 'd'], r.used)).toEqual({ text: 'un deux a b c d', used: 4 });
  });
});

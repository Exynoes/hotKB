import { describe, expect, it } from 'vitest';
import { BOT_LEVELS, BOT_PROFILES, botStateAt, generateBotTimeline } from '../src/race/bots.js';
import { createRng } from '../src/race/rng.js';

const TEXT = 'Le petit chat dort sur le tapis rouge, pres de la fenetre. '.repeat(6).trim();

describe('bots (BOT-01 à BOT-05)', () => {
  it('est déterministe à partir de la graine (BOT-05)', () => {
    const a = generateBotTimeline(42, 'intermediaire', TEXT, 'correct');
    const b = generateBotTimeline(42, 'intermediaire', TEXT, 'correct');
    expect(a).toEqual(b);
    const c = generateBotTimeline(43, 'intermediaire', TEXT, 'correct');
    expect(c.events.length === a.events.length && c.events.at(-1)?.t === a.events.at(-1)?.t).toBe(false);
  });

  it('chaque niveau tape dans sa plage de MPM (BOT-01)', () => {
    for (const level of BOT_LEVELS) {
      const text = 'abcde '.repeat(200).trim();
      const tl = generateBotTimeline(7, level, text, 'correct');
      const last = tl.events.at(-1)!;
      const wpm = last.correct / 5 / (last.t / 60000);
      const { minWpm, maxWpm } = BOT_PROFILES[level];
      expect(tl.targetWpm).toBeGreaterThanOrEqual(minWpm);
      expect(tl.targetWpm).toBeLessThanOrEqual(maxWpm);
      // la vitesse effective reste du même ordre que la cible (variations, erreurs, hésitations)
      expect(wpm).toBeGreaterThan(minWpm * 0.5);
      expect(wpm).toBeLessThan(maxWpm * 1.3);
    }
  });

  it('la vitesse varie pendant la course (BOT-02)', () => {
    const tl = generateBotTimeline(5, 'expert', 'abcde '.repeat(150).trim(), 'correct');
    const intervals = tl.events.slice(1, 400).map((e, i) => e.t - tl.events[i].t);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    expect(Math.sqrt(variance) / mean).toBeGreaterThan(0.1);
  });

  it('fait des erreurs qui le ralentissent (BOT-03)', () => {
    const noob = generateBotTimeline(3, 'noob', TEXT, 'correct');
    expect(noob.events.at(-1)!.errors).toBeGreaterThan(0);
    // mode libre : la faute avance, donc moins de frappes au total qu'en mode correction
    const free = generateBotTimeline(3, 'noob', TEXT, 'free');
    expect(free.events.length).toBeLessThanOrEqual(TEXT.length);
    expect(noob.events.length).toBeGreaterThan(TEXT.length);
  });

  it('botStateAt retourne la position à un instant donné', () => {
    const tl = generateBotTimeline(9, 'expert', TEXT, 'correct');
    expect(botStateAt(tl, 0)).toBeNull();
    const mid = botStateAt(tl, tl.events.at(-1)!.t / 2)!;
    expect(mid.pos).toBeGreaterThan(0);
    expect(mid.pos).toBeLessThan(TEXT.length);
    expect(botStateAt(tl, 1e9)!.pos).toBe(TEXT.length);
  });
});

describe('générateur à graine', () => {
  it('reproduit la même suite', () => {
    const a = createRng(1);
    const b = createRng(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

import { describe, expect, it } from 'vitest';
import { applyOptions, classifyText, normalizeTypography, prepareText, type Passage } from '../src/race/text.js';
import { createRng } from '../src/race/rng.js';
import { DEFAULT_SETTINGS, parseSettingsUpdate, raceSettingsSchema } from '../src/race/settings.js';

const passages: Passage[] = [
  { id: '1', language: 'fr', complexity: 'easy', content: 'Le chat dort sur le lit. Il fait chaud ici, et la lune est belle ce soir. Nous allons jouer dehors avec le chien.' },
  { id: '2', language: 'fr', complexity: 'hard', content: "L'extraordinaire découverte du télescope révolutionna l'astronomie : « Où êtes-vous ? » demanda l'élève émerveillé." },
  { id: '3', language: 'en', complexity: 'easy', content: 'The cat sleeps on the bed. It is warm here and the moon is bright. We play outside with the dog.' },
];

describe('configuration (CONF-01 à CONF-12)', () => {
  it('valide les bornes', () => {
    expect(raceSettingsSchema.safeParse({ maxTimeSec: 10 }).success).toBe(false);
    expect(raceSettingsSchema.safeParse({ maxTimeSec: 601 }).success).toBe(false);
    expect(raceSettingsSchema.safeParse({ capacity: 1 }).success).toBe(false);
    expect(raceSettingsSchema.safeParse({ capacity: 31 }).success).toBe(false);
    expect(raceSettingsSchema.safeParse({ words: 5 }).success).toBe(false);
    expect(raceSettingsSchema.safeParse({ language: 'es' }).success).toBe(false);
  });

  it('a des défauts raisonnables', () => {
    expect(DEFAULT_SETTINGS.maxTimeSec).toBeNull();
    expect(DEFAULT_SETTINGS.errorMode).toBe('correct');
    expect(DEFAULT_SETTINGS.visibility).toBe('public');
  });

  it('accepte une mise à jour partielle', () => {
    expect(parseSettingsUpdate({ words: 60 })).toEqual({ ok: true, data: { words: 60 } });
    expect(parseSettingsUpdate({ words: 5 }).ok).toBe(false);
    expect(parseSettingsUpdate({ inconnu: 1 })).toEqual({ ok: true, data: {} });
  });
});

describe('texte (CONF-03 à CONF-07)', () => {
  it('classe la complexité avec des critères mesurables', () => {
    expect(classifyText(passages[0].content)).toBe('easy');
    expect(classifyText(passages[1].content)).toBe('hard');
  });

  it('applique les options de contenu', () => {
    const off = { punctuation: false, numbers: false, capitals: false, accents: false };
    expect(applyOptions('Éléphant,', off)).toBe('elephant');
    expect(applyOptions('42', off)).toBe('');
    expect(applyOptions("l'été", { ...off, accents: true })).toBe("l'été");
    expect(normalizeTypography('« Où ? » – dit-il…')).toBe('" Où ? " - dit-il...');
  });

  it('texte cohérent : prend un passage de la bonne langue et de la bonne longueur', () => {
    const s = raceSettingsSchema.parse({ language: 'en', words: 12 });
    const t = prepareText(s, createRng(1), passages);
    expect(t.source).toBe('corpus');
    expect(t.texteId).toBe('3');
    expect(t.words).toHaveLength(12);
    expect(t.reserve.length).toBeGreaterThan(0);
  });

  it("texte cohérent : l'exclusion de caractères ne garde que les passages compatibles, sinon repli aléatoire", () => {
    const s = raceSettingsSchema.parse({ words: 10, excludeChars: 'e' });
    const t = prepareText(s, createRng(2), passages);
    expect(t.fellBack).toBe(true);
    expect(t.words.join(' ').toLowerCase()).not.toContain('e');
  });

  it('texte aléatoire : respecte longueur, exclusions, inclusions et options', () => {
    const s = raceSettingsSchema.parse({
      textType: 'random',
      words: 80,
      includeChars: 'z',
      excludeChars: 'q',
      punctuation: false,
      capitals: false,
      accents: false,
      numbers: false,
      language: 'fr',
    });
    const t = prepareText(s, createRng(5), []);
    const text = t.words.join(' ');
    expect(t.words).toHaveLength(80);
    expect(text).not.toMatch(/[qQ]/);
    expect(text).not.toMatch(/[.,;:!?éèêàçùô0-9A-Z]/);
  });

  it('texte aléatoire : chiffres, majuscules et ponctuation quand demandés', () => {
    const s = raceSettingsSchema.parse({ textType: 'random', words: 150, numbers: true, punctuation: true, capitals: true });
    const text = prepareText(s, createRng(8), []).words.join(' ');
    expect(text).toMatch(/[0-9]/);
    expect(text).toMatch(/[A-Z]/);
    expect(text).toMatch(/[.,]/);
  });

  it('est déterministe pour une graine donnée', () => {
    const s = raceSettingsSchema.parse({ textType: 'random', words: 30 });
    expect(prepareText(s, createRng(11), [])).toEqual(prepareText(s, createRng(11), []));
  });
});

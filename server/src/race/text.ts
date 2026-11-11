import type { Rng } from './rng.js';
import type { RaceSettings } from './settings.js';
import { WORDS } from './words.js';

/** Critères mesurables de complexité (CONF-05), appliqués aux mots d'un texte ou d'un dictionnaire. */
export type Complexity = 'easy' | 'medium' | 'hard';

export interface TextMetrics {
  avgWordLength: number;
  specialShare: number;
}

const SPECIAL = /[^a-zA-Z\s]/g;

export function textMetrics(words: string[]): TextMetrics {
  const joined = words.join('');
  const length = Math.max(1, joined.length);
  const letters = words.reduce((n, w) => n + w.length, 0) / Math.max(1, words.length);
  return { avgWordLength: letters, specialShare: (joined.match(SPECIAL)?.length ?? 0) / length };
}

/**
 * Facile : mots courts (longueur moyenne ≤ 4,8) et très peu de caractères spéciaux (≤ 6 %).
 * Difficile : mots longs (≥ 6,0) ou beaucoup de caractères spéciaux (≥ 12 %).
 * Moyen : tout le reste.
 */
export function classifyWords(words: string[]): Complexity {
  const m = textMetrics(words);
  if (m.avgWordLength >= 6 || m.specialShare >= 0.12) return 'hard';
  if (m.avgWordLength <= 4.8 && m.specialShare <= 0.06) return 'easy';
  return 'medium';
}

export function classifyText(content: string): Complexity {
  return classifyWords(content.split(/\s+/).filter(Boolean));
}

/** Classe un mot isolé pour le dictionnaire (texte aléatoire). */
export function wordComplexity(word: string): Complexity {
  const specials = (word.match(SPECIAL)?.length ?? 0) > 0;
  if (word.length >= 9 || (specials && word.length >= 7)) return 'hard';
  if (word.length <= 5 && !specials) return 'easy';
  return 'medium';
}

/** Typographie : caractères faciles à taper, sans guillemets ni tirets typographiques. */
export function normalizeTypography(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAccents(s: string): string {
  return s
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** CONF-06 : applique ponctuation, nombres, majuscules et accents à un mot. */
export function applyOptions(word: string, s: Pick<RaceSettings, 'punctuation' | 'numbers' | 'capitals' | 'accents'>): string {
  let w = normalizeTypography(word);
  if (!s.accents) w = stripAccents(w);
  if (!s.capitals) w = w.toLowerCase();
  if (!s.punctuation) w = w.replace(/[.,;:!?"()\-]/g, '');
  if (!s.numbers) w = w.replace(/[0-9]/g, '');
  return w;
}

function hasExcluded(text: string, exclude: string): boolean {
  if (!exclude) return false;
  const lower = text.toLowerCase();
  return [...exclude.toLowerCase()].some((c) => c !== ' ' && lower.includes(c));
}

export interface Passage {
  id: string;
  content: string;
  language: string;
  complexity: string;
}

export interface PreparedText {
  words: string[];
  /** Mots de réserve pour les bonus « +3 mots » (BONUS-02), jamais révélés avant d'être utilisés. */
  reserve: string[];
  source: 'corpus' | 'random';
  texteId: string | null;
  /** Vrai si la configuration demandée (cohérent) n'a trouvé aucun passage compatible. */
  fellBack: boolean;
}

const RESERVE_WORDS = 12;

function randomWords(settings: RaceSettings, rng: Rng, count: number): string[] {
  const dict = WORDS[settings.language];
  const transform = (w: string) => applyOptions(w, settings);
  let pool = dict.map(transform).filter((w) => w.length > 0 && !hasExcluded(w, settings.excludeChars));
  const byLevel = pool.filter((w) => {
    const c = wordComplexity(w);
    if (settings.complexity === 'easy') return c === 'easy' || (c === 'medium' && w.length <= 6);
    if (settings.complexity === 'medium') return c !== 'hard';
    return true;
  });
  if (byLevel.length >= 20) pool = byLevel;
  const wanted = settings.complexity === 'hard' ? pool.filter((w) => w.length >= 6) : pool;
  if (wanted.length >= 20) pool = wanted;

  const include = [...new Set(settings.includeChars.toLowerCase().replace(/\s/g, ''))];
  const withInclude = include.length ? pool.filter((w) => include.some((c) => w.toLowerCase().includes(c))) : [];

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w =
      withInclude.length && rng() < 0.4 ? rng.pick(withInclude) : rng.pick(pool.length ? pool : ['mot']);
    if (settings.capitals && (i === 0 || rng() < 0.12)) w = w[0].toUpperCase() + w.slice(1);
    if (settings.numbers && rng() < 0.1) {
      const n = String(Math.floor(rng() * 90) + 2);
      if (!hasExcluded(n, settings.excludeChars)) w = n;
    }
    if (settings.punctuation && i < count - 1 && rng() < 0.1) w += rng() < 0.7 ? ',' : '.';
    out.push(w);
  }
  if (settings.punctuation && count > 0) {
    const last = out[count - 1];
    if (!/[.!?]$/.test(last)) out[count - 1] = last.replace(/[,;:]$/, '') + '.';
  }
  return out;
}

/**
 * CONF-03 à CONF-07 : prépare le texte d'une course.
 * - cohérent : passages du corpus de la bonne langue et complexité ; l'exclusion de caractères ne garde que les passages compatibles ;
 *   l'inclusion de caractères ne s'applique pas (documenté) ; sans passage compatible, repli sur un texte aléatoire.
 * - aléatoire : mots du dictionnaire filtrés par complexité et exclusions, avec favorisation des caractères à inclure.
 */
export function prepareText(settings: RaceSettings, rng: Rng, passages: Passage[]): PreparedText {
  const total = settings.words + RESERVE_WORDS;
  if (settings.textType === 'coherent') {
    const inLang = passages.filter((p) => p.language === settings.language);
    const prepared = (p: Passage) => p.content.split(/\s+/).map((w) => applyOptions(w, settings)).filter(Boolean);
    const compatible = (list: Passage[]) => list.filter((p) => !hasExcluded(prepared(p).join(' '), settings.excludeChars));
    // sans passage de la complexité demandée, on prend la plus proche (facile → moyen avant difficile)
    const order = { easy: ['easy', 'medium', 'hard'], medium: ['medium', 'easy', 'hard'], hard: ['hard', 'medium', 'easy'] }[settings.complexity];
    let candidates: Passage[] = [];
    for (const level of order) {
      candidates = compatible(inLang.filter((p) => p.complexity === level));
      if (candidates.length > 0) break;
    }
    if (candidates.length > 0) {
      const first = rng.pick(candidates);
      let words = prepared(first);
      for (const p of rng.shuffle(candidates.filter((c) => c.id !== first.id))) {
        if (words.length >= total) break;
        words = words.concat(prepared(p));
      }
      if (words.length >= settings.words) {
        const extra = words.length - settings.words;
        const reserve =
          extra >= RESERVE_WORDS
            ? words.slice(settings.words, settings.words + RESERVE_WORDS)
            : [...words.slice(settings.words), ...randomWords(settings, rng, RESERVE_WORDS - extra)];
        return { words: words.slice(0, settings.words), reserve, source: 'corpus', texteId: first.id, fellBack: false };
      }
    }
    const rnd = randomWords(settings, rng, total);
    return { words: rnd.slice(0, settings.words), reserve: rnd.slice(settings.words), source: 'random', texteId: null, fellBack: true };
  }
  const rnd = randomWords(settings, rng, total);
  return { words: rnd.slice(0, settings.words), reserve: rnd.slice(settings.words), source: 'random', texteId: null, fellBack: false };
}

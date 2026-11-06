import { z } from 'zod';

/**
 * CONF-01 à CONF-12 — configuration d'une salle et de ses courses.
 * Un seul schéma sert à valider les messages temps réel (TECH-07) et à documenter les défauts.
 */
export const raceSettingsSchema = z.object({
  /** CONF-01 : durée maximale en secondes (30 s à 10 min) ou aucune limite. */
  maxTimeSec: z.number().int().min(30).max(600).nullable().default(null),
  /** CONF-02 : langue du texte, indépendante de la langue de l'interface. */
  language: z.enum(['fr', 'en']).default('fr'),
  /** CONF-03 : texte cohérent (corpus) ou aléatoire (dictionnaire). */
  textType: z.enum(['coherent', 'random']).default('coherent'),
  /** CONF-04 : longueur en nombre de mots. */
  words: z.number().int().min(10).max(200).default(40),
  /** CONF-05 : complexité (critères mesurables dans text.ts). */
  complexity: z.enum(['easy', 'medium', 'hard']).default('easy'),
  /** CONF-06 : options de contenu. */
  punctuation: z.boolean().default(true),
  numbers: z.boolean().default(false),
  capitals: z.boolean().default(true),
  accents: z.boolean().default(true),
  /** CONF-07 : caractères à inclure ou exclure (texte aléatoire ; en mode cohérent, seule l'exclusion s'applique). */
  includeChars: z.string().max(10).default(''),
  excludeChars: z.string().max(10).default(''),
  /** CONF-08 : correction obligatoire ou mode libre. */
  errorMode: z.enum(['correct', 'free']).default('correct'),
  /** CONF-09 : bonus de remontée. */
  bonuses: z.boolean().default(true),
  /** CONF-11 / SALLE-03 / SALLE-05 : visibilité et capacité. */
  visibility: z.enum(['public', 'code', 'private']).default('public'),
  capacity: z.number().int().min(2).max(30).default(8),
});

export type RaceSettings = z.infer<typeof raceSettingsSchema>;
export const DEFAULT_SETTINGS: RaceSettings = raceSettingsSchema.parse({});

const partialSchema = raceSettingsSchema.partial();

/**
 * Mise à jour partielle envoyée par l'hôte : ne retient que les champs réellement envoyés
 * (les défauts du schéma ne doivent pas écraser les réglages existants).
 */
export function parseSettingsUpdate(
  input: unknown,
): { ok: true; data: Partial<RaceSettings> } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: 'Réglages invalides.' };
  const parsed = partialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Réglages invalides.' };
  const sent = new Set(Object.keys(input));
  const data = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => sent.has(k))) as Partial<RaceSettings>;
  return { ok: true, data };
}

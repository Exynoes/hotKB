import { z } from 'zod';

/** TECH-07 — schémas de validation de toutes les entrées côté serveur. */

export const registerSchema = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,20}$/, "Le nom d'utilisateur doit contenir 3 à 20 caractères (lettres, chiffres, - ou _)."),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.').max(200),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export const guestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, 'Le pseudonyme doit contenir 3 à 20 caractères.')
    .max(20, 'Le pseudonyme doit contenir 3 à 20 caractères.'),
});

/** Messages temps réel */
export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, 'Code de salle invalide.'),
});

const role = z.enum(['player', 'spectator']);

/** Messages temps réel de salle et de course (TECH-07) — chaque message entrant est validé avant tout traitement. */
export const createRoomSchema = z
  .object({ settings: z.record(z.string(), z.unknown()).optional(), role: role.optional() })
  .optional()
  .default({});

export const joinAnySchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/).optional(),
    token: z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
    role: role.optional(),
  })
  .refine((v) => v.code || v.token, { message: 'Code ou lien requis.' });

export const roleSchema = z.object({ role });
export const botSchema = z.object({ level: z.enum(['noob', 'debutant', 'intermediaire', 'expert', 'impossible']) });
export const idSchema = z.object({ id: z.string().min(1).max(64) });
export const keysSchema = z.object({ keys: z.string().min(1).max(64) });

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.';
}

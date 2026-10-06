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
    .min(2, 'Le nom affiché doit contenir 2 à 20 caractères.')
    .max(20, 'Le nom affiché doit contenir 2 à 20 caractères.'),
});

/** Messages temps réel */
export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, 'Code de salle invalide.'),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.';
}

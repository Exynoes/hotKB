import { describe, expect, it } from 'vitest';
import { guestSchema, joinRoomSchema, registerSchema } from '../src/schemas.js';

describe('schémas Zod (TECH-07)', () => {
  it('refuse un nom d\'utilisateur invalide', () => {
    expect(registerSchema.safeParse({ username: 'a b', password: 'secret1' }).success).toBe(false);
  });
  it('accepte une inscription valide', () => {
    expect(registerSchema.safeParse({ username: 'camille_01', password: 'secret1' }).success).toBe(true);
  });
  it('refuse un mot de passe trop court', () => {
    expect(registerSchema.safeParse({ username: 'camille', password: '123' }).success).toBe(false);
  });
  it('nettoie le nom invité', () => {
    const r = guestSchema.safeParse({ displayName: '  Léa  ' });
    expect(r.success && r.data.displayName).toBe('Léa');
  });
  it('normalise et valide le code de salle (6 caractères)', () => {
    const ok = joinRoomSchema.safeParse({ code: ' abc234 ' });
    expect(ok.success && ok.data.code).toBe('ABC234');
    expect(joinRoomSchema.safeParse({ code: 'ABC' }).success).toBe(false);
    expect(joinRoomSchema.safeParse(null).success).toBe(false);
  });
});

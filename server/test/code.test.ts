import { describe, expect, it } from 'vitest';
import { generateRoomCode } from '../src/rooms/code.js';

describe('generateRoomCode', () => {
  it('génère un code de 6 caractères', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("n'utilise jamais de caractères ambigus (0, O, 1, I)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('produit des codes variés (pas toujours le même)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

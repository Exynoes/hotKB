import { beforeEach, describe, expect, it } from 'vitest';
import { allowJoinAttempt, resetJoinAttempts } from '../src/rooms/rateLimit.js';

describe('limite de tentatives (SALLE-10)', () => {
  beforeEach(() => resetJoinAttempts());

  it('autorise 10 tentatives par minute puis bloque', () => {
    for (let i = 0; i < 10; i++) expect(allowJoinAttempt('1.2.3.4', 1000)).toBe(true);
    expect(allowJoinAttempt('1.2.3.4', 1000)).toBe(false);
  });

  it('compte par adresse IP et se réinitialise après la fenêtre', () => {
    for (let i = 0; i < 10; i++) allowJoinAttempt('1.2.3.4', 1000);
    expect(allowJoinAttempt('5.6.7.8', 1000)).toBe(true);
    expect(allowJoinAttempt('1.2.3.4', 1000 + 61_000)).toBe(true);
  });
});

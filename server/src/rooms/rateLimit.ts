/**
 * SALLE-10 — limite de tentatives de saisie d'un code de salle, par adresse IP
 * (fenêtre glissante, en mémoire : suffisant pour un seul processus).
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();

export function allowJoinAttempt(ip: string, now = Date.now()): boolean {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(ip, recent);
    return false;
  }
  recent.push(now);
  attempts.set(ip, recent);
  return true;
}

export function resetJoinAttempts() {
  attempts.clear();
}

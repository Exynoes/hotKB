const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I pour éviter la confusion

/** Génère un code de salle à 5 caractères, lisible à voix haute (LOBBY-2). */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

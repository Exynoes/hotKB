import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { personalBests, raceResults, races, roomParticipants, rooms, textes, users } from './schema.js';

/**
 * Données de démonstration (TECH-04) : corpus de textes (domaine public),
 * compte de démonstration et historique de courses. Idempotent.
 */

export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'demo1234';

const CORPUS: { language: 'fr' | 'en'; content: string }[] = [
  {
    language: 'fr',
    content:
      "Maître Corbeau, sur un arbre perché, tenait en son bec un fromage. Maître Renard, par l'odeur alléché, lui tint à peu près ce langage : Et bonjour, Monsieur du Corbeau. Que vous êtes joli ! que vous me semblez beau ! Sans mentir, si votre ramage se rapporte à votre plumage, vous êtes le Phénix des hôtes de ces bois.",
  },
  {
    language: 'fr',
    content:
      "Demain, dès l'aube, à l'heure où blanchit la campagne, je partirai. Vois-tu, je sais que tu m'attends. J'irai par la forêt, j'irai par la montagne. Je ne puis demeurer loin de toi plus longtemps. Je marcherai les yeux fixés sur mes pensées, sans rien voir au dehors, sans entendre aucun bruit, seul, inconnu, le dos courbé, les mains croisées, triste, et le jour pour moi sera comme la nuit.",
  },
  {
    language: 'en',
    content:
      'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, and what is the use of a book, thought Alice, without pictures or conversations?',
  },
  {
    language: 'en',
    content:
      'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
  },
];

export async function seed() {
  // 1. Corpus de textes
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(textes);
  if (count === 0) {
    await db.insert(textes).values(
      CORPUS.map((t) => ({
        content: t.content,
        language: t.language,
        length: t.content.split(/\s+/).length,
        containsAccents: /[àâäçéèêëîïôöùûüÿ]/i.test(t.content),
      })),
    );
    console.log(`[seed] ${CORPUS.length} textes insérés`);
  }

  // 2. Compte de démonstration
  let [demo] = await db.select().from(users).where(eq(users.username, DEMO_USERNAME));
  if (!demo) {
    [demo] = await db
      .insert(users)
      .values({
        username: DEMO_USERNAME,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        authProvider: 'local',
      })
      .returning();
    console.log('[seed] compte de démonstration créé');
  }

  // 3. Historique de courses du compte de démonstration
  const [hasHistory] = await db
    .select({ id: roomParticipants.id })
    .from(roomParticipants)
    .where(eq(roomParticipants.userId, demo.id))
    .limit(1);
  if (!hasHistory) {
    const allTextes = await db.select().from(textes);
    const wpms = [38, 42, 47, 51, 55];
    for (let i = 0; i < wpms.length; i++) {
      const texte = allTextes[i % allTextes.length];
      const code = `D${String(i + 1).padStart(2, '0')}EMO`;
      const [room] = await db
        .insert(rooms)
        .values({ code, visibility: 'open', hostUserId: demo.id, status: 'resultats' })
        .returning();
      const [participant] = await db
        .insert(roomParticipants)
        .values({ roomId: room.id, userId: demo.id })
        .returning();
      const [race] = await db
        .insert(races)
        .values({
          roomId: room.id,
          texteId: texte.id,
          startedAt: new Date(Date.now() - (wpms.length - i) * 86_400_000),
          durationSeconds: 60,
          status: 'terminee',
        })
        .returning();
      await db.insert(raceResults).values({
        raceId: race.id,
        participantId: participant.id,
        wpm: wpms[i],
        accuracy: 94 + i,
        rank: 1,
        errorsCount: 8 - i,
      });
    }
    const first = allTextes[0];
    await db
      .insert(personalBests)
      .values({ userId: demo.id, texteId: first.id, bestWpm: 55, bestTime: 60 })
      .onConflictDoNothing();
    console.log('[seed] historique de démonstration créé');
  }
}

// Exécution directe (npm run seed) uniquement — l'import (tests) n'a pas d'effet de bord.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[seed] échec', err);
      process.exit(1);
    });
}

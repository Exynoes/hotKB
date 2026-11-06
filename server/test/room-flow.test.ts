import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetJoinAttempts } from '../src/rooms/rateLimit.js';
import type { Socket } from 'socket.io-client';
import { seed } from '../src/seed.js';
import { client, emitAck, registerGuest, registerUser, sleep, startRealtime, typeText, waitFor } from './helpers.js';

process.env.COUNTDOWN_MS = '300';
process.env.RECONNECT_GRACE_MS = '600';

let rt: Awaited<ReturnType<typeof startRealtime>>;
const sockets: Socket[] = [];
const track = (s: Socket) => (sockets.push(s), s);

beforeAll(async () => {
  await seed();
  rt = await startRealtime();
});
beforeEach(() => resetJoinAttempts());
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await rt.close();
});

interface Ack {
  ok: boolean;
  error?: string;
  code?: string;
  youId?: string;
  state?: { code: string; status: string; settings: Record<string, unknown>; members: { id: string; name: string; isHost: boolean; role: string; kind: string }[] };
}

describe('salles (SALLE-01 à 10, JOIN-01, AUTH-03)', () => {
  it("un invité ne peut pas créer de salle (AUTH-03)", async () => {
    const g = track(client(rt.url, (await registerGuest('Invite')).token));
    const res = await emitAck<Ack>(g, 'room:create', {});
    expect(res).toMatchObject({ ok: false, error: 'ACCOUNT_REQUIRED' });
  });

  it('crée une salle à code de 6 caractères sans caractères ambigus, rejoint par code, et refuse un code invalide', async () => {
    const host = track(client(rt.url, (await registerUser('h')).token));
    const created = await emitAck<Ack>(host, 'room:create', {});
    expect(created.ok).toBe(true);
    expect(created.state!.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created.state!.members[0].isHost).toBe(true);

    const guest = track(client(rt.url, (await registerGuest('Joueur')).token));
    const bad = await emitAck<Ack>(guest, 'room:join', { code: 'AAAAAA' });
    expect(bad.error).toBe('ROOM_NOT_FOUND');
    const joined = await emitAck<Ack>(guest, 'room:join', { code: created.state!.code.toLowerCase() });
    expect(joined.ok).toBe(true);
    expect(joined.state!.members).toHaveLength(2);
  });

  it('une personne ne peut être que dans une salle à la fois, et un second onglet ne crée pas de doublon (SALLE-06)', async () => {
    const u = await registerUser('s6');
    const a = track(client(rt.url, u.token));
    const first = await emitAck<Ack>(a, 'room:create', {});
    const again = await emitAck<Ack>(a, 'room:create', {});
    expect(again).toMatchObject({ ok: false, error: 'ALREADY_IN_ROOM', code: first.state!.code });

    const tab2 = track(client(rt.url, u.token));
    const same = await emitAck<Ack>(tab2, 'room:join', { code: first.state!.code });
    expect(same.ok).toBe(true);
    expect(same.state!.members).toHaveLength(1); // pas de doublon

    const other = track(client(rt.url, (await registerUser('s6b')).token));
    const room2 = await emitAck<Ack>(other, 'room:create', {});
    const cross = await emitAck<Ack>(other, 'room:join', { code: first.state!.code });
    expect(cross).toMatchObject({ ok: false, error: 'ALREADY_IN_ROOM', code: room2.state!.code });
  });

  it('respecte la capacité (SALLE-05) et la visibilité privée (SALLE-03)', async () => {
    const host = track(client(rt.url, (await registerUser('cap')).token));
    const created = await emitAck<Ack>(host, 'room:create', { settings: { capacity: 2, visibility: 'private' } });
    const code = created.state!.code;
    const g1 = track(client(rt.url, (await registerGuest('Alpha')).token));
    expect((await emitAck<Ack>(g1, 'room:join', { code })).error).toBe('ROOM_PRIVATE');

    await emitAck(host, 'settings:update', { visibility: 'code' });
    expect((await emitAck<Ack>(g1, 'room:join', { code })).ok).toBe(true);
    const g2 = track(client(rt.url, (await registerGuest('Bravo')).token));
    expect((await emitAck<Ack>(g2, 'room:join', { code })).error).toBe('ROOM_FULL');
    // un spectateur ne compte pas dans la capacité
    expect((await emitAck<Ack>(g2, 'room:join', { code, role: 'spectator' })).ok).toBe(true);
  });

  it("n'autorise que l'hôte à configurer, expulser, créer des liens, démarrer et fermer (SEC-01)", async () => {
    const host = track(client(rt.url, (await registerUser('sec')).token));
    const { state } = await emitAck<Ack>(host, 'room:create', {});
    const guest = track(client(rt.url, (await registerGuest('Intrus')).token));
    const joined = await emitAck<Ack>(guest, 'room:join', { code: state!.code });
    for (const [event, payload] of [
      ['settings:update', { words: 20 }],
      ['member:kick', { id: state!.members[0].id }],
      ['invite:create', undefined],
      ['bot:add', { level: 'noob' }],
      ['room:start', undefined],
      ['room:close', undefined],
    ] as const) {
      const res = await emitAck<Ack>(guest, event, payload);
      expect(res.error, event).toBe('NOT_HOST');
    }
    expect(joined.ok).toBe(true);
  });

  it("valide la configuration côté serveur (TECH-07, CONF-01, CONF-04, CONF-11)", async () => {
    const host = track(client(rt.url, (await registerUser('val')).token));
    await emitAck<Ack>(host, 'room:create', {});
    for (const bad of [{ maxTimeSec: 5 }, { words: 5000 }, { capacity: 99 }, { language: 'es' }, { errorMode: 'x' }]) {
      expect((await emitAck<Ack>(host, 'settings:update', bad)).error).toBe('INVALID_INPUT');
    }
    expect((await emitAck<Ack>(host, 'settings:update', { maxTimeSec: 60, words: 25, capacity: 4 })).ok).toBe(true);
  });

  it("la configuration est diffusée en direct à tous (CONF-12)", async () => {
    const host = track(client(rt.url, (await registerUser('cfg')).token));
    const { state } = await emitAck<Ack>(host, 'room:create', {});
    const guest = track(client(rt.url, (await registerGuest('Voit')).token));
    await emitAck(guest, 'room:join', { code: state!.code });
    const seen = waitFor<Ack['state']>(guest, 'room:state', (s) => s!.settings.words === 33);
    await emitAck(host, 'settings:update', { words: 33 });
    expect((await seen)!.settings.words).toBe(33);
  });

  it("liens d'invitation : usage unique lié à la personne, salle privée accessible seulement par lien, révocation à l'expulsion (SALLE-04, SALLE-07)", async () => {
    const host = track(client(rt.url, (await registerUser('inv')).token));
    const { state } = await emitAck<Ack>(host, 'room:create', { settings: { visibility: 'private' } });
    const invites = waitFor<{ id: string; token: string; status: string }[]>(host, 'room:invites', (l) => l.length === 1);
    await emitAck(host, 'invite:create');
    const [invite] = await invites;
    expect(invite.token.length).toBeGreaterThanOrEqual(32); // 24 octets = 192 bits
    expect(invite.status).toBe('unused');

    const guestA = await registerGuest('Alice');
    const a = track(client(rt.url, guestA.token));
    expect((await emitAck<Ack>(a, 'room:join', { code: state!.code })).error).toBe('ROOM_PRIVATE');
    const used = await emitAck<Ack>(a, 'room:join', { token: invite.token });
    expect(used.ok).toBe(true);

    // une autre personne avec le même lien est refusée
    const b = track(client(rt.url, (await registerGuest('Bob')).token));
    expect((await emitAck<Ack>(b, 'room:join', { token: invite.token })).error).toBe('INVITE_USED');
    // jeton inconnu
    expect((await emitAck<Ack>(b, 'room:join', { token: 'x'.repeat(32) })).error).toBe('INVITE_INVALID');

    // la personne associée se reconnecte avec le même lien
    await emitAck(a, 'room:leave');
    const again = track(client(rt.url, guestA.token));
    const rejoined = await emitAck<Ack>(again, 'room:join', { token: invite.token });
    expect(rejoined.ok).toBe(true);

    // expulsion : plus de retour possible, lien révoqué
    const aliceId = rejoined.youId!;
    const kicked = waitFor(again, 'room:kicked');
    expect((await emitAck<Ack>(host, 'member:kick', { id: aliceId })).ok).toBe(true);
    await kicked;
    expect((await emitAck<Ack>(again, 'room:join', { token: invite.token })).error).toBe('INVITE_INVALID');
    const lastGuest = track(client(rt.url, guestA.token));
    expect((await emitAck<Ack>(lastGuest, 'room:join', { code: state!.code })).error).toBe('KICKED');
  });

  it("l'hôte passe à la personne connectée présente depuis le plus longtemps ; la salle ferme sans humain (SALLE-08)", async () => {
    const host = track(client(rt.url, (await registerUser('tr')).token));
    const { state } = await emitAck<Ack>(host, 'room:create', {});
    const first = track(client(rt.url, (await registerGuest('Premier')).token));
    await emitAck(first, 'room:join', { code: state!.code });
    await sleep(20);
    const second = track(client(rt.url, (await registerGuest('Second')).token));
    await emitAck(second, 'room:join', { code: state!.code });
    const next = waitFor<NonNullable<Ack['state']>>(second, 'room:state', (s) => s.members.some((m) => m.name === 'Premier' && m.isHost));
    host.emit('room:leave');
    expect((await next).members.find((m) => m.isHost)!.name).toBe('Premier');

    const closed = waitFor(second, 'room:closed');
    first.emit('room:leave');
    second.emit('room:leave');
    await closed.catch(() => undefined);
    const gone = track(client(rt.url, (await registerGuest('Tard')).token));
    expect((await emitAck<Ack>(gone, 'room:join', { code: state!.code })).error).toBe('ROOM_NOT_FOUND');
  });

  it('explorateur de salles publiques et partie rapide (JOIN-02, JOIN-03)', async () => {
    const watcher = track(client(rt.url, (await registerGuest('Curieux')).token));
    const empty = await emitAck<{ ok: boolean; rooms: unknown[] }>(watcher, 'explorer:subscribe');
    expect(empty.ok).toBe(true);

    const hostA = track(client(rt.url, (await registerUser('exa')).token));
    const hostB = track(client(rt.url, (await registerUser('exb')).token));
    const list1 = waitFor<{ code: string }[]>(watcher, 'explorer:list', (l) => l.length >= 2);
    const a = await emitAck<Ack>(hostA, 'room:create', { settings: { capacity: 10, language: 'en', complexity: 'hard' } });
    const b = await emitAck<Ack>(hostB, 'room:create', { settings: { capacity: 3 } });
    const listed = await list1;
    const roomA = listed.find((r) => r.code === a.state!.code) as unknown as Record<string, unknown>;
    expect(roomA).toMatchObject({ capacity: 10, language: 'en', complexity: 'hard', count: 1, joinable: true });
    expect(roomA.hostName).toBeTruthy();

    // la salle B (capacité 3, 1 présent) est la plus proche de sa capacité maximale
    const g = track(client(rt.url, (await registerGuest('Rapide')).token));
    const quick = await emitAck<Ack>(g, 'room:quick');
    expect(quick.ok).toBe(true);
    expect(quick.state!.code).toBe(b.state!.code);
  });

  it("partie rapide sans salle disponible : message d'absence", async () => {
    const g = track(client(rt.url, (await registerGuest('Seul')).token));
    // on s'assure qu'aucune salle publique n'est joignable en refermant toutes celles des tests précédents
    const m = (await import('../src/rooms/handlers.js')).getManager()!;
    for (const room of [...m.rooms.values()]) await m.closeRoom(room);
    expect((await emitAck<Ack>(g, 'room:quick')).error).toBe('NO_PUBLIC_ROOM');
  });
});

describe('course (COURSE-01 à 11, BOT, RES-05, HIST-01)', () => {
  it('déroule une course complète : décompte, texte caché avant, frappe, classement, résultats persistés', async () => {
    const user = await registerUser('race');
    const host = track(client(rt.url, user.token));
    const created = await emitAck<Ack>(host, 'room:create', {
      settings: { words: 10, textType: 'random', language: 'fr', complexity: 'easy', bonuses: false, maxTimeSec: 60, punctuation: false, capitals: false, accents: false, numbers: false },
    });
    const code = created.state!.code;

    // COURSE-02 : démarrage impossible seul
    expect((await emitAck<Ack>(host, 'room:start')).error).toBe('NEED_PLAYERS');
    // un seul humain + un bot suffit
    expect((await emitAck<Ack>(host, 'bot:add', { level: 'impossible' })).ok).toBe(true);
    const spectator = track(client(rt.url, (await registerGuest('Spectateur')).token));
    await emitAck(spectator, 'room:join', { code, role: 'spectator' });

    const startHost = waitFor<{ startsAt: number; text: string | null; serverNow: number }>(host, 'race:start');
    const startSpec = waitFor<{ text: string | null }>(spectator, 'race:start');
    const ticks: { players: { id: string; p: number }[] }[] = [];
    host.on('race:tick', (t) => ticks.push(t));
    const resultsP = waitFor<{ raceId: string; players: { id: string; rank: number; status: string; wpm: number; accuracy: number; series: unknown[] }[]; text: string }>(host, 'race:results', () => true, 20000);

    expect((await emitAck<Ack>(host, 'room:start')).ok).toBe(true);
    const start = await startHost;
    expect(start.text).toBeTruthy(); // le coureur reçoit le texte avec le décompte
    expect((await startSpec).text).toBeNull(); // le spectateur ne tape pas (COURSE-05)

    // frappes avant le départ : ignorées (COURSE-03)
    host.emit('race:keys', { keys: start.text!.slice(0, 5) });
    await sleep(Math.max(0, start.startsAt - Date.now()) + 50);
    await typeText(host, start.text!);

    const results = await resultsP;
    expect(results.text).toBe(start.text);
    const me = results.players.find((p) => p.id === created.youId)!;
    expect(me.status).toBe('termine');
    expect([1, 2]).toContain(me.rank); // course serrée contre le bot « impossible »
    expect(me.wpm).toBeGreaterThan(0);
    expect(me.accuracy).toBe(100);
    expect(me.series.length).toBeGreaterThan(0);
    expect(results.players).toHaveLength(2); // le spectateur n'est pas un participant
    expect(ticks.length).toBeGreaterThan(3); // diffusion de la piste en direct
    expect(ticks[0].players.map((p) => p.id)).toContain(created.youId);

    // HIST-01 : la course apparaît dans l'historique du compte (RES-05)
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    const hist = await request(app).get('/api/me/history?page=1&pageSize=5').set('Authorization', `Bearer ${user.token}`);
    expect(hist.body.total).toBe(1);
    expect(hist.body.items[0].raceId).toBe(results.raceId);

    // HIST-02 : détail réservé aux participants
    const detail = await request(app).get(`/api/races/${results.raceId}`).set('Authorization', `Bearer ${user.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.text).toBe(start.text);
    const outsider = await registerUser('out');
    const denied = await request(app).get(`/api/races/${results.raceId}`).set('Authorization', `Bearer ${outsider.token}`);
    expect(denied.status).toBe(404);
  }, 30000);

  it('abandon : le coureur qui abandonne est classé après ceux qui terminent (COURSE-07, COURSE-10)', async () => {
    const host = track(client(rt.url, (await registerUser('tm')).token));
    const created = await emitAck<Ack>(host, 'room:create', { settings: { words: 12, textType: 'random', maxTimeSec: 30 } });
    await emitAck(host, 'bot:add', { level: 'impossible' });
    const start = waitFor<{ startsAt: number; text: string }>(host, 'race:start');
    const results = waitFor<{ players: { id: string; status: string; rank: number }[] }>(host, 'race:results', () => true, 15000);
    await emitAck(host, 'room:start');
    const s = await start;
    await sleep(Math.max(0, s.startsAt - Date.now()) + 500);
    host.emit('race:keys', { keys: s.text.slice(0, 3) });
    expect((await emitAck<Ack>(host, 'race:abandon')).ok).toBe(true); // COURSE-07
    const r = await results;
    const me = r.players.find((p) => p.id === created.youId)!;
    expect(me.status).toBe('abandon');
    // le bot, resté en course, passe avant le joueur qui a abandonné (COURSE-10 : abandon en dernier)
    expect(r.players[0].id).not.toBe(created.youId);
    expect(r.players[1].id).toBe(created.youId);
  }, 40000);

  it('rejette une vitesse physiquement impossible (COURSE-06)', async () => {
    const host = track(client(rt.url, (await registerUser('cheat')).token));
    await emitAck<Ack>(host, 'room:create', { settings: { words: 80, textType: 'random', bonuses: false } });
    await emitAck(host, 'bot:add', { level: 'noob' });
    const start = waitFor<{ startsAt: number; text: string }>(host, 'race:start');
    await emitAck(host, 'room:start');
    const s = await start;
    const ticks: { players: { p: number }[] }[] = [];
    host.on('race:tick', (t) => ticks.push(t));
    await sleep(Math.max(0, s.startsAt - Date.now()) + 300);
    host.emit('race:keys', { keys: s.text.slice(0, 64) });
    await sleep(700);
    const last = ticks.at(-1)!;
    // 64 frappes en 0,3 s dépassent le plafond : la progression reste très inférieure au texte envoyé
    expect(Math.max(...last.players.map((p) => p.p))).toBeLessThan(64 / s.text.length);
    host.emit('race:abandon');
  }, 20000);

  it('la déconnexion de plus de 30 s (ici 600 ms) vaut abandon ; un retour rapide reprend la course (COURSE-08)', async () => {
    const u1 = await registerUser('dc1');
    const u2 = await registerUser('dc2');
    const a = track(client(rt.url, u1.token));
    const created = await emitAck<Ack>(a, 'room:create', { settings: { words: 80, textType: 'random', bonuses: false } });
    const b = track(client(rt.url, u2.token));
    await emitAck(b, 'room:join', { code: created.state!.code });
    const start = waitFor<{ startsAt: number; text: string }>(a, 'race:start');
    await emitAck(a, 'room:start');
    const s = await start;
    await sleep(Math.max(0, s.startsAt - Date.now()) + 100);
    a.emit('race:keys', { keys: s.text.slice(0, 2) });
    await sleep(150);

    // retour rapide : la position est restituée
    a.close();
    await sleep(150);
    const back = track(client(rt.url, u1.token));
    const resumed = waitFor<{ pos: number; text: string; status: string }>(back, 'race:start');
    const ack = await emitAck<Ack>(back, 'room:resume');
    expect(ack.ok).toBe(true);
    const snap = await resumed;
    expect(snap.pos).toBe(2);
    expect(snap.status).toBe('en_course');

    // b se déconnecte pour de bon : abandon après le délai
    const results = waitFor<{ players: { id: string; status: string }[] }>(back, 'race:results', () => true, 15000);
    b.close();
    await sleep(900);
    back.emit('race:abandon');
    const r = await results;
    expect(r.players.map((p) => p.status).sort()).toEqual(['abandon', 'abandon']);
  }, 30000);
});

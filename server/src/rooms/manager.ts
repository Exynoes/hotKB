import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Server, Socket } from 'socket.io';
import { db } from '../db.js';
import { env } from '../env.js';
import { guestSessions, races, roomInvites, roomParticipants, rooms as roomsTable } from '../schema.js';
import type { AuthPayload } from '../middleware/auth.js';
import { appendWords, CHECKPOINTS, evaluateCheckpoint, FOG_DURATION_MS, removeLastWords, type BonusType } from '../race/bonus.js';
import { BOT_LEVELS, BOT_PROFILES, botStateAt, generateBotTimeline, type BotLevel, type BotTimeline } from '../race/bots.js';
import { accuracyOf, applyKeys, isFinished, netWpm, newRun, rankPlayers, rawWpm, type PlayerStatus, type Run } from '../race/engine.js';
import { createRng, seedFromString, type Rng } from '../race/rng.js';
import { DEFAULT_SETTINGS, parseSettingsUpdate, type RaceSettings } from '../race/settings.js';
import { prepareText } from '../race/text.js';
import { generateRoomCode } from './code.js';
import { allowJoinAttempt } from './rateLimit.js';
import { loadPassages, loadRaceResults, previousBest, saveRace, userDisplay } from './persist.js';
import type {
  ExplorerRoom,
  InviteView,
  MemberKind,
  MemberRole,
  PublicMember,
  PublicRoomState,
  RaceResults,
  RoomErrorCode,
  RoomStatus,
} from './types.js';

type Ack = (res: unknown) => void;
const fail = (error: RoomErrorCode, extra: Record<string, unknown> = {}) => ({ ok: false as const, error, ...extra });

interface Member {
  key: string;
  participantId: string;
  userId: string | null;
  guestId: string | null;
  name: string;
  avatarUrl: string | null;
  kind: MemberKind;
  role: MemberRole;
  botLevel: BotLevel | null;
  /** Plusieurs onglets possibles pour une même personne (SALLE-06). */
  sockets: Set<string>;
  joinedAt: number;
  disconnectedAt: number | null;
  graceTimer: NodeJS.Timeout | null;
}

interface Invite {
  id: string;
  token: string;
  tokenHash: string;
  usedByKey: string | null;
  usedByName: string | null;
  usedIp: string | null;
  revoked: boolean;
}

/** État d'un coureur dans une course ; indépendant de l'appartenance à la salle (résultats conservés après un départ). */
interface PlayerRace {
  key: string;
  participantId: string;
  userId: string | null;
  name: string;
  kind: MemberKind;
  botLevel: BotLevel | null;
  text: string;
  reserveUsed: number;
  run: Run;
  bot: BotTimeline | null;
  status: 'en_course' | PlayerStatus;
  timeMs: number | null;
  /** Instant (ms depuis le départ) de fin pour les statistiques. */
  endMs: number | null;
  progressAtEnd: number;
  fogUntil: number;
  bonusesReceivedCount: number;
  bonuses: { type: BonusType; role: 'received' | 'suffered'; atMs: number }[];
  series: { t: number; wpm: number }[];
  lastSample: number;
}

interface RaceState {
  id: string;
  startsAt: number;
  text: string;
  reserve: string[];
  settings: RaceSettings;
  rng: Rng;
  players: Map<string, PlayerRace>;
  doneCheckpoints: Set<number>;
  tick: NodeJS.Timeout | null;
  startTimer: NodeJS.Timeout | null;
  seed: number;
}

interface Room {
  id: string;
  code: string;
  createdAt: number;
  status: RoomStatus;
  hostKey: string;
  settings: RaceSettings;
  members: Map<string, Member>;
  kicked: Set<string>;
  invites: Map<string, Invite>;
  race: RaceState | null;
  lastResults: RaceResults | null;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const keyOf = (auth: AuthPayload) => `${auth.kind === 'user' ? 'u' : 'g'}:${auth.sub}`;

function clientIp(socket: Socket): string {
  const fwd = socket.handshake.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || socket.handshake.address;
}

const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && ((err as { code?: string }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505');

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private readonly identityRoom = new Map<string, string>();
  private readonly inviteIndex = new Map<string, { room: Room; invite: Invite }>();
  private explorerTimer: NodeJS.Timeout | null = null;
  private botCounter = 0;

  constructor(private readonly io: Server) {}

  // ───────────────────────── Vues publiques ─────────────────────────

  private publicMember(room: Room, m: Member): PublicMember {
    return {
      id: m.participantId,
      name: m.name,
      kind: m.kind,
      role: m.role,
      isHost: m.key === room.hostKey,
      botLevel: m.botLevel,
      avatarUrl: m.avatarUrl,
      connected: m.kind === 'bot' || m.sockets.size > 0,
    };
  }

  private publicState(room: Room): PublicRoomState {
    return {
      code: room.code,
      status: room.status,
      settings: room.settings,
      members: [...room.members.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((m) => this.publicMember(room, m)),
    };
  }

  private invitesView(room: Room): InviteView[] {
    return [...room.invites.values()].map((i) => ({
      id: i.id,
      token: i.token,
      status: i.revoked ? 'revoked' : i.usedByKey ? 'used' : 'unused',
      usedBy: i.usedByName,
    }));
  }

  private participantsCount(room: Room): number {
    return [...room.members.values()].filter((m) => m.role === 'player').length;
  }

  private joinable(room: Room): boolean {
    return room.status === 'en_attente' || room.status === 'resultats';
  }

  private broadcast(room: Room) {
    this.io.to(room.code).emit('room:state', this.publicState(room));
    this.notifyExplorer();
  }

  private sendInvites(room: Room) {
    const host = room.members.get(room.hostKey);
    if (!host) return;
    for (const sid of host.sockets) this.io.to(sid).emit('room:invites', this.invitesView(room));
  }

  /** JOIN-02 : liste des salles publiques, diffusée aux personnes qui regardent l'explorateur. */
  listPublic(): ExplorerRoom[] {
    return [...this.rooms.values()]
      .filter((r) => r.settings.visibility === 'public' && r.status !== 'fermee')
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({
        code: r.code,
        hostName: r.members.get(r.hostKey)?.name ?? '?',
        count: this.participantsCount(r),
        capacity: r.settings.capacity,
        language: r.settings.language,
        complexity: r.settings.complexity,
        status: r.status,
        joinable: this.joinable(r) && this.participantsCount(r) < r.settings.capacity,
      }));
  }

  private notifyExplorer() {
    if (this.explorerTimer) return;
    this.explorerTimer = setTimeout(() => {
      this.explorerTimer = null;
      this.io.to('explorer').emit('explorer:list', this.listPublic());
    }, 250);
  }

  // ───────────────────────── Membres ─────────────────────────

  private attach(room: Room, member: Member, socket: Socket) {
    member.sockets.add(socket.id);
    member.disconnectedAt = null;
    if (member.graceTimer) clearTimeout(member.graceTimer);
    member.graceTimer = null;
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.memberKey = member.key;
  }

  private roomOf(socket: Socket): Room | undefined {
    const code = socket.data.roomCode as string | undefined;
    return code ? this.rooms.get(code) : undefined;
  }

  private memberOf(socket: Socket): { room: Room; member: Member } | null {
    const room = this.roomOf(socket);
    const member = room?.members.get(socket.data.memberKey as string);
    return room && member ? { room, member } : null;
  }

  private async insertParticipant(room: Room, auth: AuthPayload, role: MemberRole): Promise<string> {
    // Les appelants ont déjà vérifié que la personne n'est dans aucune salle en mémoire : toute participation
    // encore « active » en base est un reste (redémarrage du serveur, déploiement) qui la bloquerait pour rien.
    await db
      .update(roomParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          isNull(roomParticipants.leftAt),
          auth.kind === 'user' ? eq(roomParticipants.userId, auth.sub) : eq(roomParticipants.guestId, auth.sub),
        ),
      );
    const [row] = await db
      .insert(roomParticipants)
      .values({
        roomId: room.id,
        userId: auth.kind === 'user' ? auth.sub : null,
        guestId: auth.kind === 'guest' ? auth.sub : null,
        isSpectator: role === 'spectator',
      })
      .returning({ id: roomParticipants.id });
    return row.id;
  }

  private async displayFor(auth: AuthPayload): Promise<{ name: string; avatarUrl: string | null }> {
    if (auth.kind === 'user') return (await userDisplay(auth.sub)) ?? { name: auth.username, avatarUrl: null };
    const [g] = await db.select({ name: guestSessions.displayName }).from(guestSessions).where(eq(guestSessions.id, auth.sub));
    return { name: g?.name ?? auth.username, avatarUrl: null };
  }

  private makeMember(key: string, participantId: string, auth: AuthPayload, display: { name: string; avatarUrl: string | null }, role: MemberRole): Member {
    return {
      key,
      participantId,
      userId: auth.kind === 'user' ? auth.sub : null,
      guestId: auth.kind === 'guest' ? auth.sub : null,
      name: display.name,
      avatarUrl: display.avatarUrl,
      kind: auth.kind,
      role,
      botLevel: null,
      sockets: new Set(),
      joinedAt: Date.now(),
      disconnectedAt: null,
      graceTimer: null,
    };
  }

  /** Retire une personne de la salle ; transfère l'hôte ou ferme la salle (SALLE-08). */
  private async removeMember(room: Room, member: Member, notice?: 'kicked') {
    if (member.graceTimer) clearTimeout(member.graceTimer);
    // en course : le coureur abandonne, ses résultats sont conservés
    const pr = room.race?.players.get(member.key);
    if (pr && pr.status === 'en_course') this.abandonPlayer(room, pr);
    room.members.delete(member.key);
    this.identityRoom.delete(member.key);
    await db.update(roomParticipants).set({ leftAt: new Date() }).where(eq(roomParticipants.id, member.participantId));
    for (const sid of member.sockets) {
      const s = this.io.sockets.sockets.get(sid);
      if (notice) s?.emit('room:kicked');
      s?.leave(room.code);
      if (s) {
        s.data.roomCode = undefined;
        s.data.memberKey = undefined;
      }
    }
    member.sockets.clear();

    const humans = [...room.members.values()].filter((m) => m.kind !== 'bot');
    if (humans.length === 0) return this.closeRoom(room);
    if (room.hostKey === member.key) {
      const next = humans.filter((m) => m.sockets.size > 0).sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (!next) return this.closeRoom(room);
      room.hostKey = next.key;
      await db.update(roomsTable).set({ hostUserId: next.userId }).where(eq(roomsTable.id, room.id));
      this.sendInvites(room);
    }
    this.broadcast(room);
    this.maybeEndRace(room);
  }

  async closeRoom(room: Room) {
    if (room.race) {
      if (room.race.tick) clearInterval(room.race.tick);
      if (room.race.startTimer) clearTimeout(room.race.startTimer);
      if (room.race.tick || room.status === 'decompte' || room.status === 'en_course') {
        await db.update(races).set({ status: 'annulee' }).where(eq(races.id, room.race.id)).catch(() => undefined);
      }
      room.race = null;
    }
    room.status = 'fermee';
    this.io.to(room.code).emit('room:closed');
    for (const m of room.members.values()) {
      if (m.graceTimer) clearTimeout(m.graceTimer);
      this.identityRoom.delete(m.key);
      for (const sid of m.sockets) {
        const s = this.io.sockets.sockets.get(sid);
        s?.leave(room.code);
        if (s) {
          s.data.roomCode = undefined;
          s.data.memberKey = undefined;
        }
      }
    }
    for (const inv of room.invites.values()) this.inviteIndex.delete(inv.tokenHash);
    this.rooms.delete(room.code);
    await db.update(roomsTable).set({ status: 'fermee' }).where(eq(roomsTable.id, room.id)).catch(() => undefined);
    await db
      .update(roomParticipants)
      .set({ leftAt: new Date() })
      .where(and(eq(roomParticipants.roomId, room.id), isNull(roomParticipants.leftAt)))
      .catch(() => undefined);
    this.notifyExplorer();
  }

  // ───────────────────────── Création / jonction ─────────────────────────

  async create(socket: Socket, payload: unknown, ack?: Ack) {
    const auth = socket.data.auth as AuthPayload;
    // AUTH-03 : un invité ne peut pas créer de salle (garanti côté serveur).
    if (auth.kind !== 'user') return ack?.(fail('ACCOUNT_REQUIRED'));
    const key = keyOf(auth);
    const existing = this.identityRoom.get(key);
    if (existing) return ack?.(fail('ALREADY_IN_ROOM', { code: existing }));

    const input = (typeof payload === 'object' && payload !== null ? payload : {}) as { settings?: unknown; role?: unknown };
    const parsed = parseSettingsUpdate(input.settings ?? {});
    if (!parsed.ok) return ack?.(fail('INVALID_INPUT'));
    const role: MemberRole = input.role === 'spectator' ? 'spectator' : 'player';
    const settings: RaceSettings = { ...DEFAULT_SETTINGS, ...parsed.data };

    try {
      let code = generateRoomCode();
      while (this.rooms.has(code)) code = generateRoomCode();
      const [roomRow] = await db
        .insert(roomsTable)
        .values({ code, visibility: settings.visibility, hostUserId: auth.sub, status: 'en_attente', settings })
        .returning({ id: roomsTable.id });
      const room: Room = {
        id: roomRow.id,
        code,
        createdAt: Date.now(),
        status: 'en_attente',
        hostKey: key,
        settings,
        members: new Map(),
        kicked: new Set(),
        invites: new Map(),
        race: null,
        lastResults: null,
      };
      let participantId: string;
      try {
        participantId = await this.insertParticipant(room, auth, role);
      } catch (err) {
        await db.delete(roomsTable).where(eq(roomsTable.id, room.id));
        if (isUniqueViolation(err)) return ack?.(fail('ALREADY_IN_ROOM'));
        throw err;
      }
      const member = this.makeMember(key, participantId, auth, await this.displayFor(auth), role);
      room.members.set(key, member);
      this.rooms.set(code, room);
      this.identityRoom.set(key, code);
      this.attach(room, member, socket);
      ack?.({ ok: true, state: this.publicState(room), youId: participantId });
      this.notifyExplorer();
    } catch (err) {
      console.error('[room:create]', err);
      ack?.(fail('GENERIC'));
    }
  }

  async join(socket: Socket, payload: unknown, ack?: Ack) {
    const auth = socket.data.auth as AuthPayload;
    const input = (typeof payload === 'object' && payload !== null ? payload : {}) as { code?: unknown; token?: unknown; role?: unknown };
    try {
      if (!allowJoinAttempt(clientIp(socket))) return ack?.(fail('TOO_MANY_ATTEMPTS')); // SALLE-10
      const key = keyOf(auth);

      let room: Room | undefined;
      let invite: Invite | undefined;
      if (typeof input.token === 'string' && input.token.length > 0) {
        const hit = this.inviteIndex.get(hashToken(input.token));
        if (!hit || hit.invite.revoked) return ack?.(fail('INVITE_INVALID'));
        room = hit.room;
        invite = hit.invite;
      } else {
        const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
        if (!/^[A-Z0-9]{6}$/.test(code)) return ack?.(fail('INVALID_INPUT'));
        room = this.rooms.get(code);
        if (!room) return ack?.(fail('ROOM_NOT_FOUND'));
      }

      // Même personne déjà dans cette salle (rechargement, deuxième onglet) : pas de doublon (SALLE-06).
      const current = this.identityRoom.get(key);
      if (current && current === room.code) {
        const member = room.members.get(key)!;
        this.attach(room, member, socket);
        ack?.({ ok: true, state: this.publicState(room), youId: member.participantId });
        this.sendSnapshot(room, member, socket);
        return;
      }
      if (current) return ack?.(fail('ALREADY_IN_ROOM', { code: current }));

      if (room.kicked.has(key)) return ack?.(fail('KICKED'));
      if (!this.joinable(room)) return ack?.(fail('ROOM_NOT_JOINABLE')); // SALLE-09
      if (!invite && room.settings.visibility === 'private') return ack?.(fail('ROOM_PRIVATE'));
      if (invite) {
        const ip = clientIp(socket);
        if (invite.usedByKey && (invite.usedByKey !== key || invite.usedIp !== ip)) return ack?.(fail('INVITE_USED'));
      }
      const role: MemberRole = input.role === 'spectator' ? 'spectator' : 'player';
      if (role === 'player' && this.participantsCount(room) >= room.settings.capacity) return ack?.(fail('ROOM_FULL'));

      let participantId: string;
      try {
        participantId = await this.insertParticipant(room, auth, role);
      } catch (err) {
        if (isUniqueViolation(err)) return ack?.(fail('ALREADY_IN_ROOM'));
        throw err;
      }
      const member = this.makeMember(key, participantId, auth, await this.displayFor(auth), role);
      room.members.set(key, member);
      this.identityRoom.set(key, room.code);
      this.attach(room, member, socket);

      if (invite && !invite.usedByKey) {
        invite.usedByKey = key;
        invite.usedByName = member.name;
        invite.usedIp = clientIp(socket);
        await db
          .update(roomInvites)
          .set({ usedByName: member.name, usedByIdentity: key, usedIp: invite.usedIp })
          .where(eq(roomInvites.tokenHash, invite.tokenHash));
        this.sendInvites(room);
      }
      ack?.({ ok: true, state: this.publicState(room), youId: participantId });
      this.broadcast(room);
    } catch (err) {
      console.error('[room:join]', err);
      ack?.(fail('GENERIC'));
    }
  }

  /** JOIN-03 : partie rapide — la salle publique joignable la plus proche de sa capacité maximale, à égalité la plus ancienne. */
  async quick(socket: Socket, ack?: Ack) {
    const auth = socket.data.auth as AuthPayload;
    const current = this.identityRoom.get(keyOf(auth));
    if (current) return ack?.(fail('ALREADY_IN_ROOM', { code: current }));
    const candidates = [...this.rooms.values()]
      .filter((r) => r.settings.visibility === 'public' && this.joinable(r) && this.participantsCount(r) < r.settings.capacity && !r.kicked.has(keyOf(auth)))
      .sort((a, b) => {
        const seatsA = a.settings.capacity - this.participantsCount(a);
        const seatsB = b.settings.capacity - this.participantsCount(b);
        return seatsA - seatsB || a.createdAt - b.createdAt;
      });
    if (candidates.length === 0) return ack?.(fail('NO_PUBLIC_ROOM'));
    return this.join(socket, { code: candidates[0].code }, ack);
  }

  /** Reprise après rechargement ou perte de connexion (COURSE-08). */
  async resume(socket: Socket, ack?: Ack) {
    const auth = socket.data.auth as AuthPayload;
    const key = keyOf(auth);
    const code = this.identityRoom.get(key);
    const room = code ? this.rooms.get(code) : undefined;
    const member = room?.members.get(key);
    if (!room || !member) return ack?.({ ok: true, state: null });
    this.attach(room, member, socket);
    ack?.({ ok: true, state: this.publicState(room), youId: member.participantId });
    this.sendSnapshot(room, member, socket);
    this.sendInvites(room);
    this.broadcast(room);
  }

  /** État de course courant, pour une personne qui (re)arrive en cours de route. */
  private sendSnapshot(room: Room, member: Member, socket: Socket) {
    if (room.status === 'resultats' && room.lastResults) socket.emit('race:results', room.lastResults);
    if ((room.status === 'decompte' || room.status === 'en_course') && room.race) {
      const pr = room.race.players.get(member.key);
      socket.emit('race:start', {
        startsAt: room.race.startsAt,
        serverNow: Date.now(),
        text: pr ? pr.text : null,
        pos: pr && pr.kind !== 'bot' ? pr.run.pos : 0,
        status: pr?.status ?? null,
        errorMode: room.race.settings.errorMode,
        maxTimeSec: room.race.settings.maxTimeSec,
        language: room.race.settings.language,
        bonuses: room.race.settings.bonuses,
        youId: member.participantId,
      });
    }
  }

  async leave(socket: Socket) {
    const found = this.memberOf(socket);
    if (!found) return;
    await this.removeMember(found.room, found.member);
  }

  onDisconnect(socket: Socket) {
    const found = this.memberOf(socket);
    if (!found) return;
    const { room, member } = found;
    member.sockets.delete(socket.id);
    if (member.sockets.size > 0) return;
    member.disconnectedAt = Date.now();
    this.broadcast(room);
    // COURSE-08 : 30 secondes pour revenir ; au-delà, abandon (en course) ou départ de la salle.
    member.graceTimer = setTimeout(() => {
      member.graceTimer = null;
      if (member.sockets.size > 0 || !this.rooms.has(room.code)) return;
      const racing = room.status === 'decompte' || room.status === 'en_course';
      const pr = room.race?.players.get(member.key);
      if (racing && pr) {
        if (pr.status === 'en_course') this.abandonPlayer(room, pr);
        this.broadcast(room);
        this.maybeEndRace(room);
      } else {
        void this.removeMember(room, member);
      }
    }, env.reconnectGraceMs);
  }

  // ───────────────────────── Actions de l'hôte ─────────────────────────

  private host(socket: Socket, ack?: Ack): { room: Room; member: Member } | null {
    const found = this.memberOf(socket);
    if (!found) {
      ack?.(fail('NOT_IN_ROOM'));
      return null;
    }
    // SEC-01 : toute action réservée à l'hôte est autorisée côté serveur.
    if (found.room.hostKey !== found.member.key) {
      ack?.(fail('NOT_HOST'));
      return null;
    }
    return found;
  }

  async updateSettings(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.status !== 'en_attente') return ack?.(fail('WRONG_STATE'));
    const parsed = parseSettingsUpdate(payload);
    if (!parsed.ok) return ack?.(fail('INVALID_INPUT'));
    const next = { ...room.settings, ...parsed.data };
    // la capacité ne peut pas passer sous le nombre de participants présents
    if (this.participantsCount(room) > next.capacity) return ack?.(fail('INVALID_INPUT'));
    room.settings = next;
    await db.update(roomsTable).set({ settings: next, visibility: next.visibility }).where(eq(roomsTable.id, room.id));
    ack?.({ ok: true });
    this.broadcast(room); // CONF-12 : tout le monde voit la configuration en direct
  }

  async setRole(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.memberOf(socket);
    if (!found) return ack?.(fail('NOT_IN_ROOM'));
    const { room, member } = found;
    if (room.status !== 'en_attente') return ack?.(fail('WRONG_STATE'));
    const role: MemberRole = (payload as { role?: unknown })?.role === 'spectator' ? 'spectator' : 'player';
    if (role === 'player' && member.role !== 'player' && this.participantsCount(room) >= room.settings.capacity) {
      return ack?.(fail('ROOM_FULL'));
    }
    member.role = role;
    await db.update(roomParticipants).set({ isSpectator: role === 'spectator' }).where(eq(roomParticipants.id, member.participantId));
    ack?.({ ok: true });
    this.broadcast(room);
  }

  async addBot(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.status !== 'en_attente') return ack?.(fail('WRONG_STATE'));
    const level = (payload as { level?: unknown })?.level;
    if (typeof level !== 'string' || !(BOT_LEVELS as readonly string[]).includes(level)) return ack?.(fail('INVALID_INPUT'));
    if (this.participantsCount(room) >= room.settings.capacity) return ack?.(fail('ROOM_FULL'));
    const botLevel = level as BotLevel;
    this.botCounter++;
    const name = `${BOT_PROFILES[botLevel].name} ${this.botCounter}`;
    const [row] = await db
      .insert(roomParticipants)
      .values({ roomId: room.id, isBot: true, botDifficulty: botLevel, botName: name })
      .returning({ id: roomParticipants.id });
    const key = `b:${row.id}`;
    room.members.set(key, {
      key,
      participantId: row.id,
      userId: null,
      guestId: null,
      name,
      avatarUrl: null,
      kind: 'bot',
      role: 'player',
      botLevel,
      sockets: new Set(),
      joinedAt: Date.now(),
      disconnectedAt: null,
      graceTimer: null,
    });
    ack?.({ ok: true });
    this.broadcast(room);
  }

  async removeBot(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.status !== 'en_attente') return ack?.(fail('WRONG_STATE'));
    const id = (payload as { id?: unknown })?.id;
    const bot = [...room.members.values()].find((m) => m.kind === 'bot' && m.participantId === id);
    if (!bot) return ack?.(fail('INVALID_INPUT'));
    room.members.delete(bot.key);
    await db.update(roomParticipants).set({ leftAt: new Date() }).where(eq(roomParticipants.id, bot.participantId));
    ack?.({ ok: true });
    this.broadcast(room);
  }

  /** SALLE-07 : l'hôte expulse un participant ou un spectateur, qui ne peut plus revenir. */
  async kick(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    const id = (payload as { id?: unknown })?.id;
    const target = [...room.members.values()].find((m) => m.participantId === id && m.kind !== 'bot');
    if (!target || target.key === room.hostKey) return ack?.(fail('INVALID_INPUT'));
    room.kicked.add(target.key);
    // le lien d'invitation d'une personne expulsée est révoqué
    for (const inv of room.invites.values()) {
      if (inv.usedByKey === target.key) {
        inv.revoked = true;
        await db.update(roomInvites).set({ revoked: true }).where(eq(roomInvites.tokenHash, inv.tokenHash));
        this.inviteIndex.delete(inv.tokenHash);
      }
    }
    await this.removeMember(room, target, 'kicked');
    ack?.({ ok: true });
    this.sendInvites(room);
  }

  /** SALLE-04 : un lien distinct par invité, à usage unique, avec un jeton de 192 bits. */
  async createInvite(socket: Socket, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.invites.size >= 30) return ack?.(fail('INVALID_INPUT'));
    const token = randomBytes(24).toString('base64url');
    const invite: Invite = { id: randomBytes(6).toString('hex'), token, tokenHash: hashToken(token), usedByKey: null, usedByName: null, usedIp: null, revoked: false };
    await db.insert(roomInvites).values({ roomId: room.id, tokenHash: invite.tokenHash });
    room.invites.set(invite.id, invite);
    this.inviteIndex.set(invite.tokenHash, { room, invite });
    ack?.({ ok: true });
    this.sendInvites(room);
  }

  async revokeInvite(socket: Socket, payload: unknown, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const invite = found.room.invites.get(String((payload as { id?: unknown })?.id));
    if (!invite) return ack?.(fail('INVALID_INPUT'));
    invite.revoked = true;
    this.inviteIndex.delete(invite.tokenHash);
    await db.update(roomInvites).set({ revoked: true }).where(eq(roomInvites.tokenHash, invite.tokenHash));
    ack?.({ ok: true });
    this.sendInvites(found.room);
  }

  async close(socket: Socket, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    if (found.room.status === 'decompte' || found.room.status === 'en_course') return ack?.(fail('WRONG_STATE'));
    ack?.({ ok: true });
    await this.closeRoom(found.room);
  }

  /** COURSE-11 : relancer avec les mêmes participants (retour à l'attente, puis départ). */
  async backToLobby(socket: Socket, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.status !== 'resultats') return ack?.(fail('WRONG_STATE'));
    room.status = 'en_attente';
    room.race = null;
    room.lastResults = null;
    await db.update(roomsTable).set({ status: 'en_attente' }).where(eq(roomsTable.id, room.id));
    ack?.({ ok: true });
    this.broadcast(room);
  }

  async rematch(socket: Socket, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    if (found.room.status !== 'resultats') return ack?.(fail('WRONG_STATE'));
    found.room.status = 'en_attente';
    found.room.lastResults = null;
    await this.start(socket, ack);
  }

  // ───────────────────────── Course ─────────────────────────

  async start(socket: Socket, ack?: Ack) {
    const found = this.host(socket, ack);
    if (!found) return;
    const { room } = found;
    if (room.status !== 'en_attente') return ack?.(fail('WRONG_STATE'));
    const players = [...room.members.values()].filter((m) => m.role === 'player');
    // COURSE-02 : au moins 2 participants dont 1 humain ; les bots comptent, les spectateurs non.
    if (players.length < 2 || !players.some((m) => m.kind !== 'bot')) return ack?.(fail('NEED_PLAYERS'));
    try {
      const seed = seedFromString(`${room.code}:${Date.now()}:${Math.random()}`);
      const rng = createRng(seed);
      const prepared = prepareText(room.settings, rng, await loadPassages());
      const text = prepared.words.join(' ');
      const botText = [text, ...prepared.reserve].join(' ');
      const startsAt = Date.now() + env.countdownMs;

      const [raceRow] = await db
        .insert(races)
        .values({
          roomId: room.id,
          texteId: prepared.texteId,
          textContent: text,
          language: room.settings.language,
          settings: room.settings,
          status: 'en_cours',
          startedAt: new Date(startsAt),
        })
        .returning({ id: races.id });

      const race: RaceState = {
        id: raceRow.id,
        startsAt,
        text,
        reserve: prepared.reserve,
        settings: room.settings,
        rng: createRng(seed ^ 0x9e3779b9),
        players: new Map(),
        doneCheckpoints: new Set(),
        tick: null,
        startTimer: null,
        seed,
      };
      players.forEach((m, i) => {
        race.players.set(m.key, {
          key: m.key,
          participantId: m.participantId,
          userId: m.userId,
          name: m.name,
          kind: m.kind,
          botLevel: m.botLevel,
          text,
          reserveUsed: 0,
          run: newRun(text),
          bot: m.kind === 'bot' && m.botLevel ? generateBotTimeline(seed + i * 7919, m.botLevel, botText, room.settings.errorMode) : null,
          status: 'en_course',
          timeMs: null,
          endMs: null,
          progressAtEnd: 0,
          fogUntil: 0,
          bonusesReceivedCount: 0,
          bonuses: [],
          series: [],
          lastSample: 0,
        });
      });
      room.race = race;
      room.status = 'decompte';
      await db.update(roomsTable).set({ status: 'decompte' }).where(eq(roomsTable.id, room.id));
      ack?.({ ok: true });
      this.broadcast(room);

      // COURSE-03 : le texte n'est révélé qu'au début du décompte, aux seuls coureurs.
      const now = Date.now();
      for (const m of room.members.values()) {
        const pr = race.players.get(m.key);
        for (const sid of m.sockets) {
          this.io.to(sid).emit('race:start', {
            startsAt,
            serverNow: now,
            text: pr ? text : null,
            pos: 0,
            status: pr ? 'en_course' : null,
            errorMode: room.settings.errorMode,
            maxTimeSec: room.settings.maxTimeSec,
            language: room.settings.language,
            bonuses: room.settings.bonuses,
            youId: m.participantId,
          });
        }
      }
      race.startTimer = setTimeout(() => this.beginRace(room), Math.max(0, startsAt - Date.now()));
    } catch (err) {
      console.error('[room:start]', err);
      room.status = 'en_attente';
      ack?.(fail('GENERIC'));
    }
  }

  private beginRace(room: Room) {
    const race = room.race;
    if (!race || room.status !== 'decompte') return;
    room.status = 'en_course';
    this.broadcast(room);
    race.tick = setInterval(() => this.tick(room), 200);
  }

  /** PERF-02 : au plus ~15 messages de frappes par seconde et par connexion. */
  keys(socket: Socket, payload: unknown) {
    const now = Date.now();
    const w = (socket.data.keyWindow as { t: number; n: number } | undefined) ?? { t: now, n: 0 };
    if (now - w.t >= 1000) {
      w.t = now;
      w.n = 0;
    }
    w.n++;
    socket.data.keyWindow = w;
    if (w.n > 15) return;

    const keys = (payload as { keys?: unknown })?.keys;
    if (typeof keys !== 'string' || keys.length === 0 || keys.length > 64) return;
    const found = this.memberOf(socket);
    const race = found?.room.race;
    // le minuteur de départ peut avoir quelques ms de retard : on accepte dès que l'heure de départ est passée
    if (!found || !race || (found.room.status !== 'en_course' && found.room.status !== 'decompte')) return;
    const pr = race.players.get(found.member.key);
    if (!pr || pr.kind === 'bot' || pr.status !== 'en_course') return;
    const elapsed = now - race.startsAt;
    applyKeys(pr.run, keys, race.settings.errorMode, elapsed);
    if (isFinished(pr.run)) this.finishPlayer(pr, elapsed);
  }

  private finishPlayer(pr: PlayerRace, elapsed: number) {
    if (pr.status !== 'en_course') return;
    pr.status = 'termine';
    pr.timeMs = Math.max(0, Math.round(elapsed));
    pr.endMs = pr.timeMs;
    pr.progressAtEnd = 1;
  }

  /** COURSE-07 / COURSE-08 : abandon volontaire ou après 30 s de déconnexion. */
  private abandonPlayer(room: Room, pr: PlayerRace) {
    const race = room.race;
    if (!race || pr.status !== 'en_course') return;
    const elapsed = Math.max(0, Date.now() - race.startsAt);
    pr.status = 'abandon';
    pr.endMs = elapsed;
    pr.progressAtEnd = this.progressOf(pr, elapsed);
  }

  abandon(socket: Socket, ack?: Ack) {
    const found = this.memberOf(socket);
    const pr = found?.room.race?.players.get(found.member.key);
    if (!found || !pr || (found.room.status !== 'en_course' && found.room.status !== 'decompte')) return ack?.(fail('WRONG_STATE'));
    this.abandonPlayer(found.room, pr);
    ack?.({ ok: true });
    this.maybeEndRace(found.room);
  }

  private botEvent(pr: PlayerRace, elapsed: number) {
    return pr.bot ? botStateAt(pr.bot, elapsed) : null;
  }

  private posOf(pr: PlayerRace, elapsed: number): number {
    if (pr.kind === 'bot') return Math.min(pr.text.length, this.botEvent(pr, elapsed)?.pos ?? 0);
    return pr.run.pos;
  }

  private progressOf(pr: PlayerRace, elapsed: number): number {
    if (pr.status === 'termine') return 1;
    if (pr.status !== 'en_course') return pr.progressAtEnd;
    return pr.text.length === 0 ? 1 : Math.min(1, this.posOf(pr, elapsed) / pr.text.length);
  }

  private statsOf(pr: PlayerRace, elapsed: number) {
    const ms = pr.endMs ?? elapsed;
    if (pr.kind === 'bot') {
      const ev = this.botEvent(pr, ms);
      const correct = ev?.correct ?? 0;
      const total = ev?.total ?? 0;
      return { correct, total, errors: ev?.errors ?? 0, keyErrors: Object.fromEntries(ev?.keyErrors ?? []) as Record<string, number>, ms };
    }
    return { correct: pr.run.correct, total: pr.run.total, errors: pr.run.errors, keyErrors: pr.run.keyErrors, ms };
  }

  private tick(room: Room) {
    const race = room.race;
    if (!race || room.status !== 'en_course') return;
    const now = Date.now();
    const elapsed = now - race.startsAt;
    const limitMs = race.settings.maxTimeSec ? race.settings.maxTimeSec * 1000 : null;

    // bots : leur état découle de leur chronologie ; fin dès que le texte est atteint
    for (const pr of race.players.values()) {
      if (pr.kind !== 'bot' || pr.status !== 'en_course') continue;
      const ev = this.botEvent(pr, elapsed);
      if (ev && ev.pos >= pr.text.length) {
        const first = pr.bot!.events.find((e) => e.pos >= pr.text.length)!;
        this.finishPlayer(pr, first.t);
      }
    }

    // bonus de remontée aux points de contrôle (BONUS-01)
    if (race.settings.bonuses) this.checkBonuses(room, elapsed);

    // fin du temps imparti (COURSE-09)
    if (limitMs !== null && elapsed >= limitMs) {
      for (const pr of race.players.values()) {
        if (pr.status !== 'en_course') continue;
        pr.status = 'temps_ecoule';
        pr.endMs = limitMs;
        pr.progressAtEnd = this.progressOf(pr, limitMs);
      }
    }

    // série temporelle du MPM, une mesure par seconde (RES-03, RES-05)
    const second = Math.floor(elapsed / 1000);
    for (const pr of race.players.values()) {
      if (pr.status !== 'en_course' || second <= pr.lastSample || second < 1) continue;
      pr.lastSample = second;
      pr.series.push({ t: second, wpm: netWpm(this.statsOf(pr, second * 1000).correct, second * 1000) });
    }

    // diffusion groupée (PERF-02) : ~5 mises à jour par seconde, jamais par frappe
    this.io.to(room.code).emit('race:tick', {
      t: elapsed,
      now,
      players: [...race.players.values()].map((pr) => {
        const s = this.statsOf(pr, elapsed);
        return {
          id: pr.participantId,
          p: Math.round(this.progressOf(pr, elapsed) * 10000) / 10000,
          wpm: netWpm(s.correct, pr.status === 'en_course' ? Math.max(elapsed, 1) : s.ms),
          acc: accuracyOf(s.correct, s.total),
          st: pr.status,
          fog: Math.max(0, pr.fogUntil - now),
        };
      }),
    });

    this.maybeEndRace(room);
  }

  private checkBonuses(room: Room, elapsed: number) {
    const race = room.race!;
    const pool = [...race.players.values()];
    const leaderProgress = Math.max(0, ...pool.filter((p) => p.status === 'en_course').map((p) => this.progressOf(p, elapsed)));
    for (const cp of CHECKPOINTS) {
      if (race.doneCheckpoints.has(cp) || leaderProgress < cp) continue;
      race.doneCheckpoints.add(cp);
      const events = evaluateCheckpoint(
        pool.map((p) => ({
          id: p.key,
          progress: this.progressOf(p, elapsed),
          active: p.status === 'en_course' && (p.kind === 'bot' || (room.members.get(p.key)?.sockets.size ?? 0) > 0),
          bonusesReceived: p.bonusesReceivedCount,
        })),
        cp,
        race.rng,
      );
      for (const e of events) {
        const target = race.players.get(e.targetId);
        const beneficiary = race.players.get(e.beneficiaryId);
        if (!target || !beneficiary) continue;
        beneficiary.bonusesReceivedCount++;
        beneficiary.bonuses.push({ type: e.type, role: 'received', atMs: elapsed });
        if (target !== beneficiary) target.bonuses.push({ type: e.type, role: 'suffered', atMs: elapsed });
        if (e.type === 'minus3') {
          target.text = removeLastWords(target.text, this.posOf(target, elapsed));
          target.run.text = target.text;
        } else if (e.type === 'plus3') {
          const r = appendWords(target.text, race.reserve, target.reserveUsed);
          target.text = r.text;
          target.reserveUsed = r.used;
          target.run.text = target.text;
        } else {
          target.fogUntil = Date.now() + FOG_DURATION_MS;
        }
        if (target.kind !== 'bot' && e.type !== 'fog') {
          const m = room.members.get(target.key);
          for (const sid of m?.sockets ?? []) this.io.to(sid).emit('race:text', { text: target.text });
        }
        // BONUS-03 : annonce visuelle sur la piste et chez le joueur ciblé
        this.io.to(room.code).emit('race:bonus', {
          type: e.type,
          targetId: target.participantId,
          beneficiaryId: beneficiary.participantId,
          targetName: target.name,
          beneficiaryName: beneficiary.name,
          fogMs: e.type === 'fog' ? FOG_DURATION_MS : 0,
          checkpoint: cp,
        });
      }
      // un texte raccourci peut être déjà atteint
      for (const pr of pool) {
        if (pr.status === 'en_course' && pr.kind !== 'bot' && pr.run.pos >= pr.text.length) this.finishPlayer(pr, elapsed);
      }
    }
  }

  private maybeEndRace(room: Room) {
    const race = room.race;
    if (!race || (room.status !== 'en_course' && room.status !== 'decompte')) return;
    if (room.status === 'decompte') {
      // tout le monde est parti avant le départ : on annule
      const stillHere = [...race.players.values()].some((p) => p.status === 'en_course' && p.kind !== 'bot');
      if (!stillHere) void this.cancelRace(room);
      return;
    }
    const running = [...race.players.values()].some((p) => p.status === 'en_course');
    if (!running) void this.endRace(room);
  }

  private async cancelRace(room: Room) {
    const race = room.race;
    if (!race) return;
    if (race.startTimer) clearTimeout(race.startTimer);
    if (race.tick) clearInterval(race.tick);
    await db.update(races).set({ status: 'annulee' }).where(eq(races.id, race.id));
    room.race = null;
    room.status = 'en_attente';
    await db.update(roomsTable).set({ status: 'en_attente' }).where(eq(roomsTable.id, room.id));
    this.broadcast(room);
  }

  private async endRace(room: Room) {
    const race = room.race;
    if (!race || room.status !== 'en_course') return;
    room.status = 'resultats'; // verrouille contre une double fin
    if (race.tick) clearInterval(race.tick);
    race.tick = null;
    const elapsed = Date.now() - race.startsAt;
    try {
      const pool = [...race.players.values()];
      const order = rankPlayers(
        pool.map((p) => ({ id: p.key, status: p.status === 'en_course' ? 'temps_ecoule' : p.status, timeMs: p.timeMs, progress: this.progressOf(p, elapsed) })),
      );
      const results = await Promise.all(
        pool.map(async (pr) => {
          const s = this.statsOf(pr, elapsed);
          const wpm = netWpm(s.correct, s.ms);
          let personalRecord = false;
          if (pr.userId && pr.status !== 'abandon') {
            const prev = await previousBest(pr.userId);
            personalRecord = prev.count > 0 && wpm > prev.best;
          }
          return {
            participantId: pr.participantId,
            userId: pr.userId,
            wpm,
            rawWpm: rawWpm(s.total, s.ms),
            accuracy: accuracyOf(s.correct, s.total),
            rank: order.indexOf(pr.key) + 1,
            errors: s.errors,
            timeMs: pr.timeMs,
            status: (pr.status === 'en_course' ? 'temps_ecoule' : pr.status) as PlayerStatus,
            progress: Math.round(this.progressOf(pr, elapsed) * 10000) / 10000,
            bonuses: pr.bonuses,
            series: [...pr.series, { t: Math.max(1, Math.round(s.ms / 1000)), wpm }],
            keyErrors: s.keyErrors,
            personalRecord,
          };
        }),
      );
      await saveRace({ raceId: race.id, startedAt: new Date(race.startsAt), durationMs: elapsed, status: 'terminee', results });
      const full = await loadRaceResults(race.id);
      room.lastResults = full;
      await db.update(roomsTable).set({ status: 'resultats' }).where(eq(roomsTable.id, room.id));
      this.io.to(room.code).emit('race:results', full);
    } catch (err) {
      console.error('[race:end]', err);
    }
    this.broadcast(room);
    // les personnes restées déconnectées pendant la course quittent la salle
    for (const m of [...room.members.values()]) {
      if (m.kind !== 'bot' && m.sockets.size === 0) await this.removeMember(room, m);
    }
  }
}


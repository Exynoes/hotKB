/** Miroir côté client du protocole temps réel (server/src/rooms/types.ts). */
export type BotLevel = 'noob' | 'debutant' | 'intermediaire' | 'expert' | 'impossible';
export type RoomStatus = 'en_attente' | 'decompte' | 'en_course' | 'resultats' | 'fermee';
export type PlayerStatus = 'en_course' | 'termine' | 'abandon' | 'temps_ecoule';
export type BonusType = 'minus3' | 'plus3' | 'fog';

export interface RaceSettings {
  maxTimeSec: number | null;
  language: 'fr' | 'en';
  textType: 'coherent' | 'random';
  words: number;
  complexity: 'easy' | 'medium' | 'hard';
  punctuation: boolean;
  numbers: boolean;
  capitals: boolean;
  accents: boolean;
  includeChars: string;
  excludeChars: string;
  errorMode: 'correct' | 'free';
  bonuses: boolean;
  visibility: 'public' | 'code' | 'private';
  capacity: number;
}

export interface Member {
  id: string;
  name: string;
  kind: 'user' | 'guest' | 'bot';
  role: 'player' | 'spectator';
  isHost: boolean;
  botLevel: BotLevel | null;
  avatarUrl: string | null;
  connected: boolean;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  settings: RaceSettings;
  members: Member[];
}

export interface Invite {
  id: string;
  token: string;
  status: 'unused' | 'used' | 'revoked';
  usedBy: string | null;
}

export interface ExplorerRoom {
  code: string;
  hostName: string;
  count: number;
  capacity: number;
  language: 'fr' | 'en';
  complexity: 'easy' | 'medium' | 'hard';
  status: RoomStatus;
  joinable: boolean;
}

export interface RaceStart {
  startsAt: number;
  serverNow: number;
  text: string | null;
  pos: number;
  status: PlayerStatus | null;
  errorMode: 'correct' | 'free';
  maxTimeSec: number | null;
  language: 'fr' | 'en';
  bonuses: boolean;
  youId: string;
}

export interface TickPlayer {
  id: string;
  p: number;
  wpm: number;
  acc: number;
  st: PlayerStatus;
  fog: number;
}

export interface Tick {
  t: number;
  now: number;
  players: TickPlayer[];
}

export interface BonusEvent {
  type: BonusType;
  targetId: string;
  beneficiaryId: string;
  targetName: string;
  beneficiaryName: string;
  fogMs: number;
  checkpoint: number;
}

export interface ResultPlayer {
  id: string;
  name: string;
  kind: 'user' | 'guest' | 'bot';
  botLevel: BotLevel | null;
  avatarUrl: string | null;
  userId: string | null;
  rank: number;
  status: PlayerStatus;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  timeMs: number | null;
  progress: number;
  bonuses: { type: BonusType; role: 'received' | 'suffered'; atMs: number }[];
  series: { t: number; wpm: number }[];
  keyErrors: Record<string, number>;
  personalRecord: boolean;
}

export interface RaceResults {
  raceId: string;
  roomCode: string;
  startedAt: string;
  durationMs: number;
  language: string;
  text: string;
  settings: Partial<RaceSettings>;
  players: ResultPlayer[];
}

export type RoomAck =
  | { ok: true; state?: RoomState; youId?: string; rooms?: ExplorerRoom[] }
  | { ok: false; error: string; code?: string };

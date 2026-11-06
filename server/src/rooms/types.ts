import type { BotLevel } from '../race/bots.js';
import type { BonusType } from '../race/bonus.js';
import type { PlayerStatus } from '../race/engine.js';
import type { RaceSettings } from '../race/settings.js';

/** Codes d'erreur renvoyés au client, qui les traduit (I18N-01 : aucune chaîne codée en dur côté interface). */
export type RoomErrorCode =
  | 'ACCOUNT_REQUIRED'
  | 'ALREADY_IN_ROOM'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_NOT_JOINABLE'
  | 'ROOM_FULL'
  | 'ROOM_PRIVATE'
  | 'KICKED'
  | 'INVITE_INVALID'
  | 'INVITE_USED'
  | 'TOO_MANY_ATTEMPTS'
  | 'INVALID_INPUT'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'NEED_PLAYERS'
  | 'WRONG_STATE'
  | 'NO_PUBLIC_ROOM'
  | 'GENERIC';

export type RoomStatus = 'en_attente' | 'decompte' | 'en_course' | 'resultats' | 'fermee';
export type MemberKind = 'user' | 'guest' | 'bot';
export type MemberRole = 'player' | 'spectator';

export interface PublicMember {
  id: string;
  name: string;
  kind: MemberKind;
  role: MemberRole;
  isHost: boolean;
  botLevel: BotLevel | null;
  avatarUrl: string | null;
  connected: boolean;
}

export interface PublicRoomState {
  code: string;
  status: RoomStatus;
  settings: RaceSettings;
  members: PublicMember[];
}

export interface InviteView {
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

export interface ResultPlayer {
  id: string;
  name: string;
  kind: MemberKind;
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

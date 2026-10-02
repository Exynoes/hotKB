export interface LobbyParticipant {
  id: string;
  displayName: string;
  isHost: boolean;
}

export interface LobbyState {
  code: string;
  status: 'en_attente' | 'en_course' | 'resultats' | 'fermee';
  participants: LobbyParticipant[];
}

export type RoomAck =
  | { ok: true; state?: LobbyState; youId?: string }
  | { ok: false; error: string };

import { useCallback, useEffect, useState } from 'react';
import { socket } from './socket';
import type { LobbyState, RoomAck } from './room-types';

/**
 * Gère l'état du lobby courant : création, jointure, et mises à jour en
 * temps réel via l'événement `room:state` diffusé par le serveur.
 */
export function useRoom() {
  const [room, setRoom] = useState<LobbyState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onState(state: LobbyState) {
      setRoom(state);
    }
    socket.on('room:state', onState);
    return () => {
      socket.off('room:state', onState);
    };
  }, []);

  const createRoom = useCallback(() => {
    setError(null);
    socket.emit('room:create', (res: RoomAck) => {
      if (res.ok) {
        if (res.state) setRoom(res.state);
        if (res.youId) setMyId(res.youId);
      } else {
        setError(res.error);
      }
    });
  }, []);

  const joinRoom = useCallback((code: string) => {
    setError(null);
    socket.emit('room:join', { code }, (res: RoomAck) => {
      if (res.ok) {
        if (res.state) setRoom(res.state);
        if (res.youId) setMyId(res.youId);
      } else {
        setError(res.error);
      }
    });
  }, []);

  const startRace = useCallback(() => {
    setError(null);
    socket.emit('room:start', (res: RoomAck) => {
      if (!res.ok) setError(res.error);
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setRoom(null);
    setMyId(null);
  }, []);

  return { room, myId, error, createRoom, joinRoom, startRace, leaveRoom };
}

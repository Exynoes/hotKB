'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket';
import type {
  BonusEvent,
  BotLevel,
  Invite,
  RaceResults,
  RaceSettings,
  RaceStart,
  RoomAck,
  RoomState,
  Tick,
} from './room-types';

/** Erreur connue côté client → clé de traduction (le serveur n'envoie que des codes). */
export type ErrorCode = string;

/**
 * État complet d'une salle côté client : lobby, course en cours, résultats.
 * Toutes les actions passent par Socket.IO ; le serveur reste l'autorité (COURSE-02).
 */
export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [race, setRace] = useState<RaceStart | null>(null);
  const [tick, setTick] = useState<Tick | null>(null);
  const [bonusLog, setBonusLog] = useState<(BonusEvent & { key: number })[]>([]);
  const [results, setResults] = useState<RaceResults | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const seq = useRef(0);
  /** décalage horloge serveur - horloge locale (pour le décompte) */
  const offset = useRef(0);

  const apply = useCallback((res: RoomAck) => {
    if (res.ok) {
      if (res.state) setRoom(res.state);
      if (res.youId) setMyId(res.youId);
      setError(null);
    } else {
      setError(res.error);
    }
    return res;
  }, []);

  useEffect(() => {
    const onState = (s: RoomState) => {
      setRoom(s);
      if (s.status === 'en_attente') {
        setRace(null);
        setTick(null);
        setResults(null);
        setText(null);
        setBonusLog([]);
      }
    };
    const onStart = (r: RaceStart) => {
      offset.current = r.serverNow - Date.now();
      setRace(r);
      setText(r.text);
      setResults(null);
      setTick(null);
      setBonusLog([]);
      setMyId(r.youId);
    };
    const onTick = (t: Tick) => setTick(t);
    const onText = (p: { text: string }) => setText(p.text);
    const onBonus = (b: BonusEvent) => {
      seq.current += 1;
      const key = seq.current;
      setBonusLog((l) => [...l.slice(-3), { ...b, key }]);
      setTimeout(() => setBonusLog((l) => l.filter((x) => x.key !== key)), 5000);
    };
    const onResults = (r: RaceResults) => setResults(r);
    const onInvites = (i: Invite[] | { invites: Invite[] }) => setInvites(Array.isArray(i) ? i : i.invites);
    const onClosed = () => {
      setRoom(null);
      setRace(null);
      setResults(null);
    };
    const onKicked = () => {
      setKicked(true);
      onClosed();
    };
    const resume = () => {
      socket.emit('room:resume', (res: RoomAck) => {
        if (res.ok) apply(res);
      });
    };
    socket.on('room:state', onState);
    socket.on('race:start', onStart);
    socket.on('race:tick', onTick);
    socket.on('race:text', onText);
    socket.on('race:bonus', onBonus);
    socket.on('race:results', onResults);
    socket.on('room:invites', onInvites);
    socket.on('room:closed', onClosed);
    socket.on('room:kicked', onKicked);
    socket.on('connect', resume);
    if (socket.connected) resume();
    return () => {
      socket.off('room:state', onState);
      socket.off('race:start', onStart);
      socket.off('race:tick', onTick);
      socket.off('race:text', onText);
      socket.off('race:bonus', onBonus);
      socket.off('race:results', onResults);
      socket.off('room:invites', onInvites);
      socket.off('room:closed', onClosed);
      socket.off('room:kicked', onKicked);
      socket.off('connect', resume);
    };
  }, [apply]);

  const call = useCallback(
    (event: string, ...args: unknown[]) => {
      setError(null);
      socket.emit(event, ...args, (res: RoomAck) => {
        if (res) apply(res);
      });
    },
    [apply],
  );

  const createRoom = useCallback((settings?: Partial<RaceSettings>) => call('room:create', { settings }), [call]);
  const joinRoom = useCallback((code: string) => call('room:join', { code }), [call]);
  const joinWithToken = useCallback((token: string) => call('room:join', { token }), [call]);
  const quickRace = useCallback(() => call('room:quick'), [call]);
  const startRace = useCallback(() => call('room:start'), [call]);
  const leaveRoom = useCallback(() => {
    socket.emit('room:leave', () => undefined);
    setRoom(null);
    setRace(null);
    setResults(null);
    setMyId(null);
    setInvites([]);
  }, []);
  const closeRoom = useCallback(() => call('room:close'), [call]);
  const backToLobby = useCallback(() => call('room:lobby'), [call]);
  const rematch = useCallback(() => call('room:rematch'), [call]);
  const setRole = useCallback((role: 'player' | 'spectator') => call('room:role', { role }), [call]);
  const updateSettings = useCallback((partial: Partial<RaceSettings>) => call('settings:update', partial), [call]);
  const addBot = useCallback((level: BotLevel) => call('bot:add', { level }), [call]);
  const removeBot = useCallback((id: string) => call('bot:remove', { id }), [call]);
  const kick = useCallback((id: string) => call('member:kick', { id }), [call]);
  const createInvite = useCallback(() => call('invite:create'), [call]);
  const revokeInvite = useCallback((id: string) => call('invite:revoke', { id }), [call]);
  const abandon = useCallback(() => call('race:abandon'), [call]);
  const sendKeys = useCallback((keys: string) => socket.emit('race:keys', { keys }), []);

  return {
    room, myId, error, invites, race, tick, bonusLog, results, text, kicked,
    clockOffset: () => offset.current,
    clearError: () => setError(null),
    createRoom, joinRoom, joinWithToken, quickRace, startRace, leaveRoom, closeRoom, backToLobby,
    rematch, setRole, updateSettings, addBot, removeBot, kick, createInvite, revokeInvite, abandon, sendKeys,
  };
}

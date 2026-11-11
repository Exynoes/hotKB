'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BonusEvent, RaceStart, RoomState, Tick } from '../lib/room-types';
import { useLang } from '../lib/i18n';
import LiveTrack from './LiveTrack';

interface Props {
  room: RoomState;
  race: RaceStart;
  text: string | null;
  tick: Tick | null;
  myId: string | null;
  bonusLog: (BonusEvent & { key: number })[];
  clockOffset: () => number;
  onKeys: (keys: string) => void;
  onAbandon: () => void;
  onLeave: () => void;
}

/** Écran de course : décompte, zone de frappe façon Monkeytype, piste en direct (COURSE-01 à COURSE-09). */
/** Caractère fautif affiché à la place de la lettre attendue (l'espace est rendu visible). */
const DEAD_ACCENTS = '\u00b4`^\u00a8~\u02c6\u02dc\u00b8';
const shown = (c: string) => (c === ' ' ? '\u2423' : c);

export default function RaceScreen({ room, race, text, tick, myId, bonusLog, clockOffset, onKeys, onAbandon, onLeave }: Props) {
  const { t } = useLang();
  const isRunner = text !== null;
  const [remaining, setRemaining] = useState(() => race.startsAt - (Date.now() + clockOffset()));
  const [pos, setPos] = useState(race.pos);
  const [wrong, setWrong] = useState<Record<number, string>>({}); // position → caractère tapé (mode libre)
  const [typed, setTyped] = useState(''); // caractère fautif en attente de correction
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const consumed = useRef(0); // nombre de caractères du champ invisible déjà traités
  const [flash, setFlash] = useState(false);
  const [stuck, setStuck] = useState(false); // faute en attente de correction (mode « corriger »)
  const [mistakes, setMistakes] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const buffer = useRef('');
  const posRef = useRef(race.pos);
  const boxRef = useRef<HTMLDivElement>(null);
  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    setCoarse(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setRemaining(race.startsAt - (Date.now() + clockOffset())), 100);
    return () => clearInterval(id);
  }, [race.startsAt, clockOffset]);

  // envoi groupé des frappes (jamais une émission par touche)
  useEffect(() => {
    const id = setInterval(() => {
      if (buffer.current) {
        onKeys(buffer.current);
        buffer.current = '';
      }
    }, 100);
    return () => clearInterval(id);
  }, [onKeys]);

  const me = tick?.players.find((p) => p.id === myId);
  const active = isRunner && remaining <= 0 && (me?.st ?? race.status ?? 'en_course') === 'en_course';
  const fogged = (me?.fog ?? 0) > 0;
  const textLen = text?.length ?? 0;

  useEffect(() => {
    if (remaining <= 0) focusInput();
  }, [remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Traite un caractère saisi. La saisie passe par un champ invisible (et non par les touches du clavier) :
   * c'est le seul moyen de recevoir les caractères composés, comme « ê » (touche morte ^ puis e).
   */
  const handleChar = useCallback(
    (ch: string) => {
      if (!active || !text) return;
      const p = posRef.current;
      if (p >= text.length) return;
      buffer.current += ch;
      if (ch === text[p]) {
        posRef.current = p + 1;
        setPos(p + 1);
        setStuck(false);
        setTyped('');
      } else {
        setFlash(true);
        setTimeout(() => setFlash(false), 250);
        setMistakes((m) => m + 1);
        setStuck(true);
        setTyped(ch);
        if (room.settings.errorMode === 'free') {
          posRef.current = p + 1;
          setPos(p + 1);
          setWrong((w) => ({ ...w, [p]: ch }));
        }
      }
    },
    [active, text, room.settings.errorMode],
  );

  /**
   * Lit les nouveaux caractères du champ invisible. On ne vide JAMAIS le champ pendant une composition
   * (touche morte) : certains navigateurs réinsèrent alors le texte composé et bloquent la lettre suivante.
   * On mémorise plutôt combien de caractères ont déjà été traités.
   */
  const flushInput = useCallback(
    (el: HTMLTextAreaElement) => {
      if (composing.current) return;
      const value = el.value;
      if (value.length < consumed.current) consumed.current = 0;
      const fresh = value.slice(consumed.current);
      consumed.current = value.length;
      for (const ch of fresh) {
        if (ch === '\n' || ch === '\r') continue;
        // accent isolé d'une touche morte (´ ` ^ ¨ ~) : pas une faute, la lettre suivante le complétera
        if (DEAD_ACCENTS.includes(ch) && ch !== text?.[posRef.current]) continue;
        handleChar(ch);
      }
    },
    [handleChar, text],
  );

  // nettoyage du champ invisible quand il est au repos (jamais pendant une composition)
  useEffect(() => {
    const id = setInterval(() => {
      const el = inputRef.current;
      if (el && !composing.current && el.value.length > 0 && consumed.current >= el.value.length) {
        el.value = '';
        consumed.current = 0;
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Resynchronisation : si une salve de frappes est perdue, le client serait en avance sur le serveur
  // pour toujours. On recale sur la position confirmée (progression × longueur) dès que l'écart persiste.
  const lagTicks = useRef(0);
  useEffect(() => {
    if (!me || !textLen || me.st !== 'en_course') return;
    const serverPos = Math.round(me.p * textLen);
    if (posRef.current - serverPos > 20) {
      lagTicks.current += 1;
      if (lagTicks.current >= 2) {
        posRef.current = serverPos;
        setPos(serverPos);
        buffer.current = '';
        lagTicks.current = 0;
      }
    } else {
      lagTicks.current = 0;
    }
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // le serveur peut raccourcir ou rallonger le texte (bonus) : on recale sur sa position
  useEffect(() => {
    posRef.current = Math.min(posRef.current, textLen);
    setPos((p) => Math.min(p, textLen));
  }, [textLen]);

  const chars = useMemo(() => [...(text ?? '')], [text]);
  const secondsLeft = Math.ceil(remaining / 1000);
  const limitLeft = race.maxTimeSec !== null && tick ? Math.max(0, race.maxTimeSec - Math.floor(tick.t / 1000)) : null;

  if (coarse && isRunner) {
    return <p className="max-w-sm text-center">{t('mobileOnly')}</p>;
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5">
      <LiveTrack members={room.members} tick={tick} myId={myId} />

      {bonusLog.map((b) => (
        <p
          key={b.key}
          role="status"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-center"
          style={{ background: 'var(--accent-2)', color: '#2a1206' }}
        >
          {t('bonusAnnounce')} : {b.targetName}{' '}
          {b.type === 'minus3' ? t('bonusMinus3') : b.type === 'plus3' ? t('bonusPlus3') : t('bonusFog')}
        </p>
      ))}

      {remaining > 0 ? (
        <div className="text-center py-10" role="status" aria-live="assertive">
          <p className="text-7xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
            {secondsLeft}
          </p>
          <p style={{ color: 'var(--muted)' }}>{t('get')}</p>
        </div>
      ) : null}

      {isRunner ? (
        <div
          ref={boxRef}
          tabIndex={0}
          role="group"
          aria-label={t('typeHere')}
          onFocus={focusInput}
          onClick={focusInput}
          className="relative rounded-2xl p-5 text-left outline-none focus-visible:ring-2 select-none"
          style={{
            background: 'var(--surface)',
            border: `2px solid ${flash ? 'var(--danger)' : 'var(--border)'}`,
            fontFamily: 'var(--font-mono)',
            fontSize: '1.25rem',
            lineHeight: 1.9,
            filter: fogged ? 'blur(3px)' : undefined,
            opacity: remaining > 0 ? 0.6 : 1,
            transition: 'border-color 100ms',
          }}
          data-testid="typing-box"
        >
          <textarea
            ref={inputRef}
            data-testid="typing-input"
            aria-label={t('typeHere')}
            className="absolute opacity-0 w-px h-px pointer-events-none"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(e) => { composing.current = false; flushInput(e.currentTarget); }}
            onInput={(e) => {
              const native = e.nativeEvent as InputEvent;
              // garde-fou : si un navigateur oublie compositionend, on ne reste pas bloqué
              if (composing.current && !native.isComposing) composing.current = false;
              flushInput(e.currentTarget);
            }}
            onBlur={() => { composing.current = false; }}
          />
          {chars.map((c, i) => {
            const done = i < pos;
            const bad = i in wrong;
            const current = i === pos;
            const pending = current && stuck;
            return (
              <span
                key={i}
                data-state={bad ? 'wrong' : done ? 'done' : current ? 'current' : 'todo'}
                style={{
                  color: bad || pending ? 'var(--danger)' : done ? 'var(--fg)' : 'var(--muted)',
                  opacity: done || bad ? 1 : 0.65,
                  borderBottom: current ? `3px solid ${pending ? 'var(--danger)' : 'var(--accent)'}` : '3px solid transparent',
                  background: bad || pending ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : undefined,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {bad ? shown(wrong[i]) : pending ? shown(typed) : c}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-center" style={{ color: 'var(--muted)' }}>
          {t('spectating')}
        </p>
      )}
      {isRunner && me && me.st !== 'en_course' && (
        <p role="status" className="text-center font-semibold">{me.st === 'termine' ? t('statusTermine') : me.st === 'abandon' ? t('statusAbandon') : t('statusTemps')} · {t('waitingEnd')}</p>
      )}
      {isRunner && me && me.st !== 'en_course' && (
        <button className="underline underline-offset-2 self-center" onClick={onLeave}>{t('leave')}</button>
      )}

      <div className="flex items-center justify-between text-sm font-mono" style={{ color: 'var(--muted)' }}>
        <span>
          {t('yourSpeed')} : {Math.round(me?.wpm ?? 0)} {t('colWpm')} · {t('accuracy')} : {Math.round(me?.acc ?? 100)}% · {mistakes} {t('mistakesCount')}
        </span>
        {limitLeft !== null && <span aria-label="time">{limitLeft} {t('seconds')}</span>}
        {isRunner && (me?.st ?? 'en_course') === 'en_course' && (
          confirm ? (
            <span className="flex items-center gap-2">
              <span>{t('abandonConfirm')}</span>
              <button className="underline" onClick={() => { setConfirm(false); onAbandon(); }}>{t('abandonYes')}</button>
              <button className="underline" onClick={() => { setConfirm(false); focusInput(); }}>{t('abandonNo')}</button>
            </span>
          ) : (
            <button className="underline underline-offset-2" onClick={() => setConfirm(true)}>
              {t('abandon')}
            </button>
          )
        )}
      </div>
    </div>
  );
}

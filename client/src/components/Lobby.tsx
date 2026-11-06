'use client';

import { useState } from 'react';
import type { BotLevel, Invite, RaceSettings, RoomState } from '../lib/room-types';
import { useLang, type TranslationKey } from '../lib/i18n';
import Avatar from './Avatar';

const BOTS: { level: BotLevel; key: TranslationKey }[] = [
  { level: 'noob', key: 'botNoob' },
  { level: 'debutant', key: 'botDebutant' },
  { level: 'intermediaire', key: 'botIntermediaire' },
  { level: 'expert', key: 'botExpert' },
  { level: 'impossible', key: 'botImpossible' },
];

export interface LobbyActions {
  onStart: () => void;
  onLeave: () => void;
  onClose: () => void;
  onSettings: (p: Partial<RaceSettings>) => void;
  onRole: (r: 'player' | 'spectator') => void;
  onAddBot: (l: BotLevel) => void;
  onRemoveBot: (id: string) => void;
  onKick: (id: string) => void;
  onInvite: () => void;
  onRevoke: (id: string) => void;
}

const field = 'rounded-lg px-2 py-1 text-sm';
const fieldStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' };

function Row({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm">{label}</label>
      {children}
    </div>
  );
}

function SettingsPanel({ s, isHost, onChange }: { s: RaceSettings; isHost: boolean; onChange: (p: Partial<RaceSettings>) => void }) {
  const { t } = useLang();
  const dis = !isHost;
  const sel = (id: string, value: string, opts: [string, string][], on: (v: string) => void) => (
    <select id={id} disabled={dis} value={value} onChange={(e) => on(e.target.value)} className={field} style={fieldStyle}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const toggle = (id: string, key: 'punctuation' | 'numbers' | 'capitals' | 'accents' | 'bonuses', label: string) => (
    <Row label={label} id={id}>
      <input id={id} type="checkbox" disabled={dis} checked={s[key]} onChange={(e) => onChange({ [key]: e.target.checked })} className="w-5 h-5 accent-[var(--accent)]" />
    </Row>
  );
  return (
    <fieldset className="flex flex-col gap-2" disabled={dis}>
      <legend className="font-semibold mb-1">{t('settings')}</legend>
      {dis && <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('settingsReadOnly')}</p>}
      <Row label={t('maxTime')} id="s-time">
        {sel('s-time', String(s.maxTimeSec ?? 0), [['0', t('noLimit')], ['30', '30 s'], ['60', '60 s'], ['120', '120 s'], ['300', '300 s']], (v) => onChange({ maxTimeSec: v === '0' ? null : Number(v) }))}
      </Row>
      <Row label={t('language')} id="s-lang">
        {sel('s-lang', s.language, [['fr', 'Français'], ['en', 'English']], (v) => onChange({ language: v as 'fr' | 'en' }))}
      </Row>
      <Row label={t('textType')} id="s-type">
        {sel('s-type', s.textType, [['coherent', t('textCoherent')], ['random', t('textRandom')]], (v) => onChange({ textType: v as 'coherent' | 'random' }))}
      </Row>
      <Row label={t('words')} id="s-words">
        <input id="s-words" type="number" min={10} max={200} disabled={dis} value={s.words} onChange={(e) => onChange({ words: Math.max(10, Math.min(200, Number(e.target.value) || 10)) })} className={`${field} w-20`} style={fieldStyle} />
      </Row>
      <Row label={t('complexity')} id="s-cx">
        {sel('s-cx', s.complexity, [['easy', t('easy')], ['medium', t('medium')], ['hard', t('hard')]], (v) => onChange({ complexity: v as RaceSettings['complexity'] }))}
      </Row>
      {toggle('s-punct', 'punctuation', t('punctuation'))}
      {toggle('s-num', 'numbers', t('numbers'))}
      {toggle('s-cap', 'capitals', t('capitals'))}
      {toggle('s-acc', 'accents', t('accents'))}
      <Row label={t('includeChars')} id="s-inc">
        <input id="s-inc" maxLength={10} disabled={dis} defaultValue={s.includeChars} onBlur={(e) => onChange({ includeChars: e.target.value })} className={`${field} w-24 font-mono`} style={fieldStyle} />
      </Row>
      <Row label={t('excludeChars')} id="s-exc">
        <input id="s-exc" maxLength={10} disabled={dis} defaultValue={s.excludeChars} onBlur={(e) => onChange({ excludeChars: e.target.value })} className={`${field} w-24 font-mono`} style={fieldStyle} />
      </Row>
      <Row label={t('errorMode')} id="s-err">
        {sel('s-err', s.errorMode, [['correct', t('errorCorrect')], ['free', t('errorFree')]], (v) => onChange({ errorMode: v as 'correct' | 'free' }))}
      </Row>
      {toggle('s-bonus', 'bonuses', t('bonuses'))}
      <Row label={t('visibility')} id="s-vis">
        {sel('s-vis', s.visibility, [['public', t('visPublic')], ['code', t('visCode')], ['private', t('visPrivate')]], (v) => onChange({ visibility: v as RaceSettings['visibility'] }))}
      </Row>
      <Row label={t('capacity')} id="s-cap">
        <input id="s-cap" type="number" min={2} max={30} disabled={dis} value={s.capacity} onChange={(e) => onChange({ capacity: Math.max(2, Math.min(30, Number(e.target.value) || 2)) })} className={`${field} w-20`} style={fieldStyle} />
      </Row>
    </fieldset>
  );
}

function InvitePanel({ invites, onInvite, onRevoke }: { invites: Invite[]; onInvite: () => void; onRevoke: (id: string) => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<string | null>(null);
  const link = (tok: string) => `${window.location.origin}/join/${tok}`;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('invites')}</h3>
        <button onClick={onInvite} className="text-sm underline">{t('newInvite')}</button>
      </div>
      <ul className="flex flex-col gap-1">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs font-mono">
            <span className="flex-1 truncate">
              {i.status === 'unused' ? t('inviteUnused') : i.status === 'used' ? `${t('inviteUsed')} ${i.usedBy ?? ''}` : t('inviteRevoked')}
            </span>
            {i.status === 'unused' && (
              <>
                <button
                  className="underline"
                  onClick={() => { void navigator.clipboard?.writeText(link(i.token)); setCopied(i.id); }}
                >
                  {copied === i.id ? t('copied') : t('copyLink')}
                </button>
                <button className="underline" onClick={() => onRevoke(i.id)}>{t('revoke')}</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Lobby({
  room, myId, invites, error, actions,
}: {
  room: RoomState;
  myId: string | null;
  invites: Invite[];
  error: string | null;
  actions: LobbyActions;
}) {
  const { t } = useLang();
  const me = room.members.find((m) => m.id === myId);
  const isHost = !!me?.isHost;
  const racers = room.members.filter((m) => m.role === 'player' || m.kind === 'bot').length;
  const [botLevel, setBotLevel] = useState<BotLevel>('debutant');

  return (
    <div className="w-full max-w-2xl rounded-2xl p-6 flex flex-col gap-5 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--muted)' }}>{t('roomCodeLabel')}</p>
          <div className="flex gap-1.5 mt-1" data-code={room.code} aria-label={room.code} role="img">
            {[...room.code].map((c, i) => <span key={i} className="code-tile" aria-hidden="true">{c}</span>)}
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          {isHost && <button onClick={actions.onClose} className="underline underline-offset-2">{t('closeRoom')}</button>}
          <button onClick={actions.onLeave} className="underline underline-offset-2">{t('leave')}</button>
        </div>
      </div>

      <section>
        <h3 className="font-semibold mb-2">{t('members')} ({room.members.length}/{room.settings.capacity})</h3>
        <ul className="flex flex-col gap-2">
          {room.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--bg)', opacity: m.connected ? 1 : 0.5 }}>
              <Avatar name={m.name} url={m.avatarUrl} size={28} />
              <span className="font-semibold flex-1 truncate">
                {m.name}{m.id === myId && ` ${t('you')}`}
              </span>
              {m.role === 'spectator' && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{t('spectator')}</span>}
              {m.isHost && <span className="text-xs font-mono rounded-full px-2 py-1" style={{ background: 'var(--accent-2)', color: '#2a1206' }}>{t('host')}</span>}
              {isHost && m.kind === 'bot' && <button className="text-xs underline" onClick={() => actions.onRemoveBot(m.id)}>{t('removeBot')}</button>}
              {isHost && m.kind !== 'bot' && m.id !== myId && <button className="text-xs underline" onClick={() => actions.onKick(m.id)}>{t('kickBtn')}</button>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button className="text-sm underline" onClick={() => actions.onRole(me?.role === 'spectator' ? 'player' : 'spectator')}>
            {me?.role === 'spectator' ? t('playAs') : t('watchAs')}
          </button>
          {isHost && (
            <span className="flex items-center gap-2">
              <label htmlFor="bot-level" className="sr-only">{t('addBot')}</label>
              <select id="bot-level" value={botLevel} onChange={(e) => setBotLevel(e.target.value as BotLevel)} className={field} style={fieldStyle}>
                {BOTS.map((b) => <option key={b.level} value={b.level}>{t(b.key)}</option>)}
              </select>
              <button className="text-sm underline" onClick={() => actions.onAddBot(botLevel)}>{t('addBot')}</button>
            </span>
          )}
        </div>
      </section>

      <SettingsPanel s={room.settings} isHost={isHost} onChange={actions.onSettings} />
      {isHost && <InvitePanel invites={invites} onInvite={actions.onInvite} onRevoke={actions.onRevoke} />}

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{t(`err_${error}` as TranslationKey)}</p>}

      {racers < 2 && <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('waitingForPlayers')}</p>}
      {isHost ? (
        <button onClick={actions.onStart} disabled={racers < 2} className="rounded-xl py-3 font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          {t('startRace')}
        </button>
      ) : (
        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>{t('waitingHost')}</p>
      )}
    </div>
  );
}

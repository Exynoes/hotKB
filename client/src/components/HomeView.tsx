'use client';

import { useState } from "react";
import Link from "next/link";
import AuthPanel from "../components/AuthPanel";
import Lobby from "../components/Lobby";
import RaceScreen from "../components/RaceScreen";
import ResultsView from "../components/ResultsView";
import Explorer from "../components/Explorer";
import TopBar from "../components/TopBar";
import RaceTrack from '../components/RaceTrack';
import TypingDemo from '../components/TypingDemo';
import FlameBackground from "../components/FlameBackground";
import { useAuth } from "../lib/auth";
import { useRoom } from "../lib/useRoom";
import { useLang, type TranslationKey } from "../lib/i18n";

export default function HomeView() {
  const [code, setCode] = useState("");
  const { identity, logout, ready } = useAuth();
  const rm = useRoom();
  const { room, myId, error, joinRoom, leaveRoom } = rm;
  const { t } = useLang();

  return (
    <>
      <FlameBackground />
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <TopBar />
        <header className="flex flex-col items-center gap-2">
          <img src="/logo.png" width="96" height="96" alt="Logo HotKB" />
          <h1 className="text-5xl font-extrabold">
            Hot<span style={{ color: "var(--accent)" }}>KB</span>
          </h1>
          <p className="max-w-md" style={{ color: "var(--muted)" }}>
            {t("tagline")}
          </p>
        </header>

        {!ready ? null : !identity ? (
          <AuthPanel />
        ) : room && (room.status === 'decompte' || room.status === 'en_course') && rm.race ? (
          <RaceScreen
            room={room}
            race={rm.race}
            text={rm.text}
            tick={rm.tick}
            myId={myId}
            bonusLog={rm.bonusLog}
            clockOffset={rm.clockOffset}
            onKeys={rm.sendKeys}
            onAbandon={rm.abandon}
            onLeave={leaveRoom}
          />
        ) : room && room.status === 'resultats' && rm.results ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <ResultsView results={rm.results} myId={myId} />
            <div className="flex gap-3 items-center">
              {room.members.find((m) => m.id === myId)?.isHost ? (
                <>
                  <button onClick={rm.rematch} className="rounded-xl px-5 py-3 font-bold text-white" style={{ background: 'var(--accent-btn)' }}>{t('rematch')}</button>
                  <button onClick={rm.backToLobby} className="underline">{t('backToLobby')}</button>
                  <button onClick={rm.closeRoom} className="underline">{t('closeRoom')}</button>
                </>
              ) : (
                <p style={{ color: 'var(--muted)' }}>{t('waitingHost')}</p>
              )}
              <button onClick={leaveRoom} className="underline">{t('leave')}</button>
            </div>
          </div>
        ) : room ? (
          <Lobby
            room={room}
            myId={myId}
            invites={rm.invites}
            error={error}
            actions={{
              onStart: rm.startRace,
              onLeave: leaveRoom,
              onClose: rm.closeRoom,
              onSettings: rm.updateSettings,
              onRole: rm.setRole,
              onAddBot: rm.addBot,
              onRemoveBot: rm.removeBot,
              onKick: rm.kick,
              onInvite: rm.createInvite,
              onRevoke: rm.revokeInvite,
            }}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-5 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p style={{ color: "var(--muted)" }}>
              {t("connectedAs")}{" "}
              <b style={{ color: "var(--fg)" }}>{identity.displayName}</b>
              {identity.kind === "guest" && ` ${t("guestTag")}`} ·{" "}
              <button onClick={logout} className="underline underline-offset-2">
                {t("change")}
              </button>
            </p>

            <form
              className="flex flex-col gap-3 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (code) joinRoom(code);
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("roomCodePlaceholder")}
                aria-label={t("roomCodePlaceholder")}
                maxLength={6}
                autoComplete="off"
                className="w-full rounded-2xl border-2 px-4 py-5 text-center text-3xl font-mono font-bold uppercase tracking-[0.3em] placeholder:text-base placeholder:font-sans placeholder:font-semibold placeholder:tracking-normal outline-none focus:border-[var(--accent)]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--fg)",
                }}
              />
              <button
                type="submit"
                className="w-full rounded-2xl px-5 py-4 text-xl font-extrabold text-white"
                style={{ background: "var(--accent-btn)" }}
              >
                {t("join")}
              </button>
            </form>

            {error && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--danger)" }}
              >
                {t(`err_${error}` as TranslationKey)}
              </p>
            )}

            {identity.kind === "user" && (
              <Link href="/profile" className="underline underline-offset-2 font-semibold">
                {t("myProfile")}
              </Link>
            )}

            <button onClick={rm.quickRace} className="rounded-full px-6 py-2 font-semibold" style={{ background: "var(--accent-2)", color: "#2a1206" }}>
              {t("quickRace")}
            </button>

            {rm.kicked && <p className="text-sm" role="status">{t("kicked")}</p>}

            {identity.kind === "guest" ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t("guestCannotCreate")}
              </p>
            ) : (
              <button
                onClick={() => rm.createRoom()}
                className="rounded-full px-6 py-2 font-semibold"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("createRoom")}
              </button>
            )}
            <Explorer onJoin={joinRoom} />
          </div>
        )}

        <div className="flex flex-col items-center gap-6 w-full max-w-xl mt-4">
          <TypingDemo />
          <RaceTrack />
        </div>
      </main>
    </>
  );
}

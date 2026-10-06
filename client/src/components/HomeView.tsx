'use client';

import { useState } from "react";
import Link from "next/link";
import AuthPanel from "../components/AuthPanel";
import Lobby from "../components/Lobby";
import TopBar from "../components/TopBar";
import RaceTrack from '../components/RaceTrack';
import TypingDemo from '../components/TypingDemo';
import FlameBackground from "../components/FlameBackground";
import { useAuth } from "../lib/auth";
import { useRoom } from "../lib/useRoom";
import { useLang } from "../lib/i18n";

export default function HomeView() {
  const [code, setCode] = useState("");
  const { identity, logout, ready } = useAuth();
  const { room, myId, error, createRoom, joinRoom, startRace, leaveRoom } =
    useRoom();
  const { t } = useLang();

  return (
    <>
      <FlameBackground />
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <TopBar />
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" width="96" height="96" alt="Logo HotKB" />
          <h1 className="text-5xl font-extrabold">
            Hot<span style={{ color: "var(--accent)" }}>KB</span>
          </h1>
          <p className="max-w-md" style={{ color: "var(--muted)" }}>
            {t("tagline")}
          </p>
        </div>

        {!ready ? null : !identity ? (
          <AuthPanel />
        ) : room ? (
          <Lobby
            room={room}
            myId={myId}
            onStart={startRace}
            onLeave={leaveRoom}
          />
        ) : (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
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
                style={{ background: "var(--accent)" }}
              >
                {t("join")}
              </button>
            </form>

            {error && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--danger)" }}
              >
                {error}
              </p>
            )}

            {identity.kind === "user" && (
              <Link href="/profile" className="underline underline-offset-2 font-semibold">
                {t("myProfile")}
              </Link>
            )}

            {identity.kind === "guest" ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t("guestCannotCreate")}
              </p>
            ) : (
              <button
                onClick={createRoom}
                className="rounded-full px-6 py-2 font-semibold"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("createRoom")}
              </button>
            )}
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

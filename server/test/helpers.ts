import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

export async function registerUser(prefix = 'u') {
  const username = `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.slice(0, 20);
  const res = await request(app).post('/api/auth/register').send({ username, password: 'motdepasse1' });
  return { username, token: res.body.token as string, id: res.body.user.id as string };
}

export async function registerGuest(displayName: string) {
  const res = await request(app).post('/api/auth/guest').send({ displayName });
  if (!res.body.token) throw new Error(`Invité refusé : ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string };
}

export async function startRealtime(): Promise<{ url: string; close: () => Promise<void>; http: HttpServer }> {
  const { createRealtime } = await import('../src/realtime.js');
  const http = createServer(app);
  const io = createRealtime(http);
  await new Promise<void>((r) => http.listen(0, r));
  const url = `http://localhost:${(http.address() as AddressInfo).port}`;
  return {
    url,
    http,
    close: async () => {
      await io.close();
    },
  };
}

export function client(url: string, token: string): Socket {
  return connect(url, { auth: { token }, transports: ['websocket'], forceNew: true });
}

export function waitFor<T = unknown>(socket: Socket, event: string, predicate: (v: T) => boolean = () => true, timeout = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Délai dépassé en attendant « ${event} »`));
    }, timeout);
    const handler = (v: T) => {
      if (predicate(v)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(v);
      }
    };
    socket.on(event, handler);
  });
}

export function emitAck<T = Record<string, unknown>>(socket: Socket, event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => {
    if (payload === undefined) socket.emit(event, resolve);
    else socket.emit(event, payload, resolve);
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tape un texte à ~20 frappes/s, sous le plafond de vraisemblance du serveur. */
export async function typeText(socket: Socket, text: string, chunk = 2, everyMs = 100) {
  for (let i = 0; i < text.length; i += chunk) {
    socket.emit('race:keys', { keys: text.slice(i, i + chunk) });
    await sleep(everyMs);
  }
}

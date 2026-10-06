import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.hoisted(() => {
  process.env.GITHUB_CLIENT_ID = 'gh-id';
  process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
  process.env.PUBLIC_URL = 'https://hotkb.test';
});

import { createApp } from '../src/app.js';

const app = createApp();

afterEach(() => vi.unstubAllGlobals());

describe('OAuth (AUTH-01)', () => {
  it('ne propose que les fournisseurs configurés', async () => {
    const res = await request(app).get('/api/auth/oauth/providers');
    expect(res.body.providers).toEqual(['github']); // Discord non configuré dans ce test
  });

  it('redirige vers GitHub avec un state et un cookie anti-CSRF', async () => {
    const res = await request(app).get('/api/auth/oauth/github');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://github.com/login/oauth/authorize');
    expect(res.headers.location).toContain(encodeURIComponent('https://hotkb.test/api/auth/oauth/github/callback'));
    expect(res.headers['set-cookie'][0]).toContain('oauth_nonce=');
  });

  it('refuse un fournisseur non configuré', async () => {
    const res = await request(app).get('/api/auth/oauth/discord');
    expect(res.headers.location).toContain('oauth_error=provider_unavailable');
  });

  it('refuse un callback dont le state ne correspond pas au cookie', async () => {
    const start = await request(app).get('/api/auth/oauth/github');
    const state = new URL(start.headers.location).searchParams.get('state');
    const res = await request(app)
      .get(`/api/auth/oauth/github/callback?code=abc&state=${state}`)
      .set('Cookie', 'oauth_nonce=mauvais');
    expect(res.headers.location).toContain('oauth_error=invalid_state');
  });

  it('crée le compte et renvoie un jeton lors d’un callback valide', async () => {
    const start = await request(app).get('/api/auth/oauth/github');
    const state = new URL(start.headers.location).searchParams.get('state');
    const cookie = start.headers['set-cookie'][0].split(';')[0];

    const login = `ghuser${Date.now()}`.slice(0, 20);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ json: async () => ({ access_token: 'tok' }) })
        .mockResolvedValueOnce({ json: async () => ({ id: Date.now(), login, avatar_url: null }) }),
    );

    const res = await request(app)
      .get(`/api/auth/oauth/github/callback?code=abc&state=${state}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/#token=.+&name=/);
    expect(res.headers.location).toContain(`name=${login}`);
  });
});

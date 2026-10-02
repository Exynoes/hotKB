import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = createApp();

// Nom d'utilisateur unique par exécution pour éviter les collisions en base.
const username = `test_${Date.now()}`;

describe('API auth (AUTH-1, AUTH-3)', () => {
  beforeAll(async () => {
    // S'assure que le schéma existe déjà (voir `npm run migrate`).
    await pool.query('SELECT 1');
  });

  it('GET /api/health répond ok avec la base connectée', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('refuse un nom d’utilisateur trop court à l’inscription', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'brulant1' });
    expect(res.status).toBe(400);
  });

  it('inscrit un nouvel utilisateur et renvoie un jeton', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'brulant1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.username).toBe(username);
  });

  it('refuse une inscription en double', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'brulant1' });
    expect(res.status).toBe(409);
  });

  it('refuse une connexion avec un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'mauvais-mot-de-passe' });
    expect(res.status).toBe(401);
  });

  it('connecte avec le bon mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'brulant1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });

  it('crée une session invité (AUTH-3)', async () => {
    const res = await request(app).post('/api/auth/guest').send({ displayName: 'Nathan' });
    expect(res.status).toBe(201);
    expect(res.body.guest.displayName).toBe('Nathan');
  });

  it('refuse /api/auth/me sans jeton', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('accepte /api/auth/me avec un jeton valide', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'brulant1' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.auth.username).toBe(username);
  });
});

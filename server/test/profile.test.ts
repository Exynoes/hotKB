import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { DEMO_PASSWORD, DEMO_USERNAME, seed } from '../src/seed.js';

const app = createApp();
let token = '';

describe('profil et historique (AUTH-06, HIST-01)', () => {
  beforeAll(async () => {
    await seed();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });
    token = res.body.token;
  });

  it('exige une authentification', async () => {
    expect((await request(app).get('/api/me/profile')).status).toBe(401);
  });

  it("refuse l'accès à un invité (pas d'historique persistant)", async () => {
    const guest = await request(app).post('/api/auth/guest').send({ displayName: 'Visiteur' });
    const res = await request(app)
      .get('/api/me/profile')
      .set('Authorization', `Bearer ${guest.body.token}`);
    expect(res.status).toBe(403);
  });

  it('retourne les statistiques personnelles du compte de démonstration', async () => {
    const res = await request(app).get('/api/me/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(DEMO_USERNAME);
    expect(res.body.stats.races).toBeGreaterThanOrEqual(5);
    expect(res.body.stats.bestWpm).toBe(55);
    expect(res.body.stats.wins).toBeGreaterThanOrEqual(5);
    expect(res.body.progression.length).toBe(res.body.stats.races);
  });

  it("pagine l'historique, du plus récent au plus ancien", async () => {
    const res = await request(app)
      .get('/api/me/history?page=1&pageSize=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
    expect(new Date(res.body.items[0].startedAt) >= new Date(res.body.items[1].startedAt)).toBe(true);
  });

  it('refuse une pagination invalide', async () => {
    const res = await request(app).get('/api/me/history?page=0').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

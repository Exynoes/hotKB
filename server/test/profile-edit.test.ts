import { describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { app, registerGuest, registerUser } from './helpers.js';

describe('profil modifiable (AUTH-04, AUTH-05)', () => {
  it('modifie le nom affiché avec validation', async () => {
    const u = await registerUser('nm');
    const auth = { Authorization: `Bearer ${u.token}` };
    const ok = await request(app).patch('/api/me/display-name').set(auth).send({ displayName: '  Léa  ' });
    expect(ok.status).toBe(200);
    expect(ok.body.displayName).toBe('Léa');
    expect((await request(app).patch('/api/me/display-name').set(auth).send({ displayName: 'x' })).status).toBe(400);
    expect((await request(app).patch('/api/me/display-name').set(auth).send({ displayName: 'a'.repeat(21) })).status).toBe(400);
    const profile = await request(app).get('/api/me/profile').set(auth);
    expect(profile.body.displayName).toBe('Léa');
  });

  it('un invité ne peut pas modifier son profil', async () => {
    const g = await registerGuest('Visiteur');
    const res = await request(app).patch('/api/me/display-name').set('Authorization', `Bearer ${g.token}`).send({ displayName: 'Autre' });
    expect(res.status).toBe(403);
  });

  it("téléverse, redimensionne et sert l'avatar ; refuse les faux fichiers", async () => {
    const u = await registerUser('av');
    const auth = { Authorization: `Bearer ${u.token}` };
    const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#ff4f1f' } }).png().toBuffer();

    const bad = await request(app).put('/api/me/avatar').set(auth).set('Content-Type', 'image/png').send(Buffer.from('<script>alert(1)</script>'));
    expect(bad.status).toBe(400);

    const up = await request(app).put('/api/me/avatar').set(auth).set('Content-Type', 'image/png').send(png);
    expect(up.status).toBe(200);
    expect(up.body.avatarUrl).toMatch(new RegExp(`^/api/avatars/${u.id}\\?v=\\d+$`));

    const img = await request(app).get(up.body.avatarUrl.split('?')[0]);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/webp');
    const meta = await sharp(img.body as Buffer).metadata();
    expect([meta.width, meta.height]).toEqual([256, 256]);

    const big = Buffer.concat([png, Buffer.alloc(3 * 1024 * 1024)]);
    expect((await request(app).put('/api/me/avatar').set(auth).set('Content-Type', 'image/png').send(big)).status).toBe(413);

    await request(app).delete('/api/me/avatar').set(auth);
    expect((await request(app).get(`/api/avatars/${u.id}`)).status).toBe(404);
  });
});

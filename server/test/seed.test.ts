import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import { DEMO_PASSWORD, DEMO_USERNAME, seed } from '../src/seed.js';
import { textes } from '../src/schema.js';

describe('seed de démonstration (TECH-04)', () => {
  beforeAll(async () => {
    await seed();
    await seed(); // idempotent
  });

  it('crée un corpus de textes en français et en anglais', async () => {
    const rows = await db.select().from(textes);
    expect(rows.some((t) => t.language === 'fr')).toBe(true);
    expect(rows.some((t) => t.language === 'en')).toBe(true);
  });

  it('permet de se connecter avec le compte de démonstration', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});

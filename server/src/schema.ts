import {
  boolean,
  check,
  customType,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Schéma Drizzle — miroir typé des migrations SQL versionnées (server/migrations).
 * Les migrations restent la source de vérité du schéma en base (TECH-04).
 */

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

export const users = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: varchar('auth_provider', { length: 32 }).notNull().default('local'),
  providerId: text('provider_id'),
  avatarUrl: text('avatar_url'),
  displayName: varchar('display_name', { length: 20 }),
  avatarData: bytea('avatar_data'),
  avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const guestSessions = pgTable('guest_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 32 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  mergedIntoUserId: uuid('merged_into_user_id').references(() => users.id),
});

export const rooms = pgTable('room', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 6 }).notNull().unique(),
  visibility: varchar('visibility', { length: 16 }).notNull().default('private'),
  hostUserId: uuid('host_user_id').references(() => users.id),
  status: varchar('status', { length: 16 }).notNull().default('en_attente'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roomParticipants = pgTable(
  'room_participant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    guestId: uuid('guest_id').references(() => guestSessions.id),
    isBot: boolean('is_bot').notNull().default(false),
    botDifficulty: varchar('bot_difficulty', { length: 16 }),
    isSpectator: boolean('is_spectator').notNull().default(false),
    botName: varchar('bot_name', { length: 32 }),
    leftAt: timestamp('left_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    check(
      'one_identity',
      sql`(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL) OR (is_bot = true)`,
    ),
  ],
);

export const textes = pgTable('texte', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  language: varchar('language', { length: 8 }).notNull().default('fr'),
  length: integer('length').notNull(),
  containsAccents: boolean('contains_accents').notNull().default(false),
  complexity: varchar('complexity', { length: 8 }).notNull().default('medium'),
});

export const races = pgTable('race', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  texteId: uuid('texte_id').references(() => textes.id),
  textContent: text('text_content'),
  language: varchar('language', { length: 8 }),
  settings: jsonb('settings').notNull().default({}),
  startedAt: timestamp('started_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  status: varchar('status', { length: 16 }).notNull().default('en_attente'),
});

export const raceResults = pgTable('race_result', {
  id: uuid('id').primaryKey().defaultRandom(),
  raceId: uuid('race_id')
    .notNull()
    .references(() => races.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => roomParticipants.id),
  wpm: real('wpm'),
  accuracy: real('accuracy'),
  rank: integer('rank'),
  errorsCount: integer('errors_count').notNull().default(0),
  rawWpm: real('raw_wpm'),
  timeMs: integer('time_ms'),
  status: varchar('status', { length: 16 }).notNull().default('termine'),
  progress: real('progress').notNull().default(1),
  bonuses: jsonb('bonuses').notNull().default([]),
  wpmSeries: jsonb('wpm_series').notNull().default([]),
  keyErrors: jsonb('key_errors').notNull().default({}),
  personalRecord: boolean('personal_record').notNull().default(false),
});

export const personalBests = pgTable(
  'personal_best',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    texteId: uuid('texte_id')
      .notNull()
      .references(() => textes.id),
    bestWpm: real('best_wpm').notNull(),
    bestTime: integer('best_time').notNull(),
  },
  (t) => [unique().on(t.userId, t.texteId)],
);

export const keyErrorStats = pgTable(
  'key_error_stat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    keyChar: varchar('key_char', { length: 4 }).notNull(),
    errorCount: integer('error_count').notNull().default(0),
  },
  (t) => [unique().on(t.userId, t.keyChar)],
);

export const roomInvites = pgTable('room_invite', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  usedByName: varchar('used_by_name', { length: 32 }),
  usedByIdentity: text('used_by_identity'),
  usedIp: text('used_ip'),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or server UID
  email: text('email').notNull(),
  password: text('password'), // Legacy column during migration
  passwordHash: text('password_hash'), // Secure scrypt password hash
  name: text('name').notNull(),
  avatar: text('avatar'),
  isAdmin: boolean('is_admin').default(false),
  role: text('role').default('user').notNull(), // 'user', 'admin', 'superadmin'
  permissions: text('permissions').array().default([]), // ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage']
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const news = pgTable('news', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  image: text('image'),
  categoryId: integer('category_id').references(() => categories.id),
  authorId: integer('author_id').references(() => users.id).notNull(),
  views: integer('views').default(0),
  isFeatured: boolean('is_featured').default(false),
  isBreaking: boolean('is_breaking').default(false),
  status: text('status').default('published').notNull(), // 'published', 'draft'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  newsId: integer('news_id').references(() => news.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contestSettings = pgTable('contest_settings', {
  id: serial('id').primaryKey(),
  name: text('name').default('مسابقة توقعات KoraNews').notNull(),
  description: text('description').default('توقع نتائج المباريات وتصدر الترتيب العام واكسب النقاط!').notNull(),
  registrationStartDate: timestamp('registration_start_date'),
  registrationEndDate: timestamp('registration_end_date'),
  predictionsStartDate: timestamp('predictions_start_date'),
  contestEndDate: timestamp('contest_end_date'),
  status: text('status').default('active').notNull(), // 'registration_open', 'registration_closed', 'active', 'completed', 'paused'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contestParticipants = pgTable('contest_participants', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  contestId: integer('contest_id').references(() => contestSettings.id),
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected', 'blocked'
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictionMatches = pgTable('prediction_matches', {
  id: serial('id').primaryKey(),
  matchId: text('match_id').references(() => matches.id, { onDelete: 'cascade' }),
  contestId: integer('contest_id').references(() => contestSettings.id),
  externalMatchId: text('external_match_id'),
  isExternal: boolean('is_external').default(false).notNull(),
  customLeagueName: text('custom_league_name'),
  customLeagueLogo: text('custom_league_logo'),
  customHomeName: text('custom_home_name'),
  customHomeLogo: text('custom_home_logo'),
  customAwayName: text('custom_away_name'),
  customAwayLogo: text('custom_away_logo'),
  customHomeScore: integer('custom_home_score'),
  customAwayScore: integer('custom_away_score'),
  customMatchDate: timestamp('custom_match_date'),
  customStatus: text('custom_status'),
  pointsPerMatch: integer('points_per_match').default(2).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isCalculated: boolean('is_calculated').default(false).notNull(),
  calculatedAt: timestamp('calculated_at'),
  isConfirmedByAdmin: boolean('is_confirmed_by_admin').default(false).notNull(),
  confirmedAt: timestamp('confirmed_at'),
  confirmedBy: integer('confirmed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  predictionMatchId: integer('prediction_match_id').references(() => predictionMatches.id, { onDelete: 'cascade' }).notNull(),
  contestId: integer('contest_id').references(() => contestSettings.id),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  pointsEarned: integer('points_earned').default(0).notNull(),
  isEvaluated: boolean('is_evaluated').default(false).notNull(),
  isGolden: boolean('is_golden').default(false).notNull(),
  goldenPoints: integer('golden_points').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictionPoints = pgTable('prediction_points', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  predictionId: integer('prediction_id').references(() => predictions.id, { onDelete: 'cascade' }).notNull().unique(),
  predictionMatchId: integer('prediction_match_id').references(() => predictionMatches.id, { onDelete: 'cascade' }).notNull(),
  contestId: integer('contest_id').references(() => contestSettings.id),
  points: integer('points').default(2).notNull(),
  isGoldenBonus: boolean('is_golden_bonus').default(false).notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  news: many(news),
  comments: many(comments),
  activityLogs: many(activityLogs),
  predictions: many(predictions),
  predictionPoints: many(predictionPoints),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  news: many(news),
}));

export const newsRelations = relations(news, ({ one, many }) => ({
  author: one(users, {
    fields: [news.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [news.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  news: one(news, {
    fields: [comments.newsId],
    references: [news.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const leagues = pgTable('leagues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
});

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  leagueId: text('league_id').references(() => leagues.id),
  homeTeamId: text('home_team_id').references(() => teams.id),
  awayTeamId: text('away_team_id').references(() => teams.id),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  status: text('status').notNull(),
  matchTime: text('match_time'),
  matchDate: timestamp('match_date').notNull(),
  source: text('source'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const matchesRelations = relations(matches, ({ one, many }) => ({
  league: one(leagues, {
    fields: [matches.leagueId],
    references: [leagues.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
  }),
  predictionMatch: one(predictionMatches, {
    fields: [matches.id],
    references: [predictionMatches.matchId],
  }),
}));

export const predictionMatchesRelations = relations(predictionMatches, ({ one, many }) => ({
  match: one(matches, {
    fields: [predictionMatches.matchId],
    references: [matches.id],
  }),
  predictions: many(predictions),
  predictionPoints: many(predictionPoints),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
  predictionMatch: one(predictionMatches, {
    fields: [predictions.predictionMatchId],
    references: [predictionMatches.id],
  }),
  pointRecord: one(predictionPoints, {
    fields: [predictions.id],
    references: [predictionPoints.predictionId],
  }),
}));

export const predictionPointsRelations = relations(predictionPoints, ({ one }) => ({
  user: one(users, {
    fields: [predictionPoints.userId],
    references: [users.id],
  }),
  prediction: one(predictions, {
    fields: [predictionPoints.predictionId],
    references: [predictions.id],
  }),
  predictionMatch: one(predictionMatches, {
    fields: [predictionPoints.predictionMatchId],
    references: [predictionMatches.id],
  }),
}));

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contestParticipantsRelations = relations(contestParticipants, ({ one }) => ({
  user: one(users, {
    fields: [contestParticipants.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [contestParticipants.reviewedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const standingsCache = pgTable('standings_cache', {
  leagueId: text('league_id').primaryKey(),
  season: text('season').default('2026').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailVerifications = pgTable('email_verifications', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastSentAt: timestamp('last_sent_at').defaultNow().notNull(),
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

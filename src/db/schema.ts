import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or server UID
  email: text('email').notNull(),
  password: text('password'),
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

export const usersRelations = relations(users, ({ many }) => ({
  news: many(news),
  comments: many(comments),
  activityLogs: many(activityLogs),
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

export const matchesRelations = relations(matches, ({ one }) => ({
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

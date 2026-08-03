const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');
const newSchema = `
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
`;
code += newSchema;
fs.writeFileSync('src/db/schema.ts', code);

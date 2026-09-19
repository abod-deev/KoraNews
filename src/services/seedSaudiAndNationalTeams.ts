import { db } from '../db/index.ts';
import { leagues, teams, predictionMatches } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  ALL_KNOWN_TEAMS,
  ALL_KNOWN_LEAGUES,
  SAUDI_LEAGUES,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  normalizeSportsName,
  isNationalTeam,
  matchTeamFromCatalog,
  matchLeagueFromCatalog,
} from './knownTeamsAndLeagues.ts';

export {
  ALL_KNOWN_TEAMS,
  ALL_KNOWN_LEAGUES,
  SAUDI_LEAGUES,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  normalizeSportsName,
  matchTeamFromCatalog,
  matchLeagueFromCatalog,
};

let hasSeeded = false;
let seedingPromise: Promise<{ leaguesCount: number; teamsCount: number; matchesUpdatedCount: number }> | null = null;

/**
 * Ensures Saudi League, Clubs and National Teams exist in the database with their correct identification (names and IDs).
 * Does not overwrite team logos with hardcoded URLs.
 */
export async function seedSaudiAndNationalTeams(force = false): Promise<{ leaguesCount: number; teamsCount: number; matchesUpdatedCount: number }> {
  if (hasSeeded && !force) {
    return { leaguesCount: 0, teamsCount: 0, matchesUpdatedCount: 0 };
  }
  if (seedingPromise && !force) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      let seededLeagues = 0;
      let seededTeams = 0;
      let matchesUpdated = 0;

      // 1. Seed Leagues
      const existingDbLeagues = await db.select().from(leagues);
      const dbLeagueMap = new Map<string, typeof leagues.$inferSelect>();
      for (const l of existingDbLeagues) {
        dbLeagueMap.set(l.id.toLowerCase(), l);
        dbLeagueMap.set(normalizeSportsName(l.name), l);
      }

      for (const league of ALL_KNOWN_LEAGUES) {
        const normName = normalizeSportsName(league.name);
        const existing = dbLeagueMap.get(league.id.toLowerCase()) || dbLeagueMap.get(normName);

        if (!existing) {
          await db
            .insert(leagues)
            .values({
              id: league.id,
              name: league.name,
              logo: league.logo || null,
            })
            .onConflictDoNothing();
          seededLeagues++;
        }
      }

      // 2. Seed Teams (Identifiers & Names only, logos start clean)
      const existingDbTeams = await db.select().from(teams);
      const dbTeamMapById = new Map<string, typeof teams.$inferSelect>();
      const dbNtMap = new Map<string, typeof teams.$inferSelect>();
      const dbClubMap = new Map<string, typeof teams.$inferSelect>();

      for (const t of existingDbTeams) {
        dbTeamMapById.set(t.id.toLowerCase(), t);
        const norm = normalizeSportsName(t.name);
        if (isNationalTeam(t)) {
          dbNtMap.set(norm, t);
        } else {
          dbClubMap.set(norm, t);
        }
      }

      for (const team of ALL_KNOWN_TEAMS) {
        const isNt = isNationalTeam(team);
        const normName = normalizeSportsName(team.name);
        const targetMap = isNt ? dbNtMap : dbClubMap;

        let existing = dbTeamMapById.get(team.id.toLowerCase()) || targetMap.get(normName);

        if (!existing) {
          for (const alias of team.aliases) {
            const matchAlias = targetMap.get(normalizeSportsName(alias));
            if (matchAlias) {
              existing = matchAlias;
              break;
            }
          }
        }

        if (!existing) {
          await db
            .insert(teams)
            .values({
              id: team.id,
              name: team.name,
              logo: null,
            })
            .onConflictDoNothing();
          seededTeams++;
        }
      }

      hasSeeded = true;
      return { leaguesCount: seededLeagues, teamsCount: seededTeams, matchesUpdatedCount: matchesUpdated };
    } catch (error) {
      console.error('Error during team and league seeding:', error);
      return { leaguesCount: 0, teamsCount: 0, matchesUpdatedCount: 0 };
    }
  })();

  return seedingPromise;
}

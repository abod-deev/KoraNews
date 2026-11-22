import { db } from '../db/index.ts';
import { leagues, teams } from '../db/schema.ts';
import { eq, or, sql } from 'drizzle-orm';
import {
  ALL_KNOWN_TEAMS,
  ALL_KNOWN_LEAGUES,
  SAUDI_LEAGUES,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  normalizeSportsName,
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
let seedingPromise: Promise<{ leaguesCount: number; teamsCount: number }> | null = null;

/**
 * Ensures Saudi League, Clubs and National Teams are seeded and up-to-date with official logos in the database.
 */
export async function seedSaudiAndNationalTeams(): Promise<{ leaguesCount: number; teamsCount: number }> {
  if (hasSeeded) {
    return { leaguesCount: 0, teamsCount: 0 };
  }
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      let seededLeagues = 0;
      let seededTeams = 0;

      // 1. Seed & Update Leagues
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
              logo: league.logo,
            })
            .onConflictDoNothing();
          seededLeagues++;
        } else if (
          league.logo &&
          (!existing.logo || existing.logo.includes('placeholder') || existing.logo.includes('ui-avatars'))
        ) {
          // Upgrade missing or placeholder logo to official logo
          await db
            .update(leagues)
            .set({ logo: league.logo })
            .where(eq(leagues.id, existing.id))
            .catch(() => null);
        }
      }

      // 2. Seed & Update Teams
      const existingDbTeams = await db.select().from(teams);
      const dbTeamMap = new Map<string, typeof teams.$inferSelect>();
      for (const t of existingDbTeams) {
        dbTeamMap.set(t.id.toLowerCase(), t);
        dbTeamMap.set(normalizeSportsName(t.name), t);
      }

      for (const team of ALL_KNOWN_TEAMS) {
        const normName = normalizeSportsName(team.name);
        let existing = dbTeamMap.get(team.id.toLowerCase()) || dbTeamMap.get(normName);

        if (!existing) {
          // Check aliases
          for (const alias of team.aliases) {
            const matchAlias = dbTeamMap.get(normalizeSportsName(alias));
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
              logo: team.logo,
            })
            .onConflictDoNothing();
          seededTeams++;
        } else if (team.logo && existing.logo !== team.logo) {
          // Upgrade or fix shifted logo to the official accurate logo
          await db
            .update(teams)
            .set({ logo: team.logo })
            .where(eq(teams.id, existing.id))
            .catch(() => null);
        }
      }

      hasSeeded = true;
      return { leaguesCount: seededLeagues, teamsCount: seededTeams };
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

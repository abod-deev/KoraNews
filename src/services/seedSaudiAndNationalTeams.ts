import { db } from '../db/index.ts';
import { leagues, teams, predictionMatches } from '../db/schema.ts';
import { eq, or, sql } from 'drizzle-orm';
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
 * Ensures Saudi League, Clubs and National Teams are seeded and up-to-date with official logos in the database.
 * Also synchronizes prediction match logos.
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
          (force || !existing.logo || existing.logo !== league.logo)
        ) {
          // Upgrade missing or placeholder logo to official logo
          await db
            .update(leagues)
            .set({ logo: league.logo })
            .where(eq(leagues.id, existing.id))
            .catch(() => null);
          seededLeagues++;
        }
      }

      // 2. Seed & Update Teams
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
          // Check aliases strictly within same category (national vs club)
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
              logo: team.logo,
            })
            .onConflictDoNothing();
          seededTeams++;
        } else if (team.logo && (force || existing.logo !== team.logo)) {
          // Upgrade or fix shifted logo to the official accurate logo
          await db
            .update(teams)
            .set({ logo: team.logo })
            .where(eq(teams.id, existing.id))
            .catch(() => null);
          seededTeams++;
        }
      }

      // 3. Sync all prediction_matches with official logos
      if (force) {
        const allPredMatches = await db.select().from(predictionMatches);
        for (const pm of allPredMatches) {
          let updated = false;
          let newHomeLogo = pm.customHomeLogo;
          let newAwayLogo = pm.customAwayLogo;

          if (pm.customHomeName) {
            const matchedHome = matchTeamFromCatalog(pm.customHomeName);
            if (matchedHome?.logo && matchedHome.logo !== pm.customHomeLogo) {
              newHomeLogo = matchedHome.logo;
              updated = true;
            }
          }

          if (pm.customAwayName) {
            const matchedAway = matchTeamFromCatalog(pm.customAwayName);
            if (matchedAway?.logo && matchedAway.logo !== pm.customAwayLogo) {
              newAwayLogo = matchedAway.logo;
              updated = true;
            }
          }

          if (updated) {
            await db
              .update(predictionMatches)
              .set({
                customHomeLogo: newHomeLogo,
                customAwayLogo: newAwayLogo,
              })
              .where(eq(predictionMatches.id, pm.id))
              .catch(() => null);
            matchesUpdated++;
          }
        }
      }

      hasSeeded = true;
      return { leaguesCount: seededLeagues, teamsCount: seededTeams, matchesUpdatedCount: matchesUpdated };
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

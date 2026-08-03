import { db } from "../db/index.ts";
import { matches, teams, leagues } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const API_KEY = process.env.FOOTBALL_API_KEY || 'demo_key'; // Replace with real API key
const BASE_URL = 'https://api.football-data.org/v4'; // Example external API

export async function fetchLiveMatches() {
  console.log("Fetching live matches from external API...");
  // In a real app, you would fetch from the external API here using the API key.
  // const res = await fetch(`${BASE_URL}/matches?status=IN_PLAY`, { headers: { 'X-Auth-Token': API_KEY } });
  // const data = await res.json();
  
  // For demonstration, we will simulate the external API response:
  const mockExternalData = {
    matches: [
      {
        id: "ext_m1",
        status: "LIVE",
        utcDate: new Date().toISOString(),
        score: { fullTime: { home: 1, away: 2 } },
        competition: { id: "ext_l1", name: "الدوري الإسباني", emblem: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/LaLiga_Santander.svg/120px-LaLiga_Santander.svg.png" },
        homeTeam: { id: "ext_t1", name: "ريال مدريد", crest: "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/120px-Real_Madrid_CF.svg.png" },
        awayTeam: { id: "ext_t2", name: "برشلونة", crest: "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png" },
      }
    ]
  };

  await processAndStoreMatches(mockExternalData.matches);
}

export async function fetchUpcomingMatches() {
  console.log("Fetching upcoming matches from external API...");
  const mockExternalData = {
    matches: [
      {
        id: "ext_m2",
        status: "SCHEDULED",
        utcDate: new Date(Date.now() + 86400000).toISOString(),
        score: { fullTime: { home: null, away: null } },
        competition: { id: "ext_l2", name: "الدوري الإنجليزي", emblem: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/120px-Premier_League_Logo.svg.png" },
        homeTeam: { id: "ext_t5", name: "مانشستر سيتي", crest: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/120px-Manchester_City_FC_badge.svg.png" },
        awayTeam: { id: "ext_t6", name: "ليفربول", crest: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/120px-Liverpool_FC.svg.png" },
      }
    ]
  };
  await processAndStoreMatches(mockExternalData.matches);
}

async function processAndStoreMatches(apiMatches: any[]) {
  for (const apiMatch of apiMatches) {
    // 1. Ensure League exists
    const leagueId = String(apiMatch.competition.id);
    const existingLeague = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    if (existingLeague.length === 0) {
      await db.insert(leagues).values({
        id: leagueId,
        name: apiMatch.competition.name,
        logo: apiMatch.competition.emblem,
      });
    }

    // 2. Ensure Teams exist
    const homeTeamId = String(apiMatch.homeTeam.id);
    const existingHomeTeam = await db.select().from(teams).where(eq(teams.id, homeTeamId));
    if (existingHomeTeam.length === 0) {
      await db.insert(teams).values({
        id: homeTeamId,
        name: apiMatch.homeTeam.name,
        logo: apiMatch.homeTeam.crest,
      });
    }

    const awayTeamId = String(apiMatch.awayTeam.id);
    const existingAwayTeam = await db.select().from(teams).where(eq(teams.id, awayTeamId));
    if (existingAwayTeam.length === 0) {
      await db.insert(teams).values({
        id: awayTeamId,
        name: apiMatch.awayTeam.name,
        logo: apiMatch.awayTeam.crest,
      });
    }

    // 3. Upsert Match
    const matchId = String(apiMatch.id);
    const existingMatch = await db.select().from(matches).where(eq(matches.id, matchId));
    
    const matchData = {
      leagueId,
      homeTeamId,
      awayTeamId,
      homeScore: apiMatch.score?.fullTime?.home ?? null,
      awayScore: apiMatch.score?.fullTime?.away ?? null,
      status: apiMatch.status, // LIVE, SCHEDULED, FINISHED
      matchTime: apiMatch.status === 'LIVE' ? '75\'' : (apiMatch.status === 'FINISHED' ? 'FT' : '20:00'),
      matchDate: new Date(apiMatch.utcDate),
      source: 'api-football',
      updatedAt: new Date(),
    };

    if (existingMatch.length === 0) {
      await db.insert(matches).values({
        id: matchId,
        ...matchData,
      });
    } else {
      await db.update(matches).set(matchData).where(eq(matches.id, matchId));
    }
  }
}

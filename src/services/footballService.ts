import { db } from "../db/index.ts";
import { matches, teams, leagues } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { fetchFromFootballData, RateLimitError } from "./footballApi.ts";

// Free tier supported competitions
const SUPPORTED_LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'WC', 'ELC', 'DED', 'PPL', 'CLI'];

export async function fetchLiveMatches() {
  console.log("Attempting to fetch live matches from football-data.org...");
  try {
    const data = await fetchFromFootballData('/matches?status=IN_PLAY,PAUSED');
    if (data && data.matches && data.matches.length > 0) {
      console.log(`Successfully fetched ${data.matches.length} live matches.`);
      await processAndStoreMatches(data.matches);
    } else {
      console.log("No live matches returned from API.");
    }
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      console.warn(`[LiveMatches] Rate limit hit: ${err.message}`);
    } else {
      console.error("[LiveMatches] External API fetch error:", err.message || err);
    }
  }
}

export async function fetchUpcomingMatches() {
  console.log("Attempting to fetch upcoming matches from football-data.org...");
  try {
    const dateFrom = new Date().toISOString().split('T')[0];
    const dateTo = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const data = await fetchFromFootballData(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);

    if (data && data.matches && data.matches.length > 0) {
      const filteredMatches = data.matches.filter((m: any) => 
        m.competition && (SUPPORTED_LEAGUES.includes(m.competition.code) || SUPPORTED_LEAGUES.includes(String(m.competition.id)))
      );
      
      const matchesToStore = filteredMatches.length > 0 ? filteredMatches : data.matches.slice(0, 20);
      console.log(`Successfully fetched ${matchesToStore.length} upcoming matches.`);
      await processAndStoreMatches(matchesToStore);
    }
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      console.warn(`[UpcomingMatches] Rate limit hit: ${err.message}`);
    } else {
      console.error("[UpcomingMatches] External API fetch error:", err.message || err);
    }
  }
}

const LEAGUE_AR_NAMES: Record<string, string> = {
  'PL': 'الدوري الإنجليزي الممتاز',
  '2021': 'الدوري الإنجليزي الممتاز',
  'PD': 'الدوري الإسباني',
  '2014': 'الدوري الإسباني',
  'SA': 'الدوري الإيطالي',
  '2019': 'الدوري الإيطالي',
  'BL1': 'الدوري الألماني',
  '2002': 'الدوري الألماني',
  'FL1': 'الدوري الفرنسي',
  '2015': 'الدوري الفرنسي',
  'CL': 'دوري أبطال أوروبا',
  '2001': 'دوري أبطال أوروبا',
  'ELC': 'دوري البطولة الإنجليزية',
  '2016': 'دوري البطولة الإنجليزية',
  'EC': 'بطولة أمم أوروبا',
  '2018': 'بطولة أمم أوروبا',
  'WC': 'كأس العالم',
  '2000': 'كأس العالم',
  'DED': 'الدوري الهولندي',
  '2003': 'الدوري الهولندي',
  'PPL': 'الدوري البرتغالي',
  '2017': 'الدوري البرتغالي',
  'CLI': 'كأس ليبرتادوريس',
  '2013': 'كأس ليبرتادوريس',
};

async function processAndStoreMatches(apiMatches: any[]) {
  for (const apiMatch of apiMatches) {
    // 1. Ensure League exists
    const leagueId = String(apiMatch.competition.id);
    const code = apiMatch.competition.code || '';
    const arabicName = LEAGUE_AR_NAMES[code] || LEAGUE_AR_NAMES[leagueId] || apiMatch.competition.name;
    
    const existingLeague = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    if (existingLeague.length === 0) {
      await db.insert(leagues).values({
        id: leagueId,
        name: arabicName,
        logo: apiMatch.competition.emblem,
      });
    } else if (existingLeague[0].name !== arabicName) {
      await db.update(leagues).set({ name: arabicName, logo: apiMatch.competition.emblem }).where(eq(leagues.id, leagueId));
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
    
    let normalizedStatus = 'SCHEDULED';
    if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(apiMatch.status)) {
      normalizedStatus = 'LIVE';
    } else if (apiMatch.status === 'FINISHED') {
      normalizedStatus = 'FINISHED';
    }

    const matchDateObj = new Date(apiMatch.utcDate);
    const formattedTime = matchDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const matchData = {
      leagueId,
      homeTeamId,
      awayTeamId,
      homeScore: apiMatch.score?.fullTime?.home ?? (apiMatch.score?.halfTime?.home ?? null),
      awayScore: apiMatch.score?.fullTime?.away ?? (apiMatch.score?.halfTime?.away ?? null),
      status: normalizedStatus,
      matchTime: normalizedStatus === 'LIVE' ? "مباشر" : (normalizedStatus === 'FINISHED' ? 'انتهت' : formattedTime),
      matchDate: matchDateObj,
      source: 'football-data.org',
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

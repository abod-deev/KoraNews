export type { Match, Standing, Team, Player, League } from './api_types.ts';
import type { Match, Standing, Team, Player, League } from './api_types.ts';
import { isMatchOnDate, isMatchSeason2026 } from '../utils/timezoneDateUtils.ts';
import { cachedFetch, getSyncCached, invalidateClientCache } from '../utils/apiCache.ts';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface GetMatchesResponse {
  matches: Match[];
  error?: string;
}

export const invalidateMatchesCache = () => {
  invalidateClientCache('matches_');
};

export const getMatches = async (date?: string, status?: string, leagueId?: string, season: string = '2026', sortBy?: string): Promise<Match[]> => {
  const result = await getMatchesWithResult(date, status, leagueId, season, sortBy);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.matches;
};

export const getMatchesWithResult = async (
  date?: string, 
  status?: string, 
  leagueId?: string, 
  season: string = '2026', 
  sortBy?: string,
  options?: { forceFresh?: boolean; onBackgroundUpdate?: (res: GetMatchesResponse) => void }
): Promise<GetMatchesResponse> => {
  const cacheKey = `matches_${date || 'all'}_${status || 'all'}_${leagueId || 'all'}_${season}_${sortBy || 'default'}`;

  try {
    return await cachedFetch<GetMatchesResponse>(
      cacheKey,
      async () => {
        // Strictly enforce season 2026
        const enforcedSeason = '2026';

        let url = `${API_URL}/api/matches?season=${enforcedSeason}&`;
        if (date) url += `date=${encodeURIComponent(date)}&`;
        if (status) url += `status=${encodeURIComponent(status)}&`;
        if (leagueId) url += `leagueId=${encodeURIComponent(leagueId)}&`;
        if (sortBy) url += `sortBy=${encodeURIComponent(sortBy)}&`;
        
        const res = await fetch(url);
        const data: unknown = await res.json().catch(() => null);

        const errorPayload = data as { error?: boolean | string; message?: string } | null;
        if (!res.ok || (errorPayload && errorPayload.error)) {
          let errorMsg = `خطأ في الخادم (${res.status})`;
          if (res.status === 429 || errorPayload?.message?.includes('429') || errorPayload?.message?.includes('تجاوزت')) {
            errorMsg = '⚠️ تجاوزت حد الطلبات المسموح (10 طلبات في الدقيقة). انتظر قليلاً.';
          } else if (res.status === 403 || errorPayload?.message?.includes('403') || errorPayload?.message?.includes('غير صحيح')) {
            errorMsg = '❌ مفتاح API غير صحيح أو غير مفعّل. تأكد من المفتاح.';
          } else if (errorPayload?.message) {
            errorMsg = errorPayload.message;
          }
          return { matches: [], error: errorMsg };
        }

        if (!Array.isArray(data)) return { matches: [] };
        
        // Enforce season 2026 and accurate date verification on client side
        const rawMatches = data as Match[];
        const matchesList: Match[] = rawMatches
          .filter((m: Match) => {
            // 1. Must strictly belong to Season 2026
            if (!isMatchSeason2026(m)) return false;

            // 2. If a specific date was requested, ensure the match date matches exactly
            if (date) {
              const matchDateVal = m.matchDate;
              if (!isMatchOnDate(matchDateVal, date)) {
                return false;
              }
            }
            return true;
          })
          .map((m: Match) => ({
            ...m,
            season: '2026',
            leagueName: m.leagueName || 'الدوري'
          }));

        return { matches: matchesList };
      },
      {
        ttlMs: 25000,
        forceFresh: options?.forceFresh,
        onBackgroundUpdate: options?.onBackgroundUpdate,
      }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'تعذر الاتصال بالخادم. حاول مرة أخرى لاحقاً.';
    console.warn('getMatches warning:', errMessage);
    return { matches: [], error: errMessage };
  }
};

export const getLeagues = async (): Promise<League[]> => {
  try {
    return await cachedFetch<League[]>(
      'leagues_list',
      async () => {
        const res = await fetch(`${API_URL}/api/leagues`);
        if (!res.ok) {
          console.warn('API /api/leagues returned status:', res.status);
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      },
      { ttlMs: 300000 } // 5 minutes
    );
  } catch (error) {
    console.warn('getLeagues warning:', error);
    return [];
  }
};

export const getStandings = async (leagueId: string, season: string = '2026'): Promise<Standing[]> => {
  try {
    return await cachedFetch<Standing[]>(
      `standings_${leagueId || 'PD'}_${season}`,
      async () => {
        const res = await fetch(`${API_URL}/api/standings/${leagueId || 'PD'}?season=${season}`);
        if (!res.ok) {
          console.warn('API /api/standings returned status:', res.status);
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      },
      { ttlMs: 120000 } // 2 minutes
    );
  } catch (error) {
    console.warn('getStandings warning:', error);
    return [];
  }
};
export const getTeams = async (): Promise<Team[]> => { return []; };
export const getTeamById = async (id: string): Promise<Team | null> => { return null; };
export const getPlayers = async (teamId?: string): Promise<Player[]> => { return []; };
export const getPlayerById = async (id: string): Promise<Player | null> => { return null; };

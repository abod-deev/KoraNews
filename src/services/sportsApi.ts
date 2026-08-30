export type { Match, Standing, Team, Player, League } from './api_types.ts';
import type { Match, Standing, Team, Player, League } from './api_types.ts';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface GetMatchesResponse {
  matches: Match[];
  error?: string;
}

export const getMatches = async (date?: string, status?: string, leagueId?: string, season: string = '2026', sortBy?: string): Promise<Match[]> => {
  const result = await getMatchesWithResult(date, status, leagueId, season, sortBy);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.matches;
};

export const getMatchesWithResult = async (date?: string, status?: string, leagueId?: string, season: string = '2026', sortBy?: string): Promise<GetMatchesResponse> => {
  try {
    let url = `${API_URL}/api/matches?season=${season}&`;
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}&`;
    if (leagueId) url += `leagueId=${leagueId}&`;
    if (sortBy) url += `sortBy=${sortBy}&`;
    
    const res = await fetch(url);
    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.error)) {
      let errorMsg = `خطأ في الخادم (${res.status})`;
      if (res.status === 429 || data?.message?.includes('429') || data?.message?.includes('تجاوزت')) {
        errorMsg = '⚠️ تجاوزت حد الطلبات المسموح (10 طلبات في الدقيقة). انتظر قليلاً.';
      } else if (res.status === 403 || data?.message?.includes('403') || data?.message?.includes('غير صحيح')) {
        errorMsg = '❌ مفتاح API غير صحيح أو غير مفعّل. تأكد من المفتاح.';
      } else if (data?.message) {
        errorMsg = data.message;
      }
      return { matches: [], error: errorMsg };
    }

    if (!Array.isArray(data)) return { matches: [] };
    const matchesList = data.map((m: any) => ({
      ...m,
      leagueName: m.leagueName || m.league?.name || 'الدوري الإسباني'
    }));
    return { matches: matchesList };
  } catch (error: any) {
    console.warn('getMatches warning:', error?.message || error);
    return { matches: [], error: error?.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى لاحقاً.' };
  }
};

export const getLeagues = async (): Promise<League[]> => {
  try {
    const res = await fetch(`${API_URL}/api/leagues`);
    if (!res.ok) {
      console.warn('API /api/leagues returned status:', res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('getLeagues warning:', error);
    return [];
  }
};

export const getStandings = async (leagueId: string, season: string = '2026'): Promise<Standing[]> => {
  try {
    const res = await fetch(`${API_URL}/api/standings/${leagueId || 'PD'}?season=${season}`);
    if (!res.ok) {
      console.warn('API /api/standings returned status:', res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('getStandings warning:', error);
    return [];
  }
};
export const getTeams = async (): Promise<Team[]> => { return []; };
export const getTeamById = async (id: string): Promise<Team | null> => { return null; };
export const getPlayers = async (teamId?: string): Promise<Player[]> => { return []; };
export const getPlayerById = async (id: string): Promise<Player | null> => { return null; };

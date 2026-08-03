export type { Match, Standing, Team, Player, League } from './api_types.ts';
import type { Match, Standing, Team, Player, League } from './api_types.ts';

const API_URL = import.meta.env.VITE_API_URL || '';

export const getMatches = async (date?: string, status?: string, leagueId?: string): Promise<Match[]> => {
  let url = `${API_URL}/api/matches?`;
  if (date) url += `date=${date}&`;
  if (status) url += `status=${status}&`;
  if (leagueId) url += `leagueId=${leagueId}&`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch matches');
  const data = await res.json();
  return data.map((m: any) => ({
    ...m,
    leagueName: m.league?.name || 'Unknown League'
  }));
};

export const getLeagues = async (): Promise<League[]> => {
  return [
    { id: 'ext_l1', name: 'الدوري الإسباني', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/LaLiga_Santander.svg/120px-LaLiga_Santander.svg.png' },
    { id: 'ext_l2', name: 'الدوري الإنجليزي', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/120px-Premier_League_Logo.svg.png' }
  ];
};

export const getStandings = async (leagueId: string): Promise<Standing[]> => { return []; };
export const getTeams = async (): Promise<Team[]> => { return []; };
export const getTeamById = async (id: string): Promise<Team | null> => { return null; };
export const getPlayers = async (teamId?: string): Promise<Player[]> => { return []; };
export const getPlayerById = async (id: string): Promise<Player | null> => { return null; };

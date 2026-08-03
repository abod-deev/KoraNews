export interface Team {
  id: string;
  name: string;
  logo: string;
  description?: string;
  founded?: number;
  stadium?: string;
  coach?: string;
}

export interface Player {
  id: string;
  name: string;
  image: string;
  position: string;
  nationality: string;
  number: number;
  teamId: string;
  stats?: {
    goals: number;
    assists: number;
    matches: number;
    rating: number;
  };
}

export interface League {
  id: string;
  name: string;
  logo: string;
}

export interface Match {
  id: string;
  leagueId: string;
  leagueName: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  matchTime: string; // ISO date string or '65\'' for live, 'FT' for finished
  matchDate: string; // ISO date
  league?: League;
}

export interface Standing {
  id: string;
  team: Team;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

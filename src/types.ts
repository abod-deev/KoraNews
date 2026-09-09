export interface PredictionMatchInfo {
  id: number;
  matchId: string | null;
  isExternal: boolean;
  pointsPerMatch: number;
  isActive: boolean;
  isCalculated: boolean;
  calculatedAt: string | null;
  isConfirmedByAdmin: boolean;
  confirmedAt: string | null;
  createdAt: string;
  match: {
    id: string;
    leagueId: string;
    leagueName: string;
    leagueLogo?: string;
    homeTeam: {
      id: string;
      name: string;
      logo: string;
    };
    awayTeam: {
      id: string;
      name: string;
      logo: string;
    };
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    matchTime: string;
    matchDate: string;
  };
  isOpenForPrediction: boolean;
  matchState: 'open' | 'upcoming' | 'live' | 'pending_admin' | 'calculated';
  participantsCount: number;
  correctPredictorsCount?: number;
  correctPredictors?: Array<{ id: number; name: string; avatar: string | null; isGolden?: boolean }>;
  goldenPredictor?: { id: number; name: string; avatar: string | null } | null;
  userPrediction?: {
    id: number;
    homeScore: number;
    awayScore: number;
    pointsEarned: number;
    isEvaluated: boolean;
    isGolden: boolean;
    goldenPoints: number;
    createdAt: string;
    updatedAt: string;
    editExpiresAt: string;
    canEdit: boolean;
    remainingEditSeconds: number;
  } | null;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  createdAt?: string;
}

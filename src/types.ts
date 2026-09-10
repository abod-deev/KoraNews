export type UserRole = 'user' | 'admin' | 'manager' | 'owner' | 'superadmin' | 'system_manager' | 'system_owner';

export type PermissionKey =
  // News
  | 'news_view'
  | 'news_add'
  | 'news_edit'
  | 'news_delete'
  | 'news_publish'
  | 'news_unpublish'
  | 'news_feature'
  | 'news_featured'
  | 'news_breaking'
  // Categories
  | 'categories_view'
  | 'categories_add'
  | 'categories_edit'
  | 'categories_delete'
  | 'categories_manage'
  // Matches
  | 'matches_view'
  | 'matches_manage'
  | 'matches_edit'
  | 'matches_sync'
  // Predictions
  | 'predictions_view'
  | 'predictions_manage'
  | 'predictions_match_add'
  | 'predictions_match_edit'
  | 'predictions_match_delete'
  | 'predictions_participants_manage'
  | 'predictions_results_manage'
  | 'predictions_points_manage'
  | 'predictions_contest_create'
  | 'predictions_contest_end'
  | 'predictions_contest_delete'
  | 'contests_manage'
  // Users
  | 'users_view'
  | 'users_manage'
  | 'users_activate'
  | 'users_deactivate'
  // Admins
  | 'admins_view'
  | 'admins_add'
  | 'admins_edit'
  | 'admins_remove'
  | 'admins_permissions_manage'
  | 'admins_manage'
  | 'managers_manage'
  // System
  | 'system_settings'
  | 'settings_manage'
  | 'activity_logs_view'
  | 'logs_view'
  | 'error_logs_view'
  | 'errors_view';

export interface ErrorLogRecord {
  id: number;
  source: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  message: string;
  stack?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  userId?: number | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  resolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  resolvedByName?: string | null;
  createdAt: string;
}

export interface AppUser {
  id: number | string;
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  avatar?: string | null;
  role: UserRole;
  isAdmin: boolean;
  permissions?: string[];
  isActive?: boolean;
  createdAt?: string;
}

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

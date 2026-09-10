import { checkUserHasPermission, PERMISSIONS } from '../constants/permissions.ts';

export interface ContestInfo {
  id?: number;
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'none' | string;
  [key: string]: any;
}

export interface UserInfo {
  id?: number;
  role?: string;
  isAdmin?: boolean;
  permissions?: string[];
  [key: string]: any;
}

export interface ParticipationInfo {
  status: 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked';
  notes?: string;
  [key: string]: any;
}

export interface ContestPermissions {
  currentContest: ContestInfo | null;
  contestStatus: 'active' | 'completed' | 'none';
  isAdmin: boolean;
  isParticipant: boolean;
  participationStatus: 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked';
  canParticipate: boolean;
  canPredict: boolean;
  canEditPrediction: boolean;
  canDeletePrediction: boolean;
  canManageContest: boolean;
  canAddPredictionMatch: boolean;
  canEndContest: boolean;
  canDeleteContest: boolean;
}

export function getContestPermissions(
  currentContest: ContestInfo | null,
  user: UserInfo | null,
  participationInfo?: ParticipationInfo | null
): ContestPermissions {
  const rawStatus = currentContest?.status ? String(currentContest.status).toLowerCase() : 'none';
  
  const contestStatus: 'active' | 'completed' | 'none' =
    rawStatus === 'active' ? 'active' : rawStatus === 'completed' ? 'completed' : 'none';

  const isUserAdmin = checkUserHasPermission(user, PERMISSIONS.PREDICTIONS_VIEW);
  const canManageContest = checkUserHasPermission(user, PERMISSIONS.PREDICTIONS_MANAGE);
  const canAddPredictionMatch = checkUserHasPermission(user, PERMISSIONS.PREDICTIONS_MATCH_ADD) && contestStatus === 'active';
  const canEndContest = checkUserHasPermission(user, PERMISSIONS.PREDICTIONS_CONTEST_END) && contestStatus === 'active';
  const canDeleteContest = checkUserHasPermission(user, PERMISSIONS.PREDICTIONS_CONTEST_DELETE) && (contestStatus === 'completed' || currentContest?.status === 'completed');

  const participationStatus: 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked' =
    participationInfo?.status || 'not_registered';

  // Admins, System Managers, and System Owners are automatically considered participants for testing/usage
  const isParticipant = isUserAdmin || participationStatus === 'approved';

  // Rules:
  // 1. canParticipate: Only if ACTIVE contest and not registered yet
  const canParticipate = contestStatus === 'active' && participationStatus === 'not_registered';

  // 2. canPredict: Only if ACTIVE contest and approved participant
  const canPredict = contestStatus === 'active' && isParticipant;

  // 3. canEditPrediction: Base prediction capability
  const canEditPrediction = canPredict;

  // 4. canDeletePrediction: Regular users cannot delete predictions; only admins with predictions_manage
  const canDeletePrediction = canManageContest;

  return {
    currentContest,
    contestStatus,
    isAdmin: isUserAdmin,
    isParticipant,
    participationStatus,
    canParticipate,
    canPredict,
    canEditPrediction,
    canDeletePrediction,
    canManageContest,
    canAddPredictionMatch,
    canEndContest,
    canDeleteContest,
  };
}

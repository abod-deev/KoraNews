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

  const isAdmin = !!(
    user &&
    (user.role === 'admin' ||
      user.role === 'superadmin' ||
      user.isAdmin === true ||
      (Array.isArray(user.permissions) && user.permissions.includes('matches_manage')))
  );

  const participationStatus: 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked' =
    participationInfo?.status || 'not_registered';

  const isParticipant = participationStatus === 'approved';

  // Rules:
  // 1. canParticipate: Only if ACTIVE contest and not registered yet
  const canParticipate = contestStatus === 'active' && participationStatus === 'not_registered';

  // 2. canPredict: Only if ACTIVE contest and approved participant
  const canPredict = contestStatus === 'active' && isParticipant;

  // 3. canEditPrediction: Base prediction capability
  const canEditPrediction = canPredict;

  // 4. canDeletePrediction: Regular users cannot delete predictions; only admins
  const canDeletePrediction = isAdmin;

  // 5. canManageContest: Admin only
  const canManageContest = isAdmin;

  // 6. canAddPredictionMatch: Admin only + ACTIVE contest
  const canAddPredictionMatch = isAdmin && contestStatus === 'active';

  // 7. canEndContest: Admin only + ACTIVE contest
  const canEndContest = isAdmin && contestStatus === 'active';

  // 8. canDeleteContest: Admin only + COMPLETED contest
  const canDeleteContest = isAdmin && (contestStatus === 'completed' || currentContest?.status === 'completed');

  return {
    currentContest,
    contestStatus,
    isAdmin,
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

import { db, withDbRetry } from '../db/index.ts';
import {
  predictionMatches,
  predictions,
  predictionPoints,
  contestSettings,
  contestParticipants,
  matches,
  teams,
  leagues,
  users,
} from '../db/schema.ts';
import { eq, and, sql, desc, asc, count, sum, inArray, or } from 'drizzle-orm';

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

// ==========================================
// CONTEST SETTINGS HELPERS
// ==========================================

export async function getContestSettings() {
  return await withDbRetry(async () => {
    const list = await db.select().from(contestSettings).limit(1);
    if (list.length > 0) {
      return list[0];
    }
    const inserted = await db
      .insert(contestSettings)
      .values({
        name: 'مسابقة توقعات KoraNews',
        description: 'توقع نتائج المباريات وتصدر الترتيب العام واكسب النقاط والجوائز!',
        status: 'active',
      })
      .returning();
    return inserted[0];
  });
}

export async function updateContestSettings(data: {
  name?: string;
  description?: string;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  predictionsStartDate?: string | null;
  contestEndDate?: string | null;
  status?: string;
}) {
  return await withDbRetry(async () => {
    const existing = await getContestSettings();
    const updated = await db
      .update(contestSettings)
      .set({
        name: data.name !== undefined ? data.name : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        registrationStartDate: data.registrationStartDate ? new Date(data.registrationStartDate) : (data.registrationStartDate === null ? null : existing.registrationStartDate),
        registrationEndDate: data.registrationEndDate ? new Date(data.registrationEndDate) : (data.registrationEndDate === null ? null : existing.registrationEndDate),
        predictionsStartDate: data.predictionsStartDate ? new Date(data.predictionsStartDate) : (data.predictionsStartDate === null ? null : existing.predictionsStartDate),
        contestEndDate: data.contestEndDate ? new Date(data.contestEndDate) : (data.contestEndDate === null ? null : existing.contestEndDate),
        status: data.status !== undefined ? data.status : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(contestSettings.id, existing.id))
      .returning();
    return updated[0];
  });
}

// ==========================================
// PARTICIPATION & PRE-REGISTRATION FLOW
// ==========================================

export type ParticipantStatus = 'not_registered' | 'pending' | 'approved' | 'rejected' | 'blocked';

export async function getUserParticipationStatus(userId: number): Promise<{
  status: ParticipantStatus;
  appliedAt?: string;
  reviewedAt?: string;
  notes?: string;
}> {
  return await withDbRetry(async () => {
    const rec = await db.query.contestParticipants.findFirst({
      where: eq(contestParticipants.userId, userId),
    });
    if (!rec) {
      return { status: 'not_registered' };
    }
    return {
      status: rec.status as ParticipantStatus,
      appliedAt: rec.appliedAt.toISOString(),
      reviewedAt: rec.reviewedAt ? rec.reviewedAt.toISOString() : undefined,
      notes: rec.notes || undefined,
    };
  });
}

export async function requestContestParticipation(userId: number, notes?: string) {
  return await withDbRetry(async () => {
    // 1. Check contest status
    const settings = await getContestSettings();
    if (settings.status === 'registration_closed') {
      throw new Error('التسجيل في المسابقة مغلق حالياً');
    }
    if (settings.status === 'paused' || settings.status === 'completed') {
      throw new Error('المسابقة غير متاحة لاستقبال طلبات جديدة');
    }

    // 2. Check existing record
    const existing = await db.query.contestParticipants.findFirst({
      where: eq(contestParticipants.userId, userId),
    });

    if (existing) {
      if (existing.status === 'blocked') {
        throw new Error('تم حظر حسابك من المشاركة في المسابقة');
      }
      if (existing.status === 'approved') {
        return { success: true, status: 'approved', message: 'أنت مسجل ومقبول بالفعل في المسابقة!' };
      }
      if (existing.status === 'pending') {
        return { success: true, status: 'pending', message: 'طلبك قيد المراجعة بالفعل من قبل الإدارة' };
      }
      if (existing.status === 'rejected') {
        await db
          .update(contestParticipants)
          .set({
            status: 'pending',
            notes: notes || null,
            appliedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contestParticipants.id, existing.id));
        return { success: true, status: 'pending', message: 'تم إعادة إرسال طلب الاشتراك بنجاح وهو قيد المراجعة' };
      }
    }

    // 3. Create new pending request
    await db.insert(contestParticipants).values({
      userId,
      status: 'pending',
      notes: notes || null,
      appliedAt: new Date(),
    });

    return { success: true, status: 'pending', message: 'تم إرسال طلب المشاركة بنجاح، بانتظار موافقة الإدارة' };
  });
}

export async function getAdminContestParticipants(filterStatus?: string, search?: string) {
  return await withDbRetry(async () => {
    const list = await db.query.contestParticipants.findMany({
      with: {
        user: true,
        reviewer: true,
      },
      orderBy: [desc(contestParticipants.appliedAt)],
    });

    let results = list.map((p) => ({
      id: p.id,
      userId: p.userId,
      status: p.status,
      appliedAt: p.appliedAt.toISOString(),
      reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
      notes: p.notes,
      user: {
        id: p.user.id,
        name: p.user.name || 'مستخدم',
        email: p.user.email,
        avatar: p.user.avatar,
        role: p.user.role,
        isActive: p.user.isActive,
        createdAt: p.user.createdAt ? p.user.createdAt.toISOString() : null,
      },
      reviewer: p.reviewer
        ? {
            id: p.reviewer.id,
            name: p.reviewer.name || 'أدمن',
          }
        : null,
    }));

    if (filterStatus && filterStatus !== 'all') {
      results = results.filter((r) => r.status === filterStatus);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.user.name.toLowerCase().includes(q) ||
          r.user.email.toLowerCase().includes(q)
      );
    }

    return results;
  });
}

export async function updateParticipantStatus(
  participantId: number,
  status: 'approved' | 'rejected' | 'blocked' | 'pending',
  adminUserId: number,
  notes?: string
) {
  return await withDbRetry(async () => {
    const updated = await db
      .update(contestParticipants)
      .set({
        status,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(contestParticipants.id, participantId))
      .returning();

    if (updated.length === 0) {
      throw new Error('طلب المشاركة غير موجود');
    }

    return { success: true, participant: updated[0] };
  });
}

export async function removeParticipant(participantId: number) {
  return await withDbRetry(async () => {
    await db.delete(contestParticipants).where(eq(contestParticipants.id, participantId));
    return { success: true };
  });
}

// ==========================================
// MATCH STATE DETERMINATION
// ==========================================

/**
 * Computes exact match state for the prediction system:
 * - 'open': Scheduled & Kickoff in the future (> 1 minute away) & isActive
 * - 'upcoming': Starting soon / locked (< 1 min to kickoff or inactive)
 * - 'live': Currently in play
 * - 'pending_admin': Match finished, awaiting admin confirmation
 * - 'calculated': Admin confirmed result and evaluated points
 */
export function determineMatchPredictionState(
  isActive: boolean,
  matchStatus: string,
  matchDate: Date | string | null,
  isConfirmedByAdmin: boolean,
  isCalculated: boolean
): 'open' | 'upcoming' | 'live' | 'pending_admin' | 'calculated' {
  if (isCalculated && isConfirmedByAdmin) {
    return 'calculated';
  }

  if (matchStatus === 'FINISHED') {
    return isConfirmedByAdmin ? 'calculated' : 'pending_admin';
  }

  if (matchStatus === 'LIVE' || matchStatus === 'IN_PLAY' || matchStatus === 'PAUSED') {
    return 'live';
  }

  if (!isActive) {
    return 'upcoming';
  }

  if (!matchDate) return 'upcoming';
  const kickoffTime = new Date(matchDate).getTime();
  if (isNaN(kickoffTime)) return 'upcoming';
  const now = Date.now();

  if (now >= kickoffTime) {
    return 'live';
  }

  // Pre-match lock window: Closed 1 minute before kickoff
  if (now >= kickoffTime - 60 * 1000) {
    return 'upcoming';
  }

  return 'open';
}

export function isMatchOpenForPrediction(
  predictionMatchIsActive: boolean,
  matchStatus: string,
  matchDate: Date | string | null
): boolean {
  if (!predictionMatchIsActive) return false;
  if (matchStatus === 'FINISHED' || matchStatus === 'LIVE' || matchStatus === 'IN_PLAY' || matchStatus === 'PAUSED') {
    return false;
  }
  if (!matchDate) return false;

  const kickoffTime = new Date(matchDate).getTime();
  if (isNaN(kickoffTime)) return false;

  // Closes strictly 1 minute (60,000ms) before match start time
  const lockTime = kickoffTime - 60 * 1000;
  return Date.now() < lockTime;
}

// ==========================================
// PREDICTION MATCHES RETRIEVAL
// ==========================================

export async function getPredictionMatches(userId: number | null): Promise<PredictionMatchInfo[]> {
  return await withDbRetry(async () => {
    // 1. Fetch prediction matches joined with match details
    const rows = await db.query.predictionMatches.findMany({
      where: eq(predictionMatches.isActive, true),
      with: {
        match: {
          with: {
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictions: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(predictionMatches.createdAt)],
    });

    // 2. Fetch user's predictions if logged in
    let userPredMap = new Map<number, any>();
    if (userId) {
      const userPreds = await db
        .select()
        .from(predictions)
        .where(eq(predictions.userId, userId));
      for (const p of userPreds) {
        userPredMap.set(p.predictionMatchId, p);
      }
    }

    const results: PredictionMatchInfo[] = [];

    for (const row of rows) {
      let mId = row.matchId || `ext_${row.id}`;
      let leagueName = row.customLeagueName || row.match?.league?.name || 'بطولة عامة';
      let leagueLogo = row.customLeagueLogo || row.match?.league?.logo;
      let homeTeamId = row.match?.homeTeam?.id || `ext_h_${row.id}`;
      let homeTeamName = row.customHomeName || row.match?.homeTeam?.name || 'الفريق الأول';
      let homeTeamLogo = row.customHomeLogo || row.match?.homeTeam?.logo || '';
      let awayTeamId = row.match?.awayTeam?.id || `ext_a_${row.id}`;
      let awayTeamName = row.customAwayName || row.match?.awayTeam?.name || 'الفريق الثاني';
      let awayTeamLogo = row.customAwayLogo || row.match?.awayTeam?.logo || '';
      let homeScore = row.customHomeScore ?? row.match?.homeScore ?? null;
      let awayScore = row.customAwayScore ?? row.match?.awayScore ?? null;
      let matchStatus = row.customStatus || row.match?.status || 'SCHEDULED';
      let matchDateVal = row.customMatchDate || row.match?.matchDate || row.createdAt;
      let matchDateStr = new Date(matchDateVal).toISOString();
      let matchTime = row.match?.matchTime || '';

      const isOpen = isMatchOpenForPrediction(row.isActive, matchStatus, matchDateVal);
      const matchState = determineMatchPredictionState(
        row.isActive,
        matchStatus,
        matchDateVal,
        row.isConfirmedByAdmin,
        row.isCalculated
      );

      const userPred = userPredMap.get(row.id) || null;

      // Extract correct predictors & golden predictor if calculated & confirmed
      const correctPredictors: Array<{ id: number; name: string; avatar: string | null; isGolden?: boolean }> = [];
      let goldenPredictor: { id: number; name: string; avatar: string | null } | null = null;

      if (row.isConfirmedByAdmin && row.isCalculated && row.predictions) {
        for (const p of row.predictions) {
          if (p.isEvaluated && p.pointsEarned > 0 && p.user) {
            correctPredictors.push({
              id: p.user.id,
              name: p.user.name || 'مشارك',
              avatar: p.user.avatar || null,
              isGolden: p.isGolden,
            });
            if (p.isGolden) {
              goldenPredictor = {
                id: p.user.id,
                name: p.user.name || 'مشارك',
                avatar: p.user.avatar || null,
              };
            }
          }
        }
      }

      let userPredictionFormatted: PredictionMatchInfo['userPrediction'] = null;
      if (userPred) {
        const createdAtTime = new Date(userPred.createdAt).getTime();
        const editExpiresAt = new Date(createdAtTime + 60 * 1000).toISOString();
        const elapsed = Date.now() - createdAtTime;
        const canEdit = elapsed <= 60 * 1000 && isOpen;
        const remainingEditSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

        userPredictionFormatted = {
          id: userPred.id,
          homeScore: userPred.homeScore,
          awayScore: userPred.awayScore,
          pointsEarned: userPred.pointsEarned,
          isEvaluated: userPred.isEvaluated,
          isGolden: userPred.isGolden || false,
          goldenPoints: userPred.goldenPoints || 0,
          createdAt: userPred.createdAt.toISOString(),
          updatedAt: userPred.updatedAt.toISOString(),
          editExpiresAt,
          canEdit,
          remainingEditSeconds,
        };
      }

      results.push({
        id: row.id,
        matchId: row.matchId,
        isExternal: row.isExternal,
        pointsPerMatch: row.pointsPerMatch || 2,
        isActive: row.isActive,
        isCalculated: row.isCalculated,
        calculatedAt: row.calculatedAt ? row.calculatedAt.toISOString() : null,
        isConfirmedByAdmin: row.isConfirmedByAdmin,
        confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        match: {
          id: mId,
          leagueId: row.match?.leagueId || 'ext',
          leagueName,
          leagueLogo,
          homeTeam: {
            id: homeTeamId,
            name: homeTeamName,
            logo: homeTeamLogo,
          },
          awayTeam: {
            id: awayTeamId,
            name: awayTeamName,
            logo: awayTeamLogo,
          },
          homeScore,
          awayScore,
          status: matchStatus,
          matchTime,
          matchDate: matchDateStr,
        },
        isOpenForPrediction: isOpen,
        matchState,
        participantsCount: row.predictions ? row.predictions.length : 0,
        correctPredictorsCount: correctPredictors.length,
        correctPredictors,
        goldenPredictor,
        userPrediction: userPredictionFormatted,
      });
    }

    // Sort order:
    // 1. Open matches (ordered by matchDate ASC)
    // 2. Upcoming matches (starting soon / locked)
    // 3. Live matches
    // 4. Pending confirmation matches
    // 5. Calculated/Finished matches (ordered by matchDate DESC)
    results.sort((a, b) => {
      const orderMap: Record<string, number> = {
        open: 1,
        upcoming: 2,
        live: 3,
        pending_admin: 4,
        calculated: 5,
      };
      const rankA = orderMap[a.matchState] || 99;
      const rankB = orderMap[b.matchState] || 99;
      if (rankA !== rankB) return rankA - rankB;

      const dateA = new Date(a.match.matchDate).getTime();
      const dateB = new Date(b.match.matchDate).getTime();
      return rankA <= 3 ? dateA - dateB : dateB - dateA;
    });

    return results;
  });
}

// ==========================================
// USER PREDICTIONS & HISTORY
// ==========================================

export async function getUserPredictionsHistory(userId: number) {
  return await withDbRetry(async () => {
    const userPreds = await db.query.predictions.findMany({
      where: eq(predictions.userId, userId),
      with: {
        predictionMatch: {
          with: {
            match: {
              with: {
                league: true,
                homeTeam: true,
                awayTeam: true,
              },
            },
          },
        },
      },
      orderBy: [desc(predictions.createdAt)],
    });

    return userPreds.map((p) => {
      const pm = p.predictionMatch;
      const m = pm?.match;

      let leagueName = pm?.customLeagueName || m?.league?.name || 'بطولة عامة';
      let leagueLogo = pm?.customLeagueLogo || m?.league?.logo;
      let homeTeamName = pm?.customHomeName || m?.homeTeam?.name || 'الفريق الأول';
      let homeTeamLogo = pm?.customHomeLogo || m?.homeTeam?.logo || '';
      let awayTeamName = pm?.customAwayName || m?.awayTeam?.name || 'الفريق الثاني';
      let awayTeamLogo = pm?.customAwayLogo || m?.awayTeam?.logo || '';
      let homeScore = pm?.customHomeScore ?? m?.homeScore ?? null;
      let awayScore = pm?.customAwayScore ?? m?.awayScore ?? null;
      let matchStatus = pm?.customStatus || m?.status || 'SCHEDULED';
      let matchDateVal = pm?.customMatchDate || m?.matchDate || p.createdAt;
      let matchTime = m?.matchTime || '';

      const isOpen = pm ? isMatchOpenForPrediction(pm.isActive, matchStatus, matchDateVal) : false;
      const matchState = pm
        ? determineMatchPredictionState(
            pm.isActive,
            matchStatus,
            matchDateVal,
            pm.isConfirmedByAdmin,
            pm.isCalculated
          )
        : 'calculated';

      let displayStatus: 'upcoming' | 'predicted' | 'live' | 'pending_confirmation' | 'finished_correct' | 'finished_wrong' = 'predicted';

      if (matchState === 'calculated') {
        displayStatus = p.pointsEarned > 0 ? 'finished_correct' : 'finished_wrong';
      } else if (matchState === 'pending_admin') {
        displayStatus = 'pending_confirmation';
      } else if (matchState === 'live') {
        displayStatus = 'live';
      } else if (isOpen) {
        displayStatus = 'predicted';
      } else {
        displayStatus = 'upcoming';
      }

      const createdAtTime = new Date(p.createdAt).getTime();
      const elapsed = Date.now() - createdAtTime;
      const canEdit = elapsed <= 60 * 1000 && isOpen;
      const remainingEditSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

      return {
        id: p.id,
        predictionMatchId: p.predictionMatchId,
        pointsPerMatch: pm?.pointsPerMatch || 2,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        pointsEarned: p.pointsEarned,
        isEvaluated: p.isEvaluated,
        isGolden: p.isGolden || false,
        goldenPoints: p.goldenPoints || 0,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        editExpiresAt: new Date(createdAtTime + 60 * 1000).toISOString(),
        canEdit,
        remainingEditSeconds,
        displayStatus,
        matchState,
        match: {
          id: m?.id || `ext_${pm?.id}`,
          leagueName,
          leagueLogo,
          homeTeam: {
            name: homeTeamName,
            logo: homeTeamLogo,
          },
          awayTeam: {
            name: awayTeamName,
            logo: awayTeamLogo,
          },
          homeScore,
          awayScore,
          status: matchStatus,
          matchTime,
          matchDate: new Date(matchDateVal).toISOString(),
          isOpenForPrediction: isOpen,
        },
      };
    });
  });
}

export async function getUserPredictionStats(userId: number) {
  return await withDbRetry(async () => {
    // 1. Total points from points ledger
    const pointsResult = await db
      .select({ total: sum(predictionPoints.points) })
      .from(predictionPoints)
      .where(eq(predictionPoints.userId, userId));
    const totalPoints = Number(pointsResult[0]?.total || 0);

    // 2. All user predictions count & breakdown
    const userPreds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, userId));

    const totalPredictions = userPreds.length;
    const correctPredictions = userPreds.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
    const wrongPredictions = userPreds.filter((p) => p.isEvaluated && p.pointsEarned === 0).length;
    const pendingPredictions = userPreds.filter((p) => !p.isEvaluated).length;
    const goldenPredictions = userPreds.filter((p) => p.isGolden).length;
    const goldenPoints = userPreds.reduce((acc, p) => acc + (p.goldenPoints || 0), 0);

    const evaluatedCount = correctPredictions + wrongPredictions;
    const successRate = evaluatedCount > 0 ? Math.round((correctPredictions / evaluatedCount) * 100) : 0;

    // 3. User's Rank in General Leaderboard
    const allUsersPoints = await db
      .select({
        userId: predictionPoints.userId,
        points: sum(predictionPoints.points),
      })
      .from(predictionPoints)
      .groupBy(predictionPoints.userId);

    const scoresMap = new Map<number, number>();
    for (const r of allUsersPoints) {
      scoresMap.set(r.userId, Number(r.points || 0));
    }

    const allUserIds = Array.from(new Set([...scoresMap.keys(), userId]));
    allUserIds.sort((a, b) => {
      const pA = scoresMap.get(a) || 0;
      const pB = scoresMap.get(b) || 0;
      if (pB !== pA) return pB - pA;
      return a - b;
    });

    const userRank = allUserIds.indexOf(userId) + 1 || 1;

    // 4. User's Rank in Golden Leaderboard
    const goldenBoard = await getGoldenLeaderboard(userId);
    const goldenRank = goldenBoard.currentUserRank?.rank || null;

    return {
      totalPoints,
      totalPredictions,
      correctPredictions,
      wrongPredictions,
      pendingPredictions,
      goldenPredictions,
      goldenPoints,
      successRate,
      userRank,
      goldenRank,
    };
  });
}

// ==========================================
// SAVE USER PREDICTION (STRICT VALIDATION)
// ==========================================

export async function saveUserPrediction(
  userId: number,
  predictionMatchId: number,
  homeScore: number,
  awayScore: number
) {
  // 1. Validate score inputs
  if (
    typeof homeScore !== 'number' ||
    typeof awayScore !== 'number' ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 30 ||
    awayScore > 30
  ) {
    throw new Error('يرجى إدخال أرقام صحيحة للأهداف بين 0 و 30');
  }

  return await withDbRetry(async () => {
    // 2. STRICT PARTICIPANT CHECK: Must be approved in the contest
    const participant = await db.query.contestParticipants.findFirst({
      where: eq(contestParticipants.userId, userId),
    });

    if (!participant || participant.status !== 'approved') {
      if (!participant) {
        throw new Error('يجب التسجيل أولاً في مسابقة التوقعات والحصول على موافقة الإدارة للمشاركة');
      }
      if (participant.status === 'pending') {
        throw new Error('طلب اشتراكك في المسابقة ما زال قيد المراجعة من قبل الإدارة');
      }
      if (participant.status === 'rejected') {
        throw new Error('تم رفض طلب اشتراكك في المسابقة');
      }
      if (participant.status === 'blocked') {
        throw new Error('تم حظر حسابك من المشاركة في المسابقة');
      }
    }

    // 3. Check contest settings status
    const settings = await getContestSettings();
    if (settings.status === 'paused' || settings.status === 'completed') {
      throw new Error('المسابقة متوقفة حالياً ولا يمكن استقبال توقعات جديدة');
    }

    // 4. Fetch the prediction match
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, predictionMatchId),
      with: {
        match: true,
      },
    });

    if (!pm) {
      throw new Error('المباراة المحددة غير موجودة في نظام التوقعات');
    }

    if (!pm.isActive) {
      throw new Error('التوقع لهذه المباراة غير متاح حالياً');
    }

    const matchStatus = pm.customStatus || pm.match?.status || 'SCHEDULED';
    const matchDateVal = pm.customMatchDate || pm.match?.matchDate || pm.createdAt;

    // 5. Strict Backend Pre-Match Lock Check (1 minute before kickoff)
    const kickoffTime = new Date(matchDateVal).getTime();
    if (!isNaN(kickoffTime) && Date.now() >= kickoffTime - 60 * 1000) {
      throw new Error('تم إغلاق التوقعات لهذه المباراة قبل دقيقة واحدة من موعد انطلاقها');
    }

    const isOpen = isMatchOpenForPrediction(pm.isActive, matchStatus, matchDateVal);
    if (!isOpen) {
      throw new Error('انتهى وقت التوقع لهذه المباراة، لقد بدأت بالفعل أو انتهت');
    }

    // 6. Check for existing prediction
    const existing = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.userId, userId),
          eq(predictions.predictionMatchId, predictionMatchId)
        )
      );

    if (existing.length > 0) {
      const pred = existing[0];
      const createdAtTime = new Date(pred.createdAt).getTime();
      const elapsed = Date.now() - createdAtTime;

      // 1-minute edit window validation
      if (elapsed > 60 * 1000) {
        throw new Error('انتهت المهلة المسموح بها لتعديل التوقع (دقيقة واحدة من وقت التسجيل)');
      }

      await db
        .update(predictions)
        .set({
          homeScore,
          awayScore,
          updatedAt: new Date(),
        })
        .where(eq(predictions.id, pred.id));

      const remainingSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

      return {
        success: true,
        action: 'updated',
        message: 'تم تحديث توقعك بنجاح',
        remainingEditSeconds: remainingSeconds,
        prediction: {
          id: pred.id,
          homeScore,
          awayScore,
        },
      };
    } else {
      const inserted = await db
        .insert(predictions)
        .values({
          userId,
          predictionMatchId,
          homeScore,
          awayScore,
          pointsEarned: 0,
          isEvaluated: false,
          isGolden: false,
          goldenPoints: 0,
        })
        .returning();

      return {
        success: true,
        action: 'created',
        message: 'تم حفظ توقعك بنجاح. متاح لك التعديل لمدة دقيقة واحدة فقط.',
        remainingEditSeconds: 60,
        prediction: {
          id: inserted[0].id,
          homeScore,
          awayScore,
        },
      };
    }
  });
}

// ==========================================
// LEADERBOARDS (MAIN & GOLDEN)
// ==========================================

export async function getLeaderboard(currentUserId?: number, limit = 100) {
  return await withDbRetry(async () => {
    // 1. Get all approved participants
    const approvedParticipants = await db.query.contestParticipants.findMany({
      where: eq(contestParticipants.status, 'approved'),
    });
    const approvedUserIds = new Set(approvedParticipants.map((p) => p.userId));

    // Fetch all active users with predictions & points
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        predictions: true,
        predictionPoints: true,
      },
    });

    // 2. Compute stats for each approved user
    const leaderboardData = allUsers
      .filter((u) => approvedUserIds.has(u.id) || (currentUserId && u.id === currentUserId))
      .map((u) => {
        const totalPoints = (u.predictionPoints || []).reduce((acc, curr) => acc + (curr.points || 0), 0);
        const totalPredictions = (u.predictions || []).length;
        const correctPredictions = (u.predictions || []).filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
        const goldenPredictions = (u.predictions || []).filter((p) => p.isGolden).length;
        const goldenPoints = (u.predictions || []).reduce((acc, p) => acc + (p.goldenPoints || 0), 0);
        const evaluatedCount = (u.predictions || []).filter((p) => p.isEvaluated).length;
        const successRate = evaluatedCount > 0 ? Math.round((correctPredictions / evaluatedCount) * 100) : 0;

        let earliestPointTime = Number.MAX_SAFE_INTEGER;
        if (u.predictionPoints && u.predictionPoints.length > 0) {
          for (const pt of u.predictionPoints) {
            const t = new Date(pt.createdAt).getTime();
            if (t < earliestPointTime) earliestPointTime = t;
          }
        }

        return {
          id: u.id,
          name: u.name || 'مشارك',
          avatar: u.avatar || null,
          role: u.role,
          totalPoints,
          correctPredictions,
          goldenPredictions,
          goldenPoints,
          totalPredictions,
          successRate,
          earliestPointTime,
          isCurrentUser: currentUserId ? u.id === currentUserId : false,
        };
      })
      .filter((u) => u.totalPredictions > 0 || u.totalPoints > 0 || (currentUserId && u.id === currentUserId));

    // 3. Sorting (Requirement 11):
    // 1. Total Points DESC
    // 2. Correct Predictions DESC
    // 3. Golden Predictions DESC
    // 4. Success Rate DESC
    // 5. Total Predictions ASC
    // 6. Earliest Point Time ASC
    // 7. User ID ASC
    leaderboardData.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      if (b.totalPredictions !== a.totalPredictions) return b.totalPredictions - a.totalPredictions;
      if (a.earliestPointTime !== b.earliestPointTime) return a.earliestPointTime - b.earliestPointTime;
      return a.id - b.id;
    });

    // 4. Assign ranks
    const rankedList = leaderboardData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const currentUserEntry = currentUserId ? rankedList.find((r) => r.id === currentUserId) : null;

    return {
      leaderboard: rankedList.slice(0, limit),
      totalParticipants: rankedList.length,
      currentUserRank: currentUserEntry || null,
    };
  });
}

export async function getGoldenLeaderboard(currentUserId?: number, limit = 100) {
  return await withDbRetry(async () => {
    // 1. Get all approved participants
    const approvedParticipants = await db.query.contestParticipants.findMany({
      where: eq(contestParticipants.status, 'approved'),
    });
    const approvedUserIds = new Set(approvedParticipants.map((p) => p.userId));

    // Fetch all active users with predictions
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        predictions: true,
        predictionPoints: true,
      },
    });

    const goldenData = allUsers
      .filter((u) => approvedUserIds.has(u.id) || (currentUserId && u.id === currentUserId))
      .map((u) => {
        const totalPoints = (u.predictionPoints || []).reduce((acc, curr) => acc + (curr.points || 0), 0);
        const goldenPredictions = (u.predictions || []).filter((p) => p.isGolden).length;
        const goldenPoints = (u.predictions || []).reduce((acc, p) => acc + (p.goldenPoints || 0), 0);
        const correctPredictions = (u.predictions || []).filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
        const totalPredictions = (u.predictions || []).length;

        return {
          id: u.id,
          name: u.name || 'مشارك',
          avatar: u.avatar || null,
          role: u.role,
          goldenPredictions,
          goldenPoints,
          totalPoints,
          correctPredictions,
          totalPredictions,
          isCurrentUser: currentUserId ? u.id === currentUserId : false,
        };
      })
      .filter((u) => u.goldenPredictions > 0 || (currentUserId && u.id === currentUserId));

    // Sort by Golden Predictions DESC, then Golden Points DESC, then Total Points DESC
    goldenData.sort((a, b) => {
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
      if (b.goldenPoints !== a.goldenPoints) return b.goldenPoints - a.goldenPoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
      return a.id - b.id;
    });

    const rankedList = goldenData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const currentUserEntry = currentUserId ? rankedList.find((r) => r.id === currentUserId) : null;

    return {
      leaderboard: rankedList.slice(0, limit),
      totalParticipants: rankedList.length,
      currentUserRank: currentUserEntry || null,
    };
  });
}

// ==========================================
// ADMIN CONFIRMATION & POINTS EVALUATION
// ==========================================

/**
 * Evaluates predictions for a specific prediction match with admin confirmation.
 * Strictly Idempotent: Can be run multiple times safely without duplicate points.
 * Requirement 6-8: If only 1 participant correctly predicts the score, award +3 Golden Points!
 */
export async function confirmAndEvaluatePredictionMatch(
  predictionMatchId: number,
  adminUserId: number,
  finalHomeScore?: number | null,
  finalAwayScore?: number | null
) {
  return await withDbRetry(async () => {
    // 1. Fetch prediction match with match info & predictions
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, predictionMatchId),
      with: {
        match: {
          with: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictions: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!pm) {
      throw new Error('مباراة التوقع غير موجودة');
    }

    // Determine actual final score
    let homeScore = finalHomeScore !== undefined && finalHomeScore !== null
      ? finalHomeScore
      : (pm.customHomeScore !== null && pm.customHomeScore !== undefined ? pm.customHomeScore : pm.match?.homeScore);
    let awayScore = finalAwayScore !== undefined && finalAwayScore !== null
      ? finalAwayScore
      : (pm.customAwayScore !== null && pm.customAwayScore !== undefined ? pm.customAwayScore : pm.match?.awayScore);

    if (homeScore === null || awayScore === null || isNaN(homeScore) || isNaN(awayScore)) {
      throw new Error('يرجى تحديد النتيجة النهائية للمباراة لتأكيدها واحتساب النقاط');
    }

    const homeTeamName = pm.customHomeName || pm.match?.homeTeam?.name || 'الفريق الأول';
    const awayTeamName = pm.customAwayName || pm.match?.awayTeam?.name || 'الفريق الثاني';
    const basePoints = pm.pointsPerMatch !== undefined && pm.pointsPerMatch !== null ? pm.pointsPerMatch : 2;

    // Filter correct predictions
    const correctPredictions = pm.predictions.filter(
      (pred) => pred.homeScore === homeScore && pred.awayScore === awayScore
    );
    const correctCount = correctPredictions.length;
    // Golden prediction rule: ONLY eligible if match value is EXACTLY 2 points AND exactly 1 participant predicted correctly!
    const isGoldenEligible = basePoints === 2 && correctCount === 1;

    // Clear existing ledger entries for this prediction match to guarantee strict idempotency
    await db
      .delete(predictionPoints)
      .where(eq(predictionPoints.predictionMatchId, pm.id));

    let evaluatedCount = 0;
    let pointsAwarded = 0;
    let goldenAwarded = 0;
    const correctPredictors: Array<{ id: number; name: string; avatar: string | null; isGolden: boolean }> = [];

    // 2. Iterate and evaluate each user prediction
    for (const pred of pm.predictions) {
      const isCorrect = pred.homeScore === homeScore && pred.awayScore === awayScore;
      const isGolden = isCorrect && isGoldenEligible;
      const goldenBonus = isGolden ? 1 : 0; // Exactly +1 Golden bonus point
      const totalEarned = isCorrect ? basePoints + goldenBonus : 0;

      // Update prediction row
      await db
        .update(predictions)
        .set({
          pointsEarned: totalEarned,
          isEvaluated: true,
          isGolden,
          goldenPoints: goldenBonus,
          updatedAt: new Date(),
        })
        .where(eq(predictions.id, pred.id));

      if (isCorrect) {
        if (pred.user) {
          correctPredictors.push({
            id: pred.user.id,
            name: pred.user.name || 'مشارك',
            avatar: pred.user.avatar || null,
            isGolden,
          });
        }

        const reasonText = isGolden
          ? `توقع ذهبي منفرد: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName} (+2 نقطة أساسية + 1 نقطة ذهبية = 3 نقاط)`
          : `توقع دقيق: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName} (+${basePoints} نقطة)`;

        // Insert fresh clean ledger record
        await db
          .insert(predictionPoints)
          .values({
            userId: pred.userId,
            predictionId: pred.id,
            predictionMatchId: pm.id,
            points: totalEarned,
            isGoldenBonus: isGolden,
            reason: reasonText,
          })
          .catch((err) => {
            console.warn('[predictionService] Ledger insert notice:', err?.message || err);
          });

        pointsAwarded += totalEarned;
        if (isGolden) goldenAwarded++;
      }

      evaluatedCount++;
    }

    // 3. Mark prediction match as confirmed & calculated
    await db
      .update(predictionMatches)
      .set({
        customHomeScore: homeScore,
        customAwayScore: awayScore,
        customStatus: 'FINISHED',
        isConfirmedByAdmin: true,
        confirmedAt: new Date(),
        confirmedBy: adminUserId,
        isCalculated: true,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(predictionMatches.id, pm.id));

    // Also update matches table status if relational match exists
    if (pm.matchId) {
      await db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          status: 'FINISHED',
          updatedAt: new Date(),
        })
        .where(eq(matches.id, pm.matchId))
        .catch(() => null);
    }

    return {
      success: true,
      evaluatedCount,
      pointsAwarded,
      goldenAwarded,
      basePoints,
      correctPredictorsCount: correctPredictors.length,
      correctPredictors,
      isGoldenPrediction: isGoldenEligible,
      finalScore: {
        home: homeScore,
        away: awayScore,
      },
    };
  });
}

// ==========================================
// ADMIN MATCHES SELECTION & MANAGEMENT
// ==========================================

export async function getAdminAvailableMatchesForSelection(dateFilter: 'today' | 'tomorrow' | 'all' = 'today') {
  return await withDbRetry(async () => {
    // Determine dates for today and tomorrow
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    let startDate = todayStart;
    let endDate = todayEnd;

    if (dateFilter === 'tomorrow') {
      startDate = tomorrowStart;
      endDate = tomorrowEnd;
    } else if (dateFilter === 'all') {
      startDate = todayStart;
      endDate = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // 1. Fetch system matches for the target range
    const systemMatches = await db.query.matches.findMany({
      where: and(
        sql`${matches.matchDate} >= ${startDate}`,
        sql`${matches.matchDate} <= ${endDate}`
      ),
      with: {
        league: true,
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [asc(matches.matchDate)],
    });

    // 2. Fetch existing prediction matchIds
    const existingPredMatches = await db.query.predictionMatches.findMany({
      columns: {
        id: true,
        matchId: true,
        pointsPerMatch: true,
        isActive: true,
        isConfirmedByAdmin: true,
      },
    });

    const addedMap = new Map<string, { id: number; pointsPerMatch: number; isActive: boolean; isConfirmed: boolean }>();
    for (const pm of existingPredMatches) {
      if (pm.matchId) {
        addedMap.set(pm.matchId, {
          id: pm.id,
          pointsPerMatch: pm.pointsPerMatch || 2,
          isActive: pm.isActive,
          isConfirmed: pm.isConfirmedByAdmin,
        });
      }
    }

    return systemMatches.map((m) => {
      const predInfo = addedMap.get(m.id);
      return {
        id: m.id,
        leagueId: m.leagueId,
        leagueName: m.league?.name || 'دوري عام',
        leagueLogo: m.league?.logo,
        homeTeam: {
          id: m.homeTeam?.id || m.homeTeamId,
          name: m.homeTeam?.name || 'الفريق الأول',
          logo: m.homeTeam?.logo || '',
        },
        awayTeam: {
          id: m.awayTeam?.id || m.awayTeamId,
          name: m.awayTeam?.name || 'الفريق الثاني',
          logo: m.awayTeam?.logo || '',
        },
        matchTime: m.matchTime || '',
        matchDate: m.matchDate.toISOString(),
        status: m.status,
        isAddedToPredictions: !!predInfo,
        predictionMatchId: predInfo?.id || null,
        pointsPerMatch: predInfo?.pointsPerMatch || 2,
        predictionIsActive: predInfo?.isActive ?? false,
        predictionIsConfirmed: predInfo?.isConfirmed ?? false,
      };
    });
  });
}

export async function getAdminPredictionMatches() {
  return await withDbRetry(async () => {
    const list = await db.query.predictionMatches.findMany({
      with: {
        match: {
          with: {
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictions: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(predictionMatches.createdAt)],
    });

    return list.map((pm) => {
      const m = pm.match;
      let leagueName = pm.customLeagueName || m?.league?.name || 'بطولة عامة';
      let leagueLogo = pm.customLeagueLogo || m?.league?.logo;
      let homeTeamName = pm.customHomeName || m?.homeTeam?.name || 'الفريق الأول';
      let homeTeamLogo = pm.customHomeLogo || m?.homeTeam?.logo || '';
      let awayTeamName = pm.customAwayName || m?.awayTeam?.name || 'الفريق الثاني';
      let awayTeamLogo = pm.customAwayLogo || m?.awayTeam?.logo || '';
      let homeScore = pm.customHomeScore ?? m?.homeScore ?? null;
      let awayScore = pm.customAwayScore ?? m?.awayScore ?? null;
      let matchStatus = pm.customStatus || m?.status || 'SCHEDULED';
      let matchDateVal = pm.customMatchDate || m?.matchDate || pm.createdAt;

      const isOpen = isMatchOpenForPrediction(pm.isActive, matchStatus, matchDateVal);
      const matchState = determineMatchPredictionState(
        pm.isActive,
        matchStatus,
        matchDateVal,
        pm.isConfirmedByAdmin,
        pm.isCalculated
      );

      const correctPredictors = (pm.predictions || [])
        .filter((p) => p.isEvaluated && p.pointsEarned > 0 && p.user)
        .map((p) => ({
          id: p.user!.id,
          name: p.user!.name || 'مشارك',
          avatar: p.user!.avatar,
          isGolden: p.isGolden,
        }));

      const goldenPredictor = (pm.predictions || []).find((p) => p.isGolden && p.user);

      return {
        id: pm.id,
        matchId: pm.matchId,
        isExternal: pm.isExternal,
        pointsPerMatch: pm.pointsPerMatch || 2,
        isActive: pm.isActive,
        isCalculated: pm.isCalculated,
        calculatedAt: pm.calculatedAt ? pm.calculatedAt.toISOString() : null,
        isConfirmedByAdmin: pm.isConfirmedByAdmin,
        confirmedAt: pm.confirmedAt ? pm.confirmedAt.toISOString() : null,
        createdAt: pm.createdAt.toISOString(),
        isOpenForPrediction: isOpen,
        matchState,
        participantsCount: pm.predictions.length,
        correctPredictorsCount: correctPredictors.length,
        correctPredictors,
        goldenPredictor: goldenPredictor
          ? {
              id: goldenPredictor.user!.id,
              name: goldenPredictor.user!.name || 'مشارك',
              avatar: goldenPredictor.user!.avatar,
            }
          : null,
        predictions: pm.predictions.map((p) => ({
          id: p.id,
          userId: p.userId,
          userName: p.user?.name || 'مشارك',
          userEmail: p.user?.email || '',
          userAvatar: p.user?.avatar || null,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          pointsEarned: p.pointsEarned,
          isEvaluated: p.isEvaluated,
          isGolden: p.isGolden || false,
          goldenPoints: p.goldenPoints || 0,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        match: {
          id: m?.id || `ext_${pm.id}`,
          leagueName,
          leagueLogo,
          homeTeam: {
            id: m?.homeTeam?.id || 'home',
            name: homeTeamName,
            logo: homeTeamLogo,
          },
          awayTeam: {
            id: m?.awayTeam?.id || 'away',
            name: awayTeamName,
            logo: awayTeamLogo,
          },
          homeScore,
          awayScore,
          status: matchStatus,
          matchTime: m?.matchTime || '',
          matchDate: new Date(matchDateVal).toISOString(),
        },
      };
    });
  });
}

/**
 * Admin: Add an existing system match to the prediction contest with custom points.
 */
export async function addMatchToPredictions(matchId: string, pointsPerMatch: number = 2) {
  return await withDbRetry(async () => {
    const existingMatch = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!existingMatch) {
      throw new Error('المباراة المحددة غير موجودة في قاعدة بيانات المباريات');
    }

    const points = typeof pointsPerMatch === 'number' && pointsPerMatch >= 1 ? pointsPerMatch : 2;

    const existing = await db
      .select()
      .from(predictionMatches)
      .where(eq(predictionMatches.matchId, matchId));

    if (existing.length > 0) {
      if (!existing[0].isActive) {
        await db
          .update(predictionMatches)
          .set({ isActive: true, pointsPerMatch: points, updatedAt: new Date() })
          .where(eq(predictionMatches.id, existing[0].id));
        return { message: 'تم إعادة تفعيل المباراة في مسابقة التوقعات', id: existing[0].id };
      }
      throw new Error('هذه المباراة مضافة بالفعل إلى قائمة التوقعات');
    }

    const inserted = await db
      .insert(predictionMatches)
      .values({
        matchId,
        pointsPerMatch: points,
        isActive: true,
        isExternal: false,
      })
      .returning();

    return { message: 'تمت إضافة المباراة إلى مسابقة التوقعات بنجاح', id: inserted[0].id };
  });
}

/**
 * Admin: Add a match from an external league with custom points.
 */
export async function addCustomExternalMatchToPredictions(data: {
  leagueName: string;
  leagueLogo?: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  matchDate: string;
  externalMatchId?: string;
  pointsPerMatch?: number;
}) {
  return await withDbRetry(async () => {
    if (!data.leagueName || !data.homeTeamName || !data.awayTeamName || !data.matchDate) {
      throw new Error('يرجى ملء جميع البيانات الأساسية للمباراة (الدوري، الفريقين، والتاريخ)');
    }

    const parsedDate = new Date(data.matchDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('تاريخ المباراة غير صالح');
    }

    const points = typeof data.pointsPerMatch === 'number' && data.pointsPerMatch >= 1 ? data.pointsPerMatch : 2;

    const inserted = await db
      .insert(predictionMatches)
      .values({
        isExternal: true,
        externalMatchId: data.externalMatchId || null,
        customLeagueName: data.leagueName.trim(),
        customLeagueLogo: data.leagueLogo ? data.leagueLogo.trim() : null,
        customHomeName: data.homeTeamName.trim(),
        customHomeLogo: data.homeTeamLogo ? data.homeTeamLogo.trim() : null,
        customAwayName: data.awayTeamName.trim(),
        customAwayLogo: data.awayTeamLogo ? data.awayTeamLogo.trim() : null,
        customMatchDate: parsedDate,
        customStatus: 'SCHEDULED',
        pointsPerMatch: points,
        isActive: true,
      })
      .returning();

    return {
      message: 'تمت إضافة مباراة الدوري الخارجي إلى مسابقة التوقعات بنجاح',
      id: inserted[0].id,
      predictionMatch: inserted[0],
    };
  });
}

export async function updatePredictionMatchPoints(id: number, pointsPerMatch: number) {
  return await withDbRetry(async () => {
    if (!pointsPerMatch || pointsPerMatch < 1 || pointsPerMatch > 20) {
      throw new Error('النقاط المحددة للمباراة يجب أن تكون بين 1 و 20');
    }
    await db
      .update(predictionMatches)
      .set({ pointsPerMatch, updatedAt: new Date() })
      .where(eq(predictionMatches.id, id));
    return { success: true, pointsPerMatch };
  });
}

export async function togglePredictionMatchActive(id: number, isActive: boolean) {
  return await withDbRetry(async () => {
    await db
      .update(predictionMatches)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(predictionMatches.id, id));
    return { success: true };
  });
}

export async function removePredictionMatch(id: number) {
  return await withDbRetry(async () => {
    await db.delete(predictionMatches).where(eq(predictionMatches.id, id));
    return { success: true };
  });
}

export async function getAdminPredictionStats() {
  return await withDbRetry(async () => {
    const allMatches = await db.select().from(predictionMatches);
    const allPreds = await db.select().from(predictions);
    const allPoints = await db.select().from(predictionPoints);

    const totalMatches = allMatches.length;
    const evaluatedMatches = allMatches.filter((m) => m.isConfirmedByAdmin && m.isCalculated).length;
    const activeMatches = allMatches.filter((m) => m.isActive).length;
    const totalPredictions = allPreds.length;
    const correctPredictions = allPreds.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
    const evaluatedPredictions = allPreds.filter((p) => p.isEvaluated).length;
    const goldenPredictionsCount = allPreds.filter((p) => p.isGolden).length;
    const totalPointsDistributed = allPoints.reduce((acc, curr) => acc + (curr.points || 0), 0);
    const goldenPointsDistributed = allPreds.reduce((acc, curr) => acc + (curr.goldenPoints || 0), 0);
    const successRate = evaluatedPredictions > 0 ? Math.round((correctPredictions / evaluatedPredictions) * 100) : 0;

    return {
      totalMatches,
      evaluatedMatches,
      activeMatches,
      totalPredictions,
      correctPredictions,
      goldenPredictionsCount,
      totalPointsDistributed,
      goldenPointsDistributed,
      successRate,
    };
  });
}

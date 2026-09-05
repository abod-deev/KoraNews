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
import { eq, and, sql, desc, asc, count, sum, inArray, or, ne } from 'drizzle-orm';
import { seedSaudiAndNationalTeams } from './seedSaudiAndNationalTeams.ts';

export function normalizeArabicText(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ');
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

// ==========================================
// CONTEST SETTINGS & LIFECYCLE HELPERS
// ==========================================

export type ContestSettingsRecord = typeof contestSettings.$inferSelect;

/**
 * Fetches contest settings.
 * - If contestId is specified, returns that contest.
 * - If contestId is omitted:
 *   1. Returns the currently active contest (status = 'active').
 *   2. If no 'active' contest exists, returns the most recent ongoing contest (e.g. 'registration_open', 'paused').
 *   3. If all contests are completed, returns the most recent completed contest for viewing history.
 * - If no contests exist at all in the database, returns null without auto-creating anything.
 */
export async function getContestSettings(contestId?: number): Promise<ContestSettingsRecord | null> {
  return await withDbRetry(async () => {
    if (contestId !== undefined && !isNaN(contestId)) {
      const found = await db.query.contestSettings.findFirst({
        where: eq(contestSettings.id, contestId),
      });
      return found || null;
    }

    // Return the currently active contest (status = 'active')
    const activeContest = await db.query.contestSettings.findFirst({
      where: eq(contestSettings.status, 'active'),
      orderBy: [desc(contestSettings.createdAt)],
    });

    return activeContest || null;
  });
}

/**
 * Returns the currently active contest, or null if none is active.
 */
export async function getActiveContest(): Promise<ContestSettingsRecord | null> {
  return await withDbRetry(async () => {
    const activeContest = await db.query.contestSettings.findFirst({
      where: eq(contestSettings.status, 'active'),
    });
    return activeContest || null;
  });
}

/**
 * Returns a specific contest by its primary ID.
 */
export async function getContestById(id: number): Promise<ContestSettingsRecord | null> {
  if (id === undefined || id === null || isNaN(id)) return null;
  return await getContestSettings(id);
}

/**
 * Returns all contests historically created in the system.
 */
export async function getAllContests(): Promise<ContestSettingsRecord[]> {
  return await withDbRetry(async () => {
    return await db
      .select()
      .from(contestSettings)
      .orderBy(desc(contestSettings.createdAt));
  });
}

/**
 * Admin: Create a new contest.
 * Enforces rule: Only one contest can be 'active' at a time.
 * If an active contest already exists, creation is rejected.
 */
export async function createContest(data: { name: string; description?: string }): Promise<ContestSettingsRecord> {
  return await withDbRetry(async () => {
    const cleanName = data.name?.trim();
    if (!cleanName) {
      throw new Error('اسم المسابقة مطلوب');
    }

    // Constraint: Verify no other contest is currently active
    const activeContest = await db.query.contestSettings.findFirst({
      where: eq(contestSettings.status, 'active'),
    });

    if (activeContest) {
      throw new Error('لا يمكن إنشاء مسابقة جديدة أثناء وجود مسابقة نشطة حالياً. يرجى إنهاء المسابقة الحالية أولاً');
    }

    const inserted = await db
      .insert(contestSettings)
      .values({
        name: cleanName,
        description: data.description?.trim() || 'توقع نتائج المباريات وتصدر الترتيب العام واكسب النقاط والجوائز!',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return inserted[0];
  });
}

/**
 * Admin: Complete/end an active contest.
 */
export async function completeContest(contestId: number): Promise<ContestSettingsRecord> {
  return await withDbRetry(async () => {
    const existing = await getContestById(contestId);
    if (!existing) {
      throw new Error('المسابقة المحددة غير موجودة');
    }

    if (existing.status !== 'active') {
      throw new Error('لا يمكن إنهاء مسابقة غير نشطة أو منتهية بالفعل');
    }

    const updated = await db
      .update(contestSettings)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(contestSettings.id, contestId))
      .returning();

    return updated[0];
  });
}

/**
 * Admin: Delete a completed contest and all associated prediction data.
 * Rejects if contest is active.
 * Cascades deletions atomically inside a single database transaction.
 * Retains original records in matches, users, leagues, teams, and news tables.
 */
export async function deleteContest(contestId: number): Promise<{ success: boolean; message: string }> {
  return await withDbRetry(async () => {
    const existing = await getContestById(contestId);
    if (!existing) {
      throw new Error('المسابقة المحددة غير موجودة');
    }

    if (existing.status !== 'completed') {
      throw new Error('يمكن حذف المسابقات المنتهية (COMPLETED) فقط. لا يمكن حذف مسابقة نشطة.');
    }

    // Perform atomic cascading delete of prediction contest data inside a transaction
    // Order of deletion:
    // 1. predictionPoints
    // 2. predictions
    // 3. predictionMatches
    // 4. contestParticipants
    // 5. contestSettings
    // NOTE: System entities (matches, users, teams, leagues, news) are preserved untouched.
    await db.transaction(async (tx) => {
      // 1. Fetch prediction matches IDs in this contest
      const predMatches = await tx
        .select({ id: predictionMatches.id })
        .from(predictionMatches)
        .where(eq(predictionMatches.contestId, contestId));
      const predMatchIds = predMatches.map((m) => m.id);

      // 2. Delete prediction points linked to contestId (or matching prediction match IDs)
      if (predMatchIds.length > 0) {
        await tx.delete(predictionPoints).where(
          or(
            eq(predictionPoints.contestId, contestId),
            inArray(predictionPoints.predictionMatchId, predMatchIds)
          )
        );
      } else {
        await tx.delete(predictionPoints).where(eq(predictionPoints.contestId, contestId));
      }

      // 3. Delete predictions linked to contestId (or matching prediction match IDs)
      if (predMatchIds.length > 0) {
        await tx.delete(predictions).where(
          or(
            eq(predictions.contestId, contestId),
            inArray(predictions.predictionMatchId, predMatchIds)
          )
        );
      } else {
        await tx.delete(predictions).where(eq(predictions.contestId, contestId));
      }

      // 4. Delete prediction matches
      await tx.delete(predictionMatches).where(eq(predictionMatches.contestId, contestId));

      // 5. Delete contest participants
      await tx.delete(contestParticipants).where(eq(contestParticipants.contestId, contestId));

      // 6. Delete contest settings row
      await tx.delete(contestSettings).where(eq(contestSettings.id, contestId));
    });

    return {
      success: true,
      message: 'تم حذف المسابقة وجميع بياناتها المرتبطة بها بنجاح',
    };
  });
}

/**
 * Admin: Update contest configuration.
 * Prevents having multiple 'active' contests simultaneously.
 */
export async function updateContestSettings(data: {
  id?: number;
  name?: string;
  description?: string;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  predictionsStartDate?: string | null;
  contestEndDate?: string | null;
  status?: string;
}): Promise<ContestSettingsRecord> {
  return await withDbRetry(async () => {
    let existing: ContestSettingsRecord | null = null;
    if (data.id !== undefined && !isNaN(data.id)) {
      existing = await getContestById(data.id);
    } else {
      existing = await getContestSettings();
    }

    if (!existing) {
      throw new Error('لا توجد مسابقة حالية لتحديثها');
    }

    // If changing status to active, verify no other contest is already active
    if (data.status === 'active' && existing.status !== 'active') {
      const otherActive = await db.query.contestSettings.findFirst({
        where: and(
          eq(contestSettings.status, 'active'),
          ne(contestSettings.id, existing.id)
        ),
      });
      if (otherActive) {
        throw new Error('لا يمكن تفعيل هذه المسابقة لوجود مسابقة أخرى نشطة بالفعل');
      }
    }

    const updated = await db
      .update(contestSettings)
      .set({
        name: data.name !== undefined ? data.name.trim() : existing.name,
        description: data.description !== undefined ? data.description.trim() : existing.description,
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

export async function getUserParticipationStatus(userId: number, contestId?: number): Promise<{
  status: ParticipantStatus;
  contestId?: number;
  appliedAt?: string;
  reviewedAt?: string;
  notes?: string;
}> {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) {
        return { status: 'not_registered' };
      }
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      }
    }

    if (!targetContestId) {
      return { status: 'not_registered' };
    }

    const rec = await db.query.contestParticipants.findFirst({
      where: and(
        eq(contestParticipants.userId, userId),
        eq(contestParticipants.contestId, targetContestId)
      ),
    });

    if (!rec) {
      return { status: 'not_registered', contestId: targetContestId };
    }

    return {
      status: rec.status as ParticipantStatus,
      contestId: rec.contestId ?? targetContestId,
      appliedAt: rec.appliedAt.toISOString(),
      reviewedAt: rec.reviewedAt ? rec.reviewedAt.toISOString() : undefined,
      notes: rec.notes || undefined,
    };
  });
}

export async function requestContestParticipation(userId: number, notes?: string, contestId?: number) {
  return await withDbRetry(async () => {
    // 1. Check contest status
    const contest = contestId ? await getContestById(contestId) : await getActiveContest();
    if (!contest) {
      throw new Error(contestId ? 'المسابقة المحددة غير موجودة' : 'لا توجد مسابقة نشطة حالياً للتسجيل فيها');
    }
    if (contest.status === 'completed') {
      throw new Error('انتهت المسابقة، لم يعد بإمكانك تنفيذ هذا الإجراء.');
    }
    if (contest.status !== 'active') {
      throw new Error('عذراً، المسابقة غير نشطة حالياً ولا يمكن استقبال طلبات جديدة');
    }

    // 2. Check existing record for THIS specific contest
    const existing = await db.query.contestParticipants.findFirst({
      where: and(
        eq(contestParticipants.userId, userId),
        eq(contestParticipants.contestId, contest.id)
      ),
    });

    if (existing) {
      if (existing.status === 'blocked') {
        throw new Error('تم حظر حسابك من المشاركة في هذه المسابقة');
      }
      if (existing.status === 'approved') {
        return { success: true, status: 'approved', message: 'أنت مسجل ومقبول بالفعل في هذه المسابقة!' };
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

    // 3. Create new pending request explicitly linked to contest.id
    await db.insert(contestParticipants).values({
      userId,
      contestId: contest.id,
      status: 'pending',
      notes: notes || null,
      appliedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, status: 'pending', message: 'تم إرسال طلب المشاركة بنجاح، بانتظار موافقة الإدارة' };
  });
}

export async function getAdminContestParticipants(filterStatus?: string, search?: string, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId === undefined) {
      const active = await getContestSettings();
      if (active) {
        targetContestId = active.id;
      }
    }

    const whereClauses = [];
    if (targetContestId !== undefined) {
      whereClauses.push(eq(contestParticipants.contestId, targetContestId));
    }

    const list = await db.query.contestParticipants.findMany({
      where: whereClauses.length > 0 ? and(...whereClauses) : undefined,
      with: {
        user: true,
        reviewer: true,
      },
      orderBy: [desc(contestParticipants.appliedAt)],
    });

    let results = list.map((p) => ({
      id: p.id,
      userId: p.userId,
      contestId: p.contestId,
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
  isCalculated: boolean,
  nowMs: number = Date.now()
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

  if (nowMs >= kickoffTime) {
    return 'live';
  }

  // Pre-match lock window: Closed 1 minute (60,000ms) before kickoff
  if (nowMs >= kickoffTime - 60 * 1000) {
    return 'upcoming';
  }

  return 'open';
}

export function isMatchOpenForPrediction(
  predictionMatchIsActive: boolean,
  matchStatus: string,
  matchDate: Date | string | null,
  nowMs: number = Date.now()
): boolean {
  if (!predictionMatchIsActive) return false;
  if (matchStatus === 'FINISHED' || matchStatus === 'LIVE' || matchStatus === 'IN_PLAY' || matchStatus === 'PAUSED') {
    return false;
  }
  if (!matchDate) return false;

  const kickoffTime = new Date(matchDate).getTime();
  if (isNaN(kickoffTime)) return false;

  // Closes strictly 1 minute (60,000ms) before match start time based on Server Time
  const lockTime = kickoffTime - 60 * 1000;
  return nowMs < lockTime;
}

// ==========================================
// PREDICTION MATCHES RETRIEVAL
// ==========================================

export async function getPredictionMatches(userId: number | null, contestId?: number): Promise<PredictionMatchInfo[]> {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) return [];
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      }
    }

    if (targetContestId === undefined) {
      return [];
    }

    // 1. Fetch prediction matches joined with match details filtered strictly by contestId
    const rows = await db.query.predictionMatches.findMany({
      where: and(
        eq(predictionMatches.isActive, true),
        eq(predictionMatches.contestId, targetContestId)
      ),
      with: {
        match: {
          with: {
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictions: {
          where: eq(predictions.contestId, targetContestId),
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(predictionMatches.createdAt)],
    });

    // 2. Fetch user's predictions if logged in
    const userPredMap = new Map<number, typeof predictions.$inferSelect>();
    if (userId) {
      const userPreds = await db
        .select()
        .from(predictions)
        .where(
          and(
            eq(predictions.userId, userId),
            eq(predictions.contestId, targetContestId)
          )
        );
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

export async function getUserPredictionsHistory(userId: number, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) return [];
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      }
    }

    if (targetContestId === undefined) {
      return [];
    }

    const whereConditions = [eq(predictions.userId, userId)];
    if (targetContestId !== undefined) {
      whereConditions.push(eq(predictions.contestId, targetContestId));
    }

    const userPreds = await db.query.predictions.findMany({
      where: and(...whereConditions),
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

export async function getUserPredictionStats(userId: number, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) {
        return {
          totalPoints: 0,
          totalPredictions: 0,
          correctPredictions: 0,
          wrongPredictions: 0,
          pendingPredictions: 0,
          goldenPredictions: 0,
          goldenPoints: 0,
          successRate: 0,
          userRank: null,
          goldenRank: null,
        };
      }
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      }
    }

    if (targetContestId === undefined) {
      return {
        totalPoints: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        wrongPredictions: 0,
        pendingPredictions: 0,
        goldenPredictions: 0,
        goldenPoints: 0,
        successRate: 0,
        userRank: null,
        goldenRank: null,
      };
    }

    // 1. Total points from points ledger for contest
    const pointsConditions = [eq(predictionPoints.userId, userId)];
    if (targetContestId !== undefined) {
      pointsConditions.push(eq(predictionPoints.contestId, targetContestId));
    }

    const pointsResult = await db
      .select({ total: sum(predictionPoints.points) })
      .from(predictionPoints)
      .where(and(...pointsConditions));
    const totalPoints = Number(pointsResult[0]?.total || 0);

    // 2. User predictions count & breakdown for contest
    const predsConditions = [eq(predictions.userId, userId)];
    if (targetContestId !== undefined) {
      predsConditions.push(eq(predictions.contestId, targetContestId));
    }

    const userPreds = await db
      .select()
      .from(predictions)
      .where(and(...predsConditions));

    const totalPredictions = userPreds.length;
    const correctPredictions = userPreds.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
    const wrongPredictions = userPreds.filter((p) => p.isEvaluated && p.pointsEarned === 0).length;
    const pendingPredictions = userPreds.filter((p) => !p.isEvaluated).length;
    const goldenPredictions = userPreds.filter((p) => p.isGolden).length;
    const goldenPoints = userPreds.reduce((acc, p) => acc + (p.goldenPoints || 0), 0);

    const evaluatedCount = correctPredictions + wrongPredictions;
    const successRate = evaluatedCount > 0 ? Math.round((correctPredictions / evaluatedCount) * 100) : 0;

    // 3. User's Rank in General Leaderboard
    const mainBoard = await getLeaderboard(userId, 1000, targetContestId);
    const userRank = mainBoard.currentUserRank?.rank || null;

    // 4. User's Rank in Golden Leaderboard
    const goldenBoard = await getGoldenLeaderboard(userId, 1000, targetContestId);
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
    // 2. Fetch the prediction match
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

    if (pm.isCalculated || pm.isConfirmedByAdmin) {
      throw new Error('تم اعتماد نتيجة هذه المباراة بالفعل ولا يمكن إرسال أو تعديل التوقعات لها');
    }

    // 3. Resolve contest associated with this prediction match
    let matchContestId = pm.contestId;
    let matchContest: any = null;
    if (matchContestId) {
      matchContest = await getContestById(matchContestId);
    } else {
      matchContest = await getActiveContest();
      matchContestId = matchContest?.id;
    }

    if (!matchContest) {
      throw new Error('لا توجد مسابقة مرتبطة بهذه المباراة');
    }

    if (matchContest.status === 'completed') {
      throw new Error('انتهت هذه المسابقة ولا يمكن إرسال توقع جديد.');
    }

    if (matchContest.status !== 'active') {
      throw new Error('المسابقة غير نشطة حالياً ولا يمكن استقبال توقعات جديدة');
    }

    // 4. STRICT PARTICIPANT CHECK: Must be approved specifically in THIS contest
    const participant = await db.query.contestParticipants.findFirst({
      where: and(
        eq(contestParticipants.userId, userId),
        eq(contestParticipants.contestId, matchContestId)
      ),
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
          contestId: matchContestId,
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

/**
 * User: Update an existing prediction by ID with strict ownership validation and 1-minute window constraint.
 */
export async function updateUserPredictionById(
  userId: number,
  predictionId: number,
  homeScore: number,
  awayScore: number
) {
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
    const pred = await db.query.predictions.findFirst({
      where: eq(predictions.id, predictionId),
      with: {
        predictionMatch: {
          with: {
            match: true,
          },
        },
      },
    });

    if (!pred) {
      throw new Error('التوقع غير موجود');
    }

    // STRICT OWNERSHIP CHECK
    if (pred.userId !== userId) {
      throw new Error('غير مصرح لك بتعديل توقع لمستخدم آخر');
    }

    if (pred.isEvaluated) {
      throw new Error('تم تقييم هذا التوقع بالفعل ولا يمكن تعديله');
    }

    const pm = pred.predictionMatch;
    if (!pm || !pm.isActive || pm.isCalculated || pm.isConfirmedByAdmin) {
      throw new Error('المباراة المحددة مغلقة أو تم اعتماد نتيجتها');
    }

    // Check contest status for this prediction / match
    const contestId = pred.contestId || pm.contestId;
    if (contestId) {
      const matchContest = await getContestById(contestId);
      if (!matchContest || matchContest.status === 'completed') {
        throw new Error('انتهت هذه المسابقة ولا يمكن إرسال توقع جديد.');
      }
      if (matchContest.status !== 'active') {
        throw new Error('المسابقة غير نشطة حالياً ولا يمكن استقبال توقعات جديدة');
      }
    }

    const matchStatus = pm.customStatus || pm.match?.status || 'SCHEDULED';
    const matchDateVal = pm.customMatchDate || pm.match?.matchDate || pm.createdAt;

    const kickoffTime = new Date(matchDateVal).getTime();
    if (!isNaN(kickoffTime) && Date.now() >= kickoffTime - 60 * 1000) {
      throw new Error('تم إغلاق التوقعات لهذه المباراة قبل دقيقة من موعد انطلاقها');
    }

    const isOpen = isMatchOpenForPrediction(pm.isActive, matchStatus, matchDateVal);
    if (!isOpen) {
      throw new Error('انتهى وقت التوقع لهذه المباراة');
    }

    const createdAtTime = new Date(pred.createdAt).getTime();
    const elapsed = Date.now() - createdAtTime;
    if (elapsed > 60 * 1000) {
      throw new Error('انتهت المهلة المسموح بها لتعديل التوقع (دقيقة واحدة من وقت التسجيل)');
    }

    const updated = await db
      .update(predictions)
      .set({
        homeScore,
        awayScore,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, pred.id))
      .returning();

    const remainingSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

    return {
      success: true,
      message: 'تم تحديث التوقع بنجاح',
      remainingEditSeconds: remainingSeconds,
      prediction: {
        id: updated[0].id,
        homeScore: updated[0].homeScore,
        awayScore: updated[0].awayScore,
      },
    };
  });
}

/**
 * User: Delete an existing prediction.
 * Notice: Regular users cannot delete predictions per contest rules.
 */
export async function deleteUserPredictionById(userId: number, predictionId: number) {
  throw new Error('المستخدم العادي لا يستطيع حذف التوقعات');
}

/**
 * Admin: Add or save a prediction for a participant on a match.
 * If the match was already evaluated/confirmed, immediately evaluates this prediction
 * and calculates points without double counting!
 */
export async function adminSaveUserPrediction(
  adminUserId: number,
  userId: number,
  predictionMatchId: number,
  homeScore: number,
  awayScore: number
) {
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

  const result = await withDbRetry(async () => {
    return await db.transaction(async (tx) => {
      // 1. Verify user exists
      const targetUser = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!targetUser) {
        throw new Error('المستخدم المحدد غير موجود');
      }

      // 2. Verify prediction match exists
      const pm = await tx.query.predictionMatches.findFirst({
        where: eq(predictionMatches.id, predictionMatchId),
      });
      if (!pm) {
        throw new Error('مباراة التوقع غير موجودة');
      }

      // 3. Check for existing prediction by this user on this match
      const existing = await tx.query.predictions.findFirst({
        where: and(
          eq(predictions.userId, userId),
          eq(predictions.predictionMatchId, predictionMatchId)
        ),
      });

      let predictionId: number;

      if (existing) {
        await tx
          .update(predictions)
          .set({
            homeScore,
            awayScore,
            updatedAt: new Date(),
          })
          .where(eq(predictions.id, existing.id));
        predictionId = existing.id;
      } else {
        const inserted = await tx
          .insert(predictions)
          .values({
            userId,
            predictionMatchId,
            contestId: pm.contestId,
            homeScore,
            awayScore,
            pointsEarned: 0,
            isEvaluated: false,
            isGolden: false,
            goldenPoints: 0,
          })
          .returning();
        predictionId = inserted[0].id;
      }

      return {
        success: true,
        predictionId,
        isCalculated: pm.isCalculated || pm.isConfirmedByAdmin,
        customHomeScore: pm.customHomeScore,
        customAwayScore: pm.customAwayScore,
        message: 'تم حفظ توقع المتسابق بنجاح',
      };
    });
  });

  // If the match was already evaluated by admin, re-evaluate this match so points are updated automatically!
  if (result.isCalculated) {
    await confirmAndEvaluatePredictionMatch(
      predictionMatchId,
      adminUserId,
      result.customHomeScore,
      result.customAwayScore
    ).catch(() => null);
  }

  return { success: true, message: result.message, predictionId: result.predictionId };
}

/**
 * Admin: Update a prediction's score directly from admin panel.
 * If the match was evaluated, triggers safe idempotent re-evaluation of points.
 */
export async function adminUpdateUserPrediction(
  adminUserId: number,
  predictionId: number,
  homeScore: number,
  awayScore: number
) {
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
    const pred = await db.query.predictions.findFirst({
      where: eq(predictions.id, predictionId),
      with: {
        predictionMatch: true,
      },
    });

    if (!pred) {
      throw new Error('التوقع غير موجود');
    }

    await db
      .update(predictions)
      .set({
        homeScore,
        awayScore,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, predictionId));

    // If match was already evaluated, recalculate safely to update points without duplication
    if (pred.predictionMatch && (pred.predictionMatch.isCalculated || pred.predictionMatch.isConfirmedByAdmin)) {
      await confirmAndEvaluatePredictionMatch(
        pred.predictionMatchId,
        adminUserId,
        pred.predictionMatch.customHomeScore,
        pred.predictionMatch.customAwayScore
      );
    }

    return {
      success: true,
      message: 'تم تعديل التوقع بنجاح وتحديث النقاط والترتيب',
    };
  });
}

/**
 * Admin: Delete any user prediction with complete points ledger cleanup and recalculation.
 */
export async function adminDeleteUserPrediction(
  adminUserId: number,
  predictionId: number
) {
  return await withDbRetry(async () => {
    const pred = await db.query.predictions.findFirst({
      where: eq(predictions.id, predictionId),
      with: {
        predictionMatch: true,
      },
    });

    if (!pred) {
      throw new Error('التوقع غير موجود');
    }

    const pmId = pred.predictionMatchId;
    const pm = pred.predictionMatch;

    await db.transaction(async (tx) => {
      // 1. Delete associated points ledger entry
      await tx.delete(predictionPoints).where(eq(predictionPoints.predictionId, predictionId));

      // 2. Delete prediction
      await tx.delete(predictions).where(eq(predictions.id, predictionId));
    });

    // 3. If match was evaluated, re-evaluate remaining predictions to update Golden rules and points
    if (pm && (pm.isCalculated || pm.isConfirmedByAdmin)) {
      await confirmAndEvaluatePredictionMatch(
        pmId,
        adminUserId,
        pm.customHomeScore,
        pm.customAwayScore
      );
    }

    return {
      success: true,
      message: 'تم حذف التوقع بنجاح وإلغاء أي نقاط كانت محتسبة له وتحديث الترتيب العام',
    };
  });
}

// ==========================================
// LEADERBOARDS (MAIN & GOLDEN)
// ==========================================

export async function getLeaderboard(currentUserId?: number, limit = 100, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) {
        return {
          leaderboard: [],
          totalParticipants: 0,
          currentUserRank: null,
        };
      }
    } else {
      const activeContest = await getActiveContest();
      if (activeContest) {
        targetContestId = activeContest.id;
      }
    }

    if (targetContestId === undefined) {
      return {
        leaderboard: [],
        totalParticipants: 0,
        currentUserRank: null,
      };
    }

    // 1. Get approved participants for this specific contest
    const approvedParticipants = await db.query.contestParticipants.findMany({
      where: and(
        eq(contestParticipants.status, 'approved'),
        eq(contestParticipants.contestId, targetContestId)
      ),
    });
    const approvedUserIds = new Set(approvedParticipants.map((p) => p.userId));

    // Fetch all active users with predictions & points
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        predictions: {
          where: eq(predictions.contestId, targetContestId),
        },
        predictionPoints: {
          where: eq(predictionPoints.contestId, targetContestId),
        },
      },
    });

    // 2. Compute stats for each approved user in this contest
    const leaderboardData = allUsers
      .filter((u) => approvedUserIds.has(u.id) || (currentUserId && u.id === currentUserId && approvedUserIds.has(u.id)))
      .map((u) => {
        const filteredPoints = u.predictionPoints || [];
        const filteredPreds = u.predictions || [];

        const totalPoints = filteredPoints.reduce((acc, curr) => acc + (curr.points || 0), 0);
        const totalPredictions = filteredPreds.length;
        const correctPredictions = filteredPreds.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
        const goldenPredictions = filteredPreds.filter((p) => p.isGolden).length;
        const goldenPoints = filteredPreds.reduce((acc, p) => acc + (p.goldenPoints || 0), 0);
        const evaluatedCount = filteredPreds.filter((p) => p.isEvaluated).length;
        const successRate = evaluatedCount > 0 ? Math.round((correctPredictions / evaluatedCount) * 100) : 0;

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
          isCurrentUser: currentUserId ? u.id === currentUserId : false,
        };
      })
      .filter((u) => u.totalPredictions > 0 || u.totalPoints > 0 || (currentUserId && u.id === currentUserId && approvedUserIds.has(u.id)));

    // 3. Strict Deterministic Sorting:
    // 1. Total Points DESC
    // 2. Correct Predictions DESC
    // 3. Golden Predictions DESC
    // 4. userId ASC
    leaderboardData.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
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

export async function getGoldenLeaderboard(currentUserId?: number, limit = 100, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) {
        return {
          leaderboard: [],
          totalParticipants: 0,
          currentUserRank: null,
        };
      }
    } else {
      const activeContest = await getActiveContest();
      if (activeContest) {
        targetContestId = activeContest.id;
      }
    }

    if (targetContestId === undefined) {
      return {
        leaderboard: [],
        totalParticipants: 0,
        currentUserRank: null,
      };
    }

    // 1. Get approved participants for this specific contest
    const approvedParticipants = await db.query.contestParticipants.findMany({
      where: and(
        eq(contestParticipants.status, 'approved'),
        eq(contestParticipants.contestId, targetContestId)
      ),
    });
    const approvedUserIds = new Set(approvedParticipants.map((p) => p.userId));

    // Fetch all active users with predictions for this contest
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        predictions: {
          where: eq(predictions.contestId, targetContestId),
        },
        predictionPoints: {
          where: eq(predictionPoints.contestId, targetContestId),
        },
      },
    });

    const goldenData = allUsers
      .filter((u) => approvedUserIds.has(u.id) || (currentUserId && u.id === currentUserId && approvedUserIds.has(u.id)))
      .map((u) => {
        const filteredPoints = u.predictionPoints || [];
        const filteredPreds = u.predictions || [];

        const totalPoints = filteredPoints.reduce((acc, curr) => acc + (curr.points || 0), 0);
        const goldenPredictions = filteredPreds.filter((p) => p.isGolden).length;
        const goldenPoints = filteredPreds.reduce((acc, p) => acc + (p.goldenPoints || 0), 0);
        const correctPredictions = filteredPreds.filter((p) => p.isEvaluated && p.pointsEarned > 0).length;
        const totalPredictions = filteredPreds.length;
        const evaluatedCount = filteredPreds.filter((p) => p.isEvaluated).length;
        const successRate = evaluatedCount > 0 ? Math.round((correctPredictions / evaluatedCount) * 100) : 0;

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
          successRate,
          isCurrentUser: currentUserId ? u.id === currentUserId : false,
        };
      })
      .filter((u) => u.goldenPredictions > 0 || (currentUserId && u.id === currentUserId && approvedUserIds.has(u.id)));

    // Sort by:
    // 1. Golden Predictions DESC (or Golden Points DESC: each golden prediction = +1 golden point)
    // 2. Total Points DESC
    // 3. Correct Predictions DESC
    // 4. userId ASC
    goldenData.sort((a, b) => {
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
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
 * Strictly Idempotent & Atomic: Runs in a single DB transaction.
 * Golden Prediction Rules:
 * - Eligible ONLY if pointsPerMatch === 2.
 * - If correctCount === 1: User gets 2 (base) + 1 (golden) = 3 points.
 * - If correctCount > 1: Each user gets 2 base points only (no golden).
 * - If pointsPerMatch > 2 (e.g. 3, 4, 5, 10): No golden awarded, all winners get base points.
 */
export async function confirmAndEvaluatePredictionMatch(
  predictionMatchId: number,
  adminUserId: number,
  finalHomeScore?: number | null,
  finalAwayScore?: number | null
) {
  // Validate input score types if provided
  if (finalHomeScore !== undefined && finalHomeScore !== null) {
    if (
      typeof finalHomeScore !== 'number' ||
      !Number.isInteger(finalHomeScore) ||
      finalHomeScore < 0 ||
      finalHomeScore > 30
    ) {
      throw new Error('نتيجة الفريق الأول يجب أن تكون رقماً صحيحاً بين 0 و 30');
    }
  }

  if (finalAwayScore !== undefined && finalAwayScore !== null) {
    if (
      typeof finalAwayScore !== 'number' ||
      !Number.isInteger(finalAwayScore) ||
      finalAwayScore < 0 ||
      finalAwayScore > 30
    ) {
      throw new Error('نتيجة الفريق الثاني يجب أن تكون رقماً صحيحاً بين 0 و 30');
    }
  }

  return await withDbRetry(async () => {
    return await db.transaction(async (tx) => {
      // 1. Fetch prediction match with match info & predictions inside transaction
      const pm = await tx.query.predictionMatches.findFirst({
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

      // STRICT GOLDEN PREDICTION RULE:
      // Golden prediction is ONLY allowed if basePoints is EXACTLY 2 AND exactly 1 participant predicted correctly!
      // If basePoints > 2 (e.g. 3, 4, 5, 10), Golden is NEVER eligible.
      const isGoldenEligible = basePoints === 2 && correctCount === 1;

      // Clear existing ledger entries for this prediction match to guarantee strict idempotency
      await tx
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

        // Update prediction row in transaction
        await tx
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

          // Insert fresh ledger record in transaction
          await tx
            .insert(predictionPoints)
            .values({
              userId: pred.userId,
              predictionId: pred.id,
              predictionMatchId: pm.id,
              contestId: pm.contestId,
              points: totalEarned,
              isGoldenBonus: isGolden,
              reason: reasonText,
            });

          pointsAwarded += totalEarned;
          if (isGolden) goldenAwarded++;
        }

        evaluatedCount++;
      }

      // 3. Mark prediction match as confirmed & calculated
      await tx
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
        await tx
          .update(matches)
          .set({
            homeScore,
            awayScore,
            status: 'FINISHED',
            updatedAt: new Date(),
          })
          .where(eq(matches.id, pm.matchId));
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
  });
}

// ==========================================
// ADMIN MATCHES SELECTION & MANAGEMENT
// ==========================================

export async function getAdminAvailableMatchesForSelection(
  dateFilter: 'today' | 'tomorrow' | 'all' = 'today',
  contestId?: number
) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) return [];
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      } else {
        return [];
      }
    }

    // Determine dates for today and tomorrow using UTC
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

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

    // 2. Fetch existing prediction matchIds for THIS contest
    const whereConditions = [];
    if (targetContestId !== undefined) {
      whereConditions.push(eq(predictionMatches.contestId, targetContestId));
    }

    const existingPredMatches = await db.query.predictionMatches.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
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

export async function getAdminPredictionMatches(contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) return [];
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      } else {
        return [];
      }
    }

    const whereConditions = [];
    if (targetContestId !== undefined) {
      whereConditions.push(eq(predictionMatches.contestId, targetContestId));
    }

    const list = await db.query.predictionMatches.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        match: {
          with: {
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictions: {
          where: targetContestId !== undefined ? eq(predictions.contestId, targetContestId) : undefined,
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
export async function addMatchToPredictions(matchId: string, pointsPerMatch: number = 2, contestId?: number) {
  return await withDbRetry(async () => {
    let targetContest = contestId ? await getContestById(contestId) : await getActiveContest();
    if (!targetContest) {
      throw new Error('لا توجد مسابقة نشطة حالياً لإضافة مباريات إليها');
    }
    if (targetContest.status === 'completed') {
      throw new Error('لا يمكن إضافة مباريات لمسابقة منتهية');
    }
    if (targetContest.status !== 'active') {
      throw new Error('لا يمكن إضافة مباريات لمسابقة غير نشطة');
    }

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
      .where(
        and(
          eq(predictionMatches.matchId, matchId),
          eq(predictionMatches.contestId, targetContest.id)
        )
      );

    if (existing.length > 0) {
      if (!existing[0].isActive) {
        await db
          .update(predictionMatches)
          .set({ isActive: true, pointsPerMatch: points, updatedAt: new Date() })
          .where(eq(predictionMatches.id, existing[0].id));
        return { message: 'تم إعادة تفعيل المباراة في مسابقة التوقعات', id: existing[0].id };
      }
      throw new Error('هذه المباراة مضافة بالفعل إلى قائمة التوقعات لهذه المسابقة');
    }

    const inserted = await db
      .insert(predictionMatches)
      .values({
        matchId,
        contestId: targetContest.id,
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
 * Ensures leagues and teams are reused if existing, or created cleanly without duplicates,
 * and links to the relational matches table.
 */
export async function getOrCreateLeague(name: string, logo?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('اسم الدوري أو البطولة مطلوب');
  const normClean = normalizeArabicText(cleanName);

  const allLeagues = await db.select().from(leagues);
  let found = allLeagues.find(
    (l) =>
      normalizeArabicText(l.name) === normClean ||
      l.name.trim().toLowerCase() === cleanName.toLowerCase() ||
      l.id.toLowerCase() === cleanName.toLowerCase()
  );

  // Special match for Saudi Pro League
  if (!found && (normClean.includes('روشن') || normClean.includes('saudi'))) {
    found = allLeagues.find((l) => l.id === 'SPL' || normalizeArabicText(l.name).includes('روشن'));
  }

  if (found) {
    if (logo && (!found.logo || found.logo.includes('placeholder') || found.logo.includes('ui-avatars'))) {
      await db.update(leagues).set({ logo: logo.trim() }).where(eq(leagues.id, found.id)).catch(() => null);
      found.logo = logo.trim();
    }
    return found;
  }

  const slug = cleanName
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 24);
  const newId = `ext_l_${slug || 'cust'}_${Date.now().toString(36)}`;
  const defaultLogo = logo?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0284c7&color=fff&size=128`;

  const inserted = await db
    .insert(leagues)
    .values({
      id: newId,
      name: cleanName,
      logo: defaultLogo,
    })
    .returning();

  return inserted[0];
}

export async function createAdminLeague(name: string, logo?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('اسم الدوري أو البطولة مطلوب');
  const normClean = normalizeArabicText(cleanName);

  const allLeagues = await db.select().from(leagues);
  const exists = allLeagues.some(
    (l) =>
      normalizeArabicText(l.name) === normClean ||
      l.name.trim().toLowerCase() === cleanName.toLowerCase() ||
      l.id.toLowerCase() === cleanName.toLowerCase() ||
      (normClean.includes('روشن') && l.id === 'SPL')
  );

  if (exists) {
    throw new Error(`الدوري أو البطولة "${cleanName}" مسجلة مسبقاً في النظام`);
  }

  return await getOrCreateLeague(cleanName, logo);
}

export async function getOrCreateTeam(name: string, logo?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('اسم الفريق مطلوب');
  const normClean = normalizeArabicText(cleanName);

  const allTeams = await db.select().from(teams);
  let found = allTeams.find(
    (t) =>
      normalizeArabicText(t.name) === normClean ||
      t.name.trim().toLowerCase() === cleanName.toLowerCase() ||
      t.id.toLowerCase() === cleanName.toLowerCase()
  );

  // Special match for national teams: e.g. "مصر" matching "منتخب مصر" or vice versa
  if (!found) {
    const withoutMontakhab = normClean.replace(/^منتخب\s+/, '');
    found = allTeams.find((t) => {
      const normT = normalizeArabicText(t.name);
      return (
        normT === withoutMontakhab ||
        normT === `منتخب ${withoutMontakhab}` ||
        normT.replace(/^منتخب\s+/, '') === withoutMontakhab
      );
    });
  }

  if (found) {
    if (logo && (!found.logo || found.logo.includes('placeholder') || found.logo.includes('ui-avatars'))) {
      await db.update(teams).set({ logo: logo.trim() }).where(eq(teams.id, found.id)).catch(() => null);
      found.logo = logo.trim();
    }
    return found;
  }

  const slug = cleanName
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 24);
  const newId = `ext_t_${slug || 'cust'}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const defaultLogo = logo?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=10b981&color=fff&size=128`;

  const inserted = await db
    .insert(teams)
    .values({
      id: newId,
      name: cleanName,
      logo: defaultLogo,
    })
    .returning();

  return inserted[0];
}

export async function createAdminTeam(name: string, logo?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('اسم الفريق أو المنتخب مطلوب');
  const normClean = normalizeArabicText(cleanName);

  const allTeams = await db.select().from(teams);
  const withoutMontakhab = normClean.replace(/^منتخب\s+/, '');
  const exists = allTeams.some((t) => {
    const normT = normalizeArabicText(t.name);
    return (
      normT === normClean ||
      t.name.trim().toLowerCase() === cleanName.toLowerCase() ||
      t.id.toLowerCase() === cleanName.toLowerCase() ||
      normT === withoutMontakhab ||
      normT === `منتخب ${withoutMontakhab}` ||
      normT.replace(/^منتخب\s+/, '') === withoutMontakhab
    );
  });

  if (exists) {
    throw new Error(`الفريق أو المنتخب "${cleanName}" مسجل مسبقاً في النظام`);
  }

  return await getOrCreateTeam(cleanName, logo);
}

export async function getExistingTeamsAndLeagues() {
  return await withDbRetry(async () => {
    // Ensure Saudi Pro League and national teams are seeded
    await seedSaudiAndNationalTeams().catch(() => null);

    const [allLeagues, allTeams] = await Promise.all([
      db.select().from(leagues).orderBy(asc(leagues.name)),
      db.select().from(teams).orderBy(asc(teams.name)),
    ]);

    // Deduplicate leagues by normalized name
    const seenLeagueNames = new Set<string>();
    const deduplicatedLeagues = allLeagues.filter((l) => {
      const norm = normalizeArabicText(l.name);
      if (seenLeagueNames.has(norm)) return false;
      seenLeagueNames.add(norm);
      return true;
    });

    // Deduplicate teams by normalized name
    const seenTeamNames = new Set<string>();
    const deduplicatedTeams = allTeams.filter((t) => {
      const norm = normalizeArabicText(t.name);
      if (seenTeamNames.has(norm)) return false;
      seenTeamNames.add(norm);
      return true;
    });

    return { leagues: deduplicatedLeagues, teams: deduplicatedTeams };
  });
}

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
  contestId?: number;
}) {
  return await withDbRetry(async () => {
    let targetContest = data.contestId ? await getContestById(data.contestId) : await getActiveContest();
    if (!targetContest) {
      throw new Error('لا توجد مسابقة نشطة حالياً لإضافة مباريات إليها');
    }
    if (targetContest.status === 'completed') {
      throw new Error('لا يمكن إضافة مباريات لمسابقة منتهية');
    }
    if (targetContest.status !== 'active') {
      throw new Error('لا يمكن إضافة مباريات لمسابقة غير نشطة');
    }

    if (!data.leagueName || !data.homeTeamName || !data.awayTeamName || !data.matchDate) {
      throw new Error('يرجى ملء جميع البيانات الأساسية للمباراة (الدوري، الفريقين، والتاريخ)');
    }

    const parsedDate = new Date(data.matchDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('تاريخ المباراة غير صالح');
    }

    const points = typeof data.pointsPerMatch === 'number' && data.pointsPerMatch >= 1 && data.pointsPerMatch <= 20 ? data.pointsPerMatch : 2;

    // 1. Get or create league and teams in existing DB tables
    const leagueRec = await getOrCreateLeague(data.leagueName, data.leagueLogo);
    const homeTeamRec = await getOrCreateTeam(data.homeTeamName, data.homeTeamLogo);
    const awayTeamRec = await getOrCreateTeam(data.awayTeamName, data.awayTeamLogo);

    // 2. Insert into relational matches table
    const newMatchId = data.externalMatchId?.trim() || `m_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const matchTimeStr = parsedDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });

    await db.insert(matches).values({
      id: newMatchId,
      leagueId: leagueRec.id,
      homeTeamId: homeTeamRec.id,
      awayTeamId: awayTeamRec.id,
      matchDate: parsedDate,
      matchTime: matchTimeStr,
      status: 'SCHEDULED',
      source: 'admin_custom',
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // 3. Insert into predictionMatches table linked to matches.id
    const inserted = await db
      .insert(predictionMatches)
      .values({
        matchId: newMatchId,
        contestId: targetContest.id,
        isExternal: true,
        externalMatchId: data.externalMatchId || null,
        customLeagueName: leagueRec.name,
        customLeagueLogo: leagueRec.logo,
        customHomeName: homeTeamRec.name,
        customHomeLogo: homeTeamRec.logo,
        customAwayName: awayTeamRec.name,
        customAwayLogo: awayTeamRec.logo,
        customMatchDate: parsedDate,
        customStatus: 'SCHEDULED',
        pointsPerMatch: points,
        isActive: true,
      })
      .returning();

    return {
      message: 'تمت إضافة مباراة الدوري الخارجي إلى مسابقة التوقعات بنجاح وربطها بقاعدة البيانات',
      id: inserted[0].id,
      predictionMatch: inserted[0],
    };
  });
}

/**
 * Admin: Update an existing prediction match's details:
 * Teams, League, Date/Time, Points, Status, Result, and Active state.
 */
export async function updatePredictionMatchDetails(
  id: number,
  adminUserId: number,
  data: {
    homeTeamName?: string;
    homeTeamLogo?: string | null;
    awayTeamName?: string;
    awayTeamLogo?: string | null;
    leagueName?: string;
    leagueLogo?: string | null;
    matchDate?: string;
    pointsPerMatch?: number;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string;
    isActive?: boolean;
  }
) {
  return await withDbRetry(async () => {
    // 1. Fetch prediction match
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, id),
      with: {
        match: {
          with: {
            homeTeam: true,
            awayTeam: true,
            league: true,
          },
        },
      },
    });

    if (!pm) {
      throw new Error('مباراة التوقع غير موجودة');
    }

    // 2. Resolve or create League, Home Team, Away Team
    const finalLeagueName = (data.leagueName?.trim()) || pm.customLeagueName || pm.match?.league?.name || 'بطولة عامة';
    const finalLeagueLogo = data.leagueLogo !== undefined ? data.leagueLogo : (pm.customLeagueLogo || pm.match?.league?.logo);
    const leagueRec = await getOrCreateLeague(finalLeagueName, finalLeagueLogo);

    const finalHomeName = (data.homeTeamName?.trim()) || pm.customHomeName || pm.match?.homeTeam?.name || 'الفريق الأول';
    const finalHomeLogo = data.homeTeamLogo !== undefined ? data.homeTeamLogo : (pm.customHomeLogo || pm.match?.homeTeam?.logo);
    const homeTeamRec = await getOrCreateTeam(finalHomeName, finalHomeLogo);

    const finalAwayName = (data.awayTeamName?.trim()) || pm.customAwayName || pm.match?.awayTeam?.name || 'الفريق الثاني';
    const finalAwayLogo = data.awayTeamLogo !== undefined ? data.awayTeamLogo : (pm.customAwayLogo || pm.match?.awayTeam?.logo);
    const awayTeamRec = await getOrCreateTeam(finalAwayName, finalAwayLogo);

    // 3. Resolve Match Date
    let parsedDate: Date | null = null;
    if (data.matchDate) {
      const d = new Date(data.matchDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }
    const finalDate = parsedDate || pm.customMatchDate || pm.match?.matchDate || new Date();

    // 4. Resolve Points per match
    let finalPoints = pm.pointsPerMatch || 2;
    if (data.pointsPerMatch !== undefined && data.pointsPerMatch !== null) {
      if (typeof data.pointsPerMatch === 'number' && data.pointsPerMatch >= 1 && data.pointsPerMatch <= 20) {
        finalPoints = data.pointsPerMatch;
      }
    }

    // 5. Resolve status & scores
    const finalStatus = data.status || pm.customStatus || pm.match?.status || 'SCHEDULED';
    let finalHomeScore = data.homeScore !== undefined ? data.homeScore : (pm.customHomeScore ?? pm.match?.homeScore ?? null);
    let finalAwayScore = data.awayScore !== undefined ? data.awayScore : (pm.customAwayScore ?? pm.match?.awayScore ?? null);

    if (finalHomeScore !== null && finalHomeScore !== undefined) finalHomeScore = Number(finalHomeScore);
    if (finalAwayScore !== null && finalAwayScore !== undefined) finalAwayScore = Number(finalAwayScore);

    const finalIsActive = data.isActive !== undefined ? !!data.isActive : pm.isActive;

    // 6. Update relational match in matches table
    let linkedMatchId = pm.matchId;
    const matchTimeStr = finalDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (linkedMatchId) {
      await db.update(matches).set({
        leagueId: leagueRec.id,
        homeTeamId: homeTeamRec.id,
        awayTeamId: awayTeamRec.id,
        matchDate: finalDate,
        matchTime: matchTimeStr,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        status: finalStatus,
        updatedAt: new Date(),
      }).where(eq(matches.id, linkedMatchId));
    } else {
      const newMatchId = `m_pred_${pm.id}_${Date.now()}`;
      await db.insert(matches).values({
        id: newMatchId,
        leagueId: leagueRec.id,
        homeTeamId: homeTeamRec.id,
        awayTeamId: awayTeamRec.id,
        matchDate: finalDate,
        matchTime: matchTimeStr,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        status: finalStatus,
        source: 'admin_custom',
        updatedAt: new Date(),
      });
      linkedMatchId = newMatchId;
    }

    // 7. Update predictionMatches record
    await db.update(predictionMatches).set({
      matchId: linkedMatchId,
      customLeagueName: leagueRec.name,
      customLeagueLogo: leagueRec.logo,
      customHomeName: homeTeamRec.name,
      customHomeLogo: homeTeamRec.logo,
      customAwayName: awayTeamRec.name,
      customAwayLogo: awayTeamRec.logo,
      customMatchDate: finalDate,
      customHomeScore: finalHomeScore,
      customAwayScore: finalAwayScore,
      customStatus: finalStatus,
      pointsPerMatch: finalPoints,
      isActive: finalIsActive,
      updatedAt: new Date(),
    }).where(eq(predictionMatches.id, pm.id));

    // 8. Handle recalculation if status is FINISHED and scores are set
    if (finalStatus === 'FINISHED' && finalHomeScore !== null && finalAwayScore !== null) {
      await confirmAndEvaluatePredictionMatch(pm.id, adminUserId, finalHomeScore, finalAwayScore);
    } else if (finalStatus !== 'FINISHED' && (pm.isCalculated || pm.isConfirmedByAdmin)) {
      // Clear points safely if changed back from finished
      await db.transaction(async (tx) => {
        await tx.delete(predictionPoints).where(eq(predictionPoints.predictionMatchId, pm.id));
        await tx.update(predictions).set({
          isEvaluated: false,
          pointsEarned: 0,
          isGolden: false,
          goldenPoints: 0,
          updatedAt: new Date(),
        }).where(eq(predictions.predictionMatchId, pm.id));
        await tx.update(predictionMatches).set({
          isCalculated: false,
          isConfirmedByAdmin: false,
          calculatedAt: null,
          confirmedAt: null,
          confirmedBy: null,
        }).where(eq(predictionMatches.id, pm.id));
      });
    }

    return {
      success: true,
      message: 'تم حفظ وتحديث بيانات التوقع والمباراة بنجاح',
      id: pm.id,
    };
  });
}

/**
 * Admin: Edit match result (home score, away score, status) with atomic point recalculation.
 */
export async function updatePredictionMatchResult(
  id: number,
  adminUserId: number,
  data: {
    homeScore: number;
    awayScore: number;
    status?: string;
  }
) {
  const { homeScore, awayScore, status = 'FINISHED' } = data;

  if (
    typeof homeScore !== 'number' || !Number.isInteger(homeScore) || homeScore < 0 || homeScore > 30 ||
    typeof awayScore !== 'number' || !Number.isInteger(awayScore) || awayScore < 0 || awayScore > 30
  ) {
    throw new Error('النتيجة يجب أن تكون أرقاماً صحيحة بين 0 و 30 لكلا الفريقين');
  }

  if (status === 'FINISHED') {
    return await confirmAndEvaluatePredictionMatch(id, adminUserId, homeScore, awayScore);
  }

  return await withDbRetry(async () => {
    return await db.transaction(async (tx) => {
      const pm = await tx.query.predictionMatches.findFirst({
        where: eq(predictionMatches.id, id),
      });
      if (!pm) throw new Error('مباراة التوقع غير موجودة');

      // Clear points ledger
      await tx.delete(predictionPoints).where(eq(predictionPoints.predictionMatchId, id));

      // Reset predictions
      await tx.update(predictions).set({
        isEvaluated: false,
        pointsEarned: 0,
        isGolden: false,
        goldenPoints: 0,
        updatedAt: new Date(),
      }).where(eq(predictions.predictionMatchId, id));

      // Update predictionMatches
      await tx.update(predictionMatches).set({
        customHomeScore: homeScore,
        customAwayScore: awayScore,
        customStatus: status,
        isCalculated: false,
        isConfirmedByAdmin: false,
        updatedAt: new Date(),
      }).where(eq(predictionMatches.id, id));

      // Update matches table if relational
      if (pm.matchId) {
        await tx.update(matches).set({
          homeScore,
          awayScore,
          status,
          updatedAt: new Date(),
        }).where(eq(matches.id, pm.matchId));
      }

      return {
        success: true,
        message: `تم تحديث النتيجة إلى (${homeScore} - ${awayScore}) وحالة المباراة إلى (${status})`,
        homeScore,
        awayScore,
        status,
      };
    });
  });
}

export async function updatePredictionMatchPoints(id: number, pointsPerMatch: number) {
  return await withDbRetry(async () => {
    if (!pointsPerMatch || pointsPerMatch < 1 || pointsPerMatch > 20 || !Number.isInteger(pointsPerMatch)) {
      throw new Error('النقاط المحددة للمباراة يجب أن تكون رقماً صحيحاً بين 1 و 20');
    }
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, id),
    });
    if (!pm) {
      throw new Error('المباراة المحددة غير موجودة');
    }
    if (pm.isCalculated || pm.isConfirmedByAdmin) {
      throw new Error('لا يمكن تعديل نقاط مباراة تم اعتماد نتيجتها واحتساب نقاطها بالفعل');
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
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, id),
    });
    if (!pm) {
      throw new Error('المباراة المحددة غير موجودة');
    }
    if (isActive && (pm.isCalculated || pm.isConfirmedByAdmin)) {
      throw new Error('لا يمكن تفعيل مباراة تم اعتماد نتيجتها واحتساب نقاطها');
    }
    await db
      .update(predictionMatches)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(predictionMatches.id, id));
    return { success: true };
  });
}

export async function removePredictionMatch(id: number) {
  return await withDbRetry(async () => {
    const pm = await db.query.predictionMatches.findFirst({
      where: eq(predictionMatches.id, id),
    });
    if (!pm) {
      throw new Error('المباراة المحددة غير موجودة');
    }

    await db.transaction(async (tx) => {
      // Cleanly remove any points recorded in ledger for this match
      await tx.delete(predictionPoints).where(eq(predictionPoints.predictionMatchId, id));
      // Delete any user predictions for this match
      await tx.delete(predictions).where(eq(predictions.predictionMatchId, id));
      // Delete prediction match entry
      await tx.delete(predictionMatches).where(eq(predictionMatches.id, id));
    });

    return { success: true, message: 'تم حذف مباراة التوقع وكافة التوقعات والنقاط المرتبطة بها بنجاح' };
  });
}

export async function getAdminPredictionStats(contestId?: number) {
  return await withDbRetry(async () => {
    let targetContestId = contestId;
    if (targetContestId !== undefined) {
      const contest = await getContestById(targetContestId);
      if (!contest) {
        return {
          totalMatches: 0,
          evaluatedMatches: 0,
          activeMatches: 0,
          totalPredictions: 0,
          correctPredictions: 0,
          goldenPredictionsCount: 0,
          totalPointsDistributed: 0,
          goldenPointsDistributed: 0,
          successRate: 0,
        };
      }
    } else {
      const active = await getActiveContest();
      if (active) {
        targetContestId = active.id;
      }
    }

    const allMatches = targetContestId !== undefined
      ? await db.select().from(predictionMatches).where(eq(predictionMatches.contestId, targetContestId))
      : await db.select().from(predictionMatches);

    const allPreds = targetContestId !== undefined
      ? await db.select().from(predictions).where(eq(predictions.contestId, targetContestId))
      : await db.select().from(predictions);

    const allPoints = targetContestId !== undefined
      ? await db.select().from(predictionPoints).where(eq(predictionPoints.contestId, targetContestId))
      : await db.select().from(predictionPoints);

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

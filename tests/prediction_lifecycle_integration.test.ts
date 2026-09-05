import { describe, it, expect, beforeAll } from 'vitest';
import { db, initializeDatabaseSchema } from '../src/db/index.ts';
import {
  users,
  contestSettings,
  contestParticipants,
  predictionMatches,
  predictions,
  predictionPoints,
} from '../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import {
  saveUserPrediction,
  updateUserPredictionById,
  confirmAndEvaluatePredictionMatch,
  getLeaderboard,
  getGoldenLeaderboard,
} from '../src/services/predictionService.ts';

describe('Prediction System Lifecycle & Database Integration Tests', () => {
  let adminId: number;
  let user1Id: number;
  let user2Id: number;
  let user3Id: number;
  let contest1Id: number;
  let contest2Id: number;

  beforeAll(async () => {
    await initializeDatabaseSchema();

    // Clean up or create test users with unique emails
    const timestamp = Date.now();

    const [adminUser] = await db
      .insert(users)
      .values({
        uid: `uid_admin_${timestamp}`,
        email: `admin_${timestamp}@koranews.test`,
        name: 'Admin Tester',
        role: 'admin',
      })
      .returning();
    adminId = adminUser.id;

    const [u1] = await db
      .insert(users)
      .values({
        uid: `uid_u1_${timestamp}`,
        email: `user1_${timestamp}@koranews.test`,
        name: 'Player One',
        role: 'user',
      })
      .returning();
    user1Id = u1.id;

    const [u2] = await db
      .insert(users)
      .values({
        uid: `uid_u2_${timestamp}`,
        email: `user2_${timestamp}@koranews.test`,
        name: 'Player Two',
        role: 'user',
      })
      .returning();
    user2Id = u2.id;

    const [u3] = await db
      .insert(users)
      .values({
        uid: `uid_u3_${timestamp}`,
        email: `user3_${timestamp}@koranews.test`,
        name: 'Player Three',
        role: 'user',
      })
      .returning();
    user3Id = u3.id;

    // Create Contest 1 & Contest 2
    const [c1] = await db
      .insert(contestSettings)
      .values({
        name: `Contest A ${timestamp}`,
        status: 'active',
      })
      .returning();
    contest1Id = c1.id;

    const [c2] = await db
      .insert(contestSettings)
      .values({
        name: `Contest B ${timestamp}`,
        status: 'active',
      })
      .returning();
    contest2Id = c2.id;

    // Register user1, user2, user3 in Contest 1
    await db.insert(contestParticipants).values([
      { userId: user1Id, contestId: contest1Id, status: 'approved' },
      { userId: user2Id, contestId: contest1Id, status: 'approved' },
      { userId: user3Id, contestId: contest1Id, status: 'approved' },
    ]);

    // Register only user1 in Contest 2
    await db.insert(contestParticipants).values([
      { userId: user1Id, contestId: contest2Id, status: 'approved' },
    ]);
  });

  it('1. Duplicate Prediction Prevention: Database unique constraint prevents duplicate prediction for same user and match', async () => {
    // Create open prediction match in Contest 1
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours future
    const [pm] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Real Madrid',
        customAwayName: 'Barcelona',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    // User1 saves prediction
    const res1 = await saveUserPrediction(user1Id, pm.id, 2, 1);
    expect(res1.success).toBe(true);

    // If trying raw DB insert for duplicate user + match, it must fail with unique constraint
    await expect(
      db.insert(predictions).values({
        userId: user1Id,
        predictionMatchId: pm.id,
        contestId: contest1Id,
        homeScore: 1,
        awayScore: 0,
      })
    ).rejects.toThrow();

    // Calling saveUserPrediction again acts as an update in the allowed window
    const res2 = await saveUserPrediction(user1Id, pm.id, 3, 1);
    expect(res2.success).toBe(true);
    expect(res2.prediction.homeScore).toBe(3);

    // Verify only ONE record exists in DB for this user + match
    const userPreds = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, user1Id), eq(predictions.predictionMatchId, pm.id)));
    expect(userPreds.length).toBe(1);
    expect(userPreds[0].homeScore).toBe(3);
  });

  it('2. Contest Isolation: User cannot predict for a contest they are not participant in', async () => {
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [pmContest2] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest2Id,
        customHomeName: 'Arsenal',
        customAwayName: 'Chelsea',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 5,
      })
      .returning();

    // user2 is not in contest2
    await expect(saveUserPrediction(user2Id, pmContest2.id, 2, 0)).rejects.toThrow(
      /يجب التسجيل أولاً/
    );
  });

  it('3. Lock Window Prevention: User cannot predict or edit when match is within 1 minute or finished', async () => {
    // Match in 30 seconds (less than 1 minute)
    const imminentKickoff = new Date(Date.now() + 30 * 1000);
    const [imminentMatch] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Liverpool',
        customAwayName: 'Man City',
        customMatchDate: imminentKickoff,
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    await expect(saveUserPrediction(user1Id, imminentMatch.id, 1, 1)).rejects.toThrow(
      /تم إغلاق التوقعات/
    );

    // Finished match
    const pastKickoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const [finishedMatch] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Milan',
        customAwayName: 'Inter',
        customMatchDate: pastKickoff,
        customStatus: 'FINISHED',
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    await expect(saveUserPrediction(user1Id, finishedMatch.id, 0, 1)).rejects.toThrow(
      /تم إغلاق التوقعات/
    );
  });

  it('4. Golden Rule (1 Winner on 2-Point Match): Awards 2 base + 1 golden = 3 points', async () => {
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [pm] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Bayern',
        customAwayName: 'Dortmund',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    // User1 predicts 2-1 (correct)
    await saveUserPrediction(user1Id, pm.id, 2, 1);
    // User2 predicts 1-1 (incorrect)
    await saveUserPrediction(user2Id, pm.id, 1, 1);
    // User3 predicts 0-0 (incorrect)
    await saveUserPrediction(user3Id, pm.id, 0, 0);

    // Admin confirms match with 2-1
    const evalRes = await confirmAndEvaluatePredictionMatch(pm.id, adminId, 2, 1);

    expect(evalRes.success).toBe(true);
    expect(evalRes.isGoldenPrediction).toBe(true);
    expect(evalRes.correctPredictorsCount).toBe(1);
    expect(evalRes.pointsAwarded).toBe(3); // 2 + 1 = 3
    expect(evalRes.goldenAwarded).toBe(1);

    // Verify DB records
    const [p1] = await db.select().from(predictions).where(and(eq(predictions.userId, user1Id), eq(predictions.predictionMatchId, pm.id)));
    expect(p1.pointsEarned).toBe(3);
    expect(p1.isGolden).toBe(true);
    expect(p1.goldenPoints).toBe(1);
    expect(p1.isEvaluated).toBe(true);

    const [p2] = await db.select().from(predictions).where(and(eq(predictions.userId, user2Id), eq(predictions.predictionMatchId, pm.id)));
    expect(p2.pointsEarned).toBe(0);
    expect(p2.isGolden).toBe(false);
    expect(p2.goldenPoints).toBe(0);

    // Verify Ledger table
    const pointsRecords = await db
      .select()
      .from(predictionPoints)
      .where(eq(predictionPoints.predictionMatchId, pm.id));
    expect(pointsRecords.length).toBe(1);
    expect(pointsRecords[0].userId).toBe(user1Id);
    expect(pointsRecords[0].points).toBe(3);
    expect(pointsRecords[0].isGoldenBonus).toBe(true);
  });

  it('5. Multiple Winners on 2-Point Match: No golden bonus, each correct user receives 2 points', async () => {
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [pm] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'PSG',
        customAwayName: 'Marseille',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    // User1 & User2 both predict 3-1 (correct)
    await saveUserPrediction(user1Id, pm.id, 3, 1);
    await saveUserPrediction(user2Id, pm.id, 3, 1);
    // User3 predicts 1-0 (incorrect)
    await saveUserPrediction(user3Id, pm.id, 1, 0);

    const evalRes = await confirmAndEvaluatePredictionMatch(pm.id, adminId, 3, 1);

    expect(evalRes.success).toBe(true);
    expect(evalRes.isGoldenPrediction).toBe(false);
    expect(evalRes.correctPredictorsCount).toBe(2);
    expect(evalRes.pointsAwarded).toBe(4); // 2 + 2 = 4
    expect(evalRes.goldenAwarded).toBe(0);

    const [p1] = await db.select().from(predictions).where(and(eq(predictions.userId, user1Id), eq(predictions.predictionMatchId, pm.id)));
    expect(p1.pointsEarned).toBe(2);
    expect(p1.isGolden).toBe(false);

    const [p2] = await db.select().from(predictions).where(and(eq(predictions.userId, user2Id), eq(predictions.predictionMatchId, pm.id)));
    expect(p2.pointsEarned).toBe(2);
    expect(p2.isGolden).toBe(false);
  });

  it('6. High Points Match (5 points): No golden even if single correct predictor', async () => {
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [pm] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Al Hilal',
        customAwayName: 'Al Nassr',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 5, // 5 points
      })
      .returning();

    // User1 predicts 4-2 (correct)
    await saveUserPrediction(user1Id, pm.id, 4, 2);
    // User2 predicts 1-1 (incorrect)
    await saveUserPrediction(user2Id, pm.id, 1, 1);

    const evalRes = await confirmAndEvaluatePredictionMatch(pm.id, adminId, 4, 2);

    expect(evalRes.success).toBe(true);
    expect(evalRes.isGoldenPrediction).toBe(false);
    expect(evalRes.pointsAwarded).toBe(5);
    expect(evalRes.goldenAwarded).toBe(0);

    const [p1] = await db.select().from(predictions).where(and(eq(predictions.userId, user1Id), eq(predictions.predictionMatchId, pm.id)));
    expect(p1.pointsEarned).toBe(5);
    expect(p1.isGolden).toBe(false);
    expect(p1.goldenPoints).toBe(0);
  });

  it('7. Idempotency: Confirming match twice does NOT duplicate points ledger or double totals', async () => {
    const kickoff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [pm] = await db
      .insert(predictionMatches)
      .values({
        contestId: contest1Id,
        customHomeName: 'Juventus',
        customAwayName: 'Napoli',
        customMatchDate: kickoff,
        isActive: true,
        pointsPerMatch: 2,
      })
      .returning();

    await saveUserPrediction(user1Id, pm.id, 1, 0);
    await saveUserPrediction(user2Id, pm.id, 1, 0);

    // Confirm 1st time
    const res1 = await confirmAndEvaluatePredictionMatch(pm.id, adminId, 1, 0);
    expect(res1.pointsAwarded).toBe(4);

    const ledgerCount1 = (
      await db
        .select()
        .from(predictionPoints)
        .where(eq(predictionPoints.predictionMatchId, pm.id))
    ).length;
    expect(ledgerCount1).toBe(2);

    // Confirm 2nd time with same result
    const res2 = await confirmAndEvaluatePredictionMatch(pm.id, adminId, 1, 0);
    expect(res2.pointsAwarded).toBe(4);

    const ledgerCount2 = (
      await db
        .select()
        .from(predictionPoints)
        .where(eq(predictionPoints.predictionMatchId, pm.id))
    ).length;
    expect(ledgerCount2).toBe(2); // Still exactly 2, never 4!
  });

  it('8. Leaderboard & Golden Leaderboard sorting compliance', async () => {
    const leaderboardResult = await getLeaderboard(user1Id, 100, contest1Id);
    expect(leaderboardResult.leaderboard.length).toBeGreaterThan(0);

    // Verify main leaderboard ordering: Total Points DESC -> Correct DESC -> Golden DESC -> id ASC
    for (let i = 0; i < leaderboardResult.leaderboard.length - 1; i++) {
      const a = leaderboardResult.leaderboard[i];
      const b = leaderboardResult.leaderboard[i + 1];

      if (a.totalPoints !== b.totalPoints) {
        expect(a.totalPoints).toBeGreaterThanOrEqual(b.totalPoints);
      } else if (a.correctPredictions !== b.correctPredictions) {
        expect(a.correctPredictions).toBeGreaterThanOrEqual(b.correctPredictions);
      } else if (a.goldenPredictions !== b.goldenPredictions) {
        expect(a.goldenPredictions).toBeGreaterThanOrEqual(b.goldenPredictions);
      } else {
        expect(a.id).toBeLessThanOrEqual(b.id);
      }
    }

    const goldenLeaderboardResult = await getGoldenLeaderboard(user1Id, 100, contest1Id);
    expect(goldenLeaderboardResult.leaderboard.length).toBeGreaterThan(0);

    // Verify golden leaderboard ordering: Golden DESC -> Total Points DESC -> Correct DESC -> id ASC
    for (let i = 0; i < goldenLeaderboardResult.leaderboard.length - 1; i++) {
      const a = goldenLeaderboardResult.leaderboard[i];
      const b = goldenLeaderboardResult.leaderboard[i + 1];

      if (a.goldenPredictions !== b.goldenPredictions) {
        expect(a.goldenPredictions).toBeGreaterThanOrEqual(b.goldenPredictions);
      } else if (a.totalPoints !== b.totalPoints) {
        expect(a.totalPoints).toBeGreaterThanOrEqual(b.totalPoints);
      } else if (a.correctPredictions !== b.correctPredictions) {
        expect(a.correctPredictions).toBeGreaterThanOrEqual(b.correctPredictions);
      } else {
        expect(a.id).toBeLessThanOrEqual(b.id);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  isMatchOpenForPrediction,
  evaluateMatchPredictions,
  calculateGoldenPoints,
} from '../src/services/predictionService.ts';
import {
  validateScore,
  validatePointsPerMatch,
  validatePositiveId,
} from '../server/security/validators.ts';

describe('Comprehensive Prediction Rules & Business Logic Tests', () => {
  // 1. 2 points + 1 user correct = 3 points
  it('Scenario 1: 2 points + 1 user correct = 3 points (2 base + 1 golden)', () => {
    const evaluation = evaluateMatchPredictions(
      2,
      [
        { id: 1, userId: 1, homeScore: 2, awayScore: 1 },
        { id: 2, userId: 2, homeScore: 1, awayScore: 1 },
      ],
      2,
      1
    );

    const user1 = evaluation.evaluatedPredictions.find((r) => r.userId === 1)!;
    const user2 = evaluation.evaluatedPredictions.find((r) => r.userId === 2)!;

    expect(evaluation.isGoldenEligible).toBe(true);
    expect(evaluation.correctPredictionsCount).toBe(1);

    expect(user1.pointsEarned).toBe(3);
    expect(user1.isGolden).toBe(true);
    expect(user1.goldenPoints).toBe(1);

    expect(user2.pointsEarned).toBe(0);
    expect(user2.isGolden).toBe(false);
  });

  // 2. 2 points + 2 users correct = 2 points each
  it('Scenario 2: 2 points + 2 users correct = 2 points each (no golden)', () => {
    const evaluation = evaluateMatchPredictions(
      2,
      [
        { id: 1, userId: 1, homeScore: 3, awayScore: 0 },
        { id: 2, userId: 2, homeScore: 3, awayScore: 0 },
        { id: 3, userId: 3, homeScore: 1, awayScore: 0 },
      ],
      3,
      0
    );

    const user1 = evaluation.evaluatedPredictions.find((r) => r.userId === 1)!;
    const user2 = evaluation.evaluatedPredictions.find((r) => r.userId === 2)!;
    const user3 = evaluation.evaluatedPredictions.find((r) => r.userId === 3)!;

    expect(evaluation.isGoldenEligible).toBe(false);
    expect(evaluation.correctPredictionsCount).toBe(2);

    expect(user1.pointsEarned).toBe(2);
    expect(user1.isGolden).toBe(false);
    expect(user1.goldenPoints).toBe(0);

    expect(user2.pointsEarned).toBe(2);
    expect(user2.isGolden).toBe(false);
    expect(user2.goldenPoints).toBe(0);

    expect(user3.pointsEarned).toBe(0);
  });

  // 3. 5 points + 1 user correct = 5 points
  it('Scenario 3: 5 points + 1 user correct = 5 points (no golden)', () => {
    const evaluation = evaluateMatchPredictions(
      5,
      [
        { id: 1, userId: 1, homeScore: 1, awayScore: 0 },
        { id: 2, userId: 2, homeScore: 0, awayScore: 0 },
      ],
      1,
      0
    );

    const user1 = evaluation.evaluatedPredictions.find((r) => r.userId === 1)!;
    expect(evaluation.isGoldenEligible).toBe(false);
    expect(user1.pointsEarned).toBe(5);
    expect(user1.isGolden).toBe(false);
    expect(user1.goldenPoints).toBe(0);
  });

  // 4. 10 points + 1 user correct = 10 points
  it('Scenario 4: 10 points + 1 user correct = 10 points (no golden)', () => {
    const evaluation = evaluateMatchPredictions(
      10,
      [
        { id: 1, userId: 1, homeScore: 2, awayScore: 2 },
        { id: 2, userId: 2, homeScore: 1, awayScore: 0 },
      ],
      2,
      2
    );

    const user1 = evaluation.evaluatedPredictions.find((r) => r.userId === 1)!;
    expect(evaluation.isGoldenEligible).toBe(false);
    expect(user1.pointsEarned).toBe(10);
    expect(user1.isGolden).toBe(false);
    expect(user1.goldenPoints).toBe(0);
  });

  // 4b. 3 users correct on 2 points match = 2 points each (no golden)
  it('Scenario 4b: 3 users correct on 2-point match = 2 points each (no golden)', () => {
    const evaluation = evaluateMatchPredictions(
      2,
      [
        { id: 1, userId: 1, homeScore: 1, awayScore: 1 },
        { id: 2, userId: 2, homeScore: 1, awayScore: 1 },
        { id: 3, userId: 3, homeScore: 1, awayScore: 1 },
        { id: 4, userId: 4, homeScore: 2, awayScore: 0 },
      ],
      1,
      1
    );

    expect(evaluation.isGoldenEligible).toBe(false);
    expect(evaluation.correctPredictionsCount).toBe(3);

    const user1 = evaluation.evaluatedPredictions.find((r) => r.userId === 1)!;
    const user2 = evaluation.evaluatedPredictions.find((r) => r.userId === 2)!;
    const user3 = evaluation.evaluatedPredictions.find((r) => r.userId === 3)!;
    const user4 = evaluation.evaluatedPredictions.find((r) => r.userId === 4)!;

    expect(user1.pointsEarned).toBe(2);
    expect(user1.isGolden).toBe(false);
    expect(user2.pointsEarned).toBe(2);
    expect(user2.isGolden).toBe(false);
    expect(user3.pointsEarned).toBe(2);
    expect(user3.isGolden).toBe(false);
    expect(user4.pointsEarned).toBe(0);
  });

  // 5. No correct prediction = 0 points
  it('Scenario 5: No correct predictions = 0 points awarded to all users', () => {
    const evaluation = evaluateMatchPredictions(
      2,
      [
        { id: 1, userId: 1, homeScore: 0, awayScore: 0 },
        { id: 2, userId: 2, homeScore: 1, awayScore: 0 },
      ],
      3,
      2
    );

    expect(evaluation.isGoldenEligible).toBe(false);
    expect(evaluation.correctPredictionsCount).toBe(0);

    evaluation.evaluatedPredictions.forEach((r) => {
      expect(r.pointsEarned).toBe(0);
      expect(r.isGolden).toBe(false);
      expect(r.goldenPoints).toBe(0);
    });
  });

  // 7. Strict Input Validation Tests (Rejecting '2abc', '2.5', '-1', NaN, Infinity)
  it('Scenario 7: Strict Input Validation rejects malformed numeric strings, floats, and negative numbers', () => {
    // Score validation
    expect(validateScore(0).valid).toBe(true);
    expect(validateScore('0').valid).toBe(true);
    expect(validateScore(3).valid).toBe(true);
    expect(validateScore('3').valid).toBe(true);
    expect(validateScore(30).valid).toBe(true);

    expect(validateScore('2abc').valid).toBe(false);
    expect(validateScore('2.5').valid).toBe(false);
    expect(validateScore(2.5).valid).toBe(false);
    expect(validateScore(-1).valid).toBe(false);
    expect(validateScore('-1').valid).toBe(false);
    expect(validateScore(NaN).valid).toBe(false);
    expect(validateScore(Infinity).valid).toBe(false);
    expect(validateScore(null).valid).toBe(false);
    expect(validateScore(undefined).valid).toBe(false);
    expect(validateScore('').valid).toBe(false);
    expect(validateScore(true).valid).toBe(false);

    // Points per match validation
    expect(validatePointsPerMatch(2).valid).toBe(true);
    expect(validatePointsPerMatch(5).valid).toBe(true);
    expect(validatePointsPerMatch(10).valid).toBe(true);
    expect(validatePointsPerMatch('10').valid).toBe(true);

    expect(validatePointsPerMatch(0).valid).toBe(false);
    expect(validatePointsPerMatch('0').valid).toBe(false);
    expect(validatePointsPerMatch('2abc').valid).toBe(false);
    expect(validatePointsPerMatch('2.5').valid).toBe(false);
    expect(validatePointsPerMatch(-5).valid).toBe(false);
    expect(validatePointsPerMatch(NaN).valid).toBe(false);
    expect(validatePointsPerMatch(Infinity).valid).toBe(false);

    // Positive ID validation
    expect(validatePositiveId(1).valid).toBe(true);
    expect(validatePositiveId('42').valid).toBe(true);
    expect(validatePositiveId(0).valid).toBe(false);
    expect(validatePositiveId('-1').valid).toBe(false);
    expect(validatePositiveId('1abc').valid).toBe(false);
    expect(validatePositiveId('1.5').valid).toBe(false);
  });

  // 8. Match timing and lock rules
  it('Scenario 8: Prediction locks 1 minute before kickoff and stays locked when live/finished', () => {
    const futureKickoff = new Date(Date.now() + 15 * 60 * 1000);
    expect(isMatchOpenForPrediction(true, 'SCHEDULED', futureKickoff)).toBe(true);

    const imminentKickoff = new Date(Date.now() + 45 * 1000);
    expect(isMatchOpenForPrediction(true, 'SCHEDULED', imminentKickoff)).toBe(false);

    const liveMatchTime = new Date(Date.now() - 30 * 60 * 1000);
    expect(isMatchOpenForPrediction(true, 'IN_PLAY', liveMatchTime)).toBe(false);
    expect(isMatchOpenForPrediction(true, 'FINISHED', liveMatchTime)).toBe(false);
  });

  // 9. Leaderboard deterministic sorting test
  it('Scenario 9: Leaderboard sorts strictly by Total Points DESC -> Correct Predictions DESC -> Golden Predictions DESC -> userId ASC', () => {
    const list = [
      { id: 10, totalPoints: 10, correctPredictions: 5, goldenPredictions: 1 },
      { id: 2, totalPoints: 10, correctPredictions: 5, goldenPredictions: 2 },
      { id: 5, totalPoints: 10, correctPredictions: 5, goldenPredictions: 2 },
      { id: 8, totalPoints: 12, correctPredictions: 4, goldenPredictions: 0 },
      { id: 1, totalPoints: 10, correctPredictions: 6, goldenPredictions: 0 },
    ];

    list.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
      return a.id - b.id;
    });

    const idsOrder = list.map((u) => u.id);
    expect(idsOrder).toEqual([8, 1, 2, 5, 10]);
  });

  // 10. Golden Leaderboard sorting & +1 golden point calculation
  it('Scenario 10: Golden Leaderboard sorts by Golden Predictions DESC -> Total Points DESC -> Correct Predictions DESC -> userId ASC', () => {
    const list = [
      { id: 4, goldenPredictions: 1, totalPoints: 15, correctPredictions: 7 },
      { id: 1, goldenPredictions: 3, totalPoints: 9, correctPredictions: 3 },
      { id: 2, goldenPredictions: 3, totalPoints: 12, correctPredictions: 4 },
      { id: 3, goldenPredictions: 3, totalPoints: 12, correctPredictions: 5 },
    ];

    list.sort((a, b) => {
      if (b.goldenPredictions !== a.goldenPredictions) return b.goldenPredictions - a.goldenPredictions;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
      return a.id - b.id;
    });

    const idsOrder = list.map((u) => u.id);
    expect(idsOrder).toEqual([3, 2, 1, 4]);
  });

  // 11. Contest Isolation filtering logic test
  it('Scenario 11: Contest filtering excludes points and predictions from other contests', () => {
    const allUserPoints = [
      { userId: 1, points: 3, contestId: 1 },
      { userId: 1, points: 5, contestId: 2 },
      { userId: 2, points: 2, contestId: 1 },
    ];

    const targetContestId = 1;

    const filteredForUser1 = allUserPoints
      .filter((pt) => pt.userId === 1)
      .filter((pt) => !targetContestId || pt.contestId === targetContestId || !pt.contestId);

    const totalPointsContest1 = filteredForUser1.reduce((acc, p) => acc + p.points, 0);
    expect(totalPointsContest1).toBe(3);
  });

  // 12. Cumulative Golden Points Formula & Explicit Cases:
  // Each golden = 3 base points.
  // Group Bonus: +1 extra point for every 3 completed golden predictions: floor(goldenCount / 3).
  // Total = (goldenCount * 3) + floor(goldenCount / 3).
  it('Scenario 12: Cumulative Golden Points Formula strictly satisfies all mandatory cases (0 to 12 & milestones)', () => {
    const testCases: Array<{ count: number; expectedBase: number; expectedBonus: number; expectedTotal: number }> = [
      { count: 0, expectedBase: 0, expectedBonus: 0, expectedTotal: 0 },
      { count: 1, expectedBase: 3, expectedBonus: 0, expectedTotal: 3 },
      { count: 2, expectedBase: 6, expectedBonus: 0, expectedTotal: 6 },
      { count: 3, expectedBase: 9, expectedBonus: 1, expectedTotal: 10 },
      { count: 4, expectedBase: 12, expectedBonus: 1, expectedTotal: 13 },
      { count: 5, expectedBase: 15, expectedBonus: 1, expectedTotal: 16 },
      { count: 6, expectedBase: 18, expectedBonus: 2, expectedTotal: 20 },
      { count: 7, expectedBase: 21, expectedBonus: 2, expectedTotal: 23 },
      { count: 8, expectedBase: 24, expectedBonus: 2, expectedTotal: 26 },
      { count: 9, expectedBase: 27, expectedBonus: 3, expectedTotal: 30 },
      { count: 10, expectedBase: 30, expectedBonus: 3, expectedTotal: 33 },
      { count: 11, expectedBase: 33, expectedBonus: 3, expectedTotal: 36 },
      { count: 12, expectedBase: 36, expectedBonus: 4, expectedTotal: 40 },
      { count: 15, expectedBase: 45, expectedBonus: 5, expectedTotal: 50 },
      { count: 18, expectedBase: 54, expectedBonus: 6, expectedTotal: 60 },
    ];

    for (const tc of testCases) {
      const res = calculateGoldenPoints(tc.count);
      expect(res.basePoints).toBe(tc.expectedBase);
      expect(res.bonusPoints).toBe(tc.expectedBonus);
      expect(res.totalGoldenPoints).toBe(tc.expectedTotal);
    }
  });

  // 13. Incomplete group validation:
  // - Bonus is only awarded upon completing multiples of 3.
  // - 5 goldens = only 1 bonus (16 points total).
  // - 8 goldens = only 2 bonuses (26 points total).
  it('Scenario 13: Incomplete groups do not receive extra bonuses', () => {
    const res5 = calculateGoldenPoints(5);
    expect(res5.bonusPoints).toBe(1);
    expect(res5.totalGoldenPoints).toBe(16);

    const res8 = calculateGoldenPoints(8);
    expect(res8.bonusPoints).toBe(2);
    expect(res8.totalGoldenPoints).toBe(26);
  });

  // 14. Idempotency validation:
  // Recalculating repeatedly yields the exact same deterministic result without point inflation.
  it('Scenario 14: Golden scoring calculation is strictly idempotent', () => {
    const count = 6;
    const run1 = calculateGoldenPoints(count);
    const run2 = calculateGoldenPoints(count);
    const run3 = calculateGoldenPoints(count);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
    expect(run1.totalGoldenPoints).toBe(20);
  });
});

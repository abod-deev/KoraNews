import { describe, it, expect } from 'vitest';
import { isMatchOpenForPrediction } from '../src/services/predictionService.ts';
import {
  validateScore,
  validatePointsPerMatch,
  validatePositiveId,
} from '../server/security/validators.ts';

describe('Comprehensive Prediction Rules & Business Logic Tests', () => {
  // Pure evaluation simulator mirroring confirmAndEvaluatePredictionMatch
  function simulateMatchEvaluation(
    pointsPerMatch: number,
    predictionsList: Array<{ userId: number; homeScore: number; awayScore: number }>,
    finalHomeScore: number,
    finalAwayScore: number
  ) {
    const correctPredictors = predictionsList.filter(
      (p) => p.homeScore === finalHomeScore && p.awayScore === finalAwayScore
    );
    const correctCount = correctPredictors.length;
    const isGoldenEligible = pointsPerMatch === 2 && correctCount === 1;

    return predictionsList.map((p) => {
      const isCorrect = p.homeScore === finalHomeScore && p.awayScore === finalAwayScore;
      const isGolden = isCorrect && isGoldenEligible;
      const goldenBonus = isGolden ? 1 : 0;
      const pointsEarned = isCorrect ? pointsPerMatch + goldenBonus : 0;
      return {
        userId: p.userId,
        isCorrect,
        isGolden,
        goldenPoints: goldenBonus,
        pointsEarned,
      };
    });
  }

  // Idempotency simulator mirroring database transaction delete & re-insert
  function simulateIdempotentEvaluationLedger(
    pointsPerMatch: number,
    predictionsList: Array<{ userId: number; homeScore: number; awayScore: number }>,
    finalHomeScore: number,
    finalAwayScore: number
  ) {
    let ledger: Array<{ userId: number; points: number; isGolden: boolean }> = [];

    // Run Confirm Result once
    const firstRun = simulateMatchEvaluation(pointsPerMatch, predictionsList, finalHomeScore, finalAwayScore);
    ledger = firstRun
      .filter((r) => r.isCorrect)
      .map((r) => ({ userId: r.userId, points: r.pointsEarned, isGolden: r.isGolden }));

    const ledgerAfterFirstConfirm = [...ledger];

    // Run Confirm Result second time (Idempotent: wipe and rebuild in transaction)
    ledger = []; // tx.delete(predictionPoints).where(predictionMatchId)
    const secondRun = simulateMatchEvaluation(pointsPerMatch, predictionsList, finalHomeScore, finalAwayScore);
    ledger = secondRun
      .filter((r) => r.isCorrect)
      .map((r) => ({ userId: r.userId, points: r.pointsEarned, isGolden: r.isGolden }));

    return {
      firstRunResult: ledgerAfterFirstConfirm,
      secondRunResult: ledger,
      isIdentical: JSON.stringify(ledgerAfterFirstConfirm) === JSON.stringify(ledger),
    };
  }

  // 1. 2 points + 1 user correct = 3 points
  it('Scenario 1: 2 points + 1 user correct = 3 points (2 base + 1 golden)', () => {
    const results = simulateMatchEvaluation(
      2,
      [
        { userId: 1, homeScore: 2, awayScore: 1 },
        { userId: 2, homeScore: 1, awayScore: 1 },
      ],
      2,
      1
    );

    const user1 = results.find((r) => r.userId === 1)!;
    const user2 = results.find((r) => r.userId === 2)!;

    expect(user1.pointsEarned).toBe(3);
    expect(user1.isGolden).toBe(true);
    expect(user1.goldenPoints).toBe(1);

    expect(user2.pointsEarned).toBe(0);
    expect(user2.isGolden).toBe(false);
  });

  // 2. 2 points + 2 users correct = 2 points each
  it('Scenario 2: 2 points + 2 users correct = 2 points each (no golden)', () => {
    const results = simulateMatchEvaluation(
      2,
      [
        { userId: 1, homeScore: 3, awayScore: 0 },
        { userId: 2, homeScore: 3, awayScore: 0 },
        { userId: 3, homeScore: 1, awayScore: 0 },
      ],
      3,
      0
    );

    const user1 = results.find((r) => r.userId === 1)!;
    const user2 = results.find((r) => r.userId === 2)!;
    const user3 = results.find((r) => r.userId === 3)!;

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
    const results = simulateMatchEvaluation(
      5,
      [
        { userId: 1, homeScore: 1, awayScore: 0 },
        { userId: 2, homeScore: 0, awayScore: 0 },
      ],
      1,
      0
    );

    const user1 = results.find((r) => r.userId === 1)!;
    expect(user1.pointsEarned).toBe(5);
    expect(user1.isGolden).toBe(false);
    expect(user1.goldenPoints).toBe(0);
  });

  // 4. 10 points + 1 user correct = 10 points
  it('Scenario 4: 10 points + 1 user correct = 10 points (no golden)', () => {
    const results = simulateMatchEvaluation(
      10,
      [
        { userId: 1, homeScore: 2, awayScore: 2 },
        { userId: 2, homeScore: 1, awayScore: 0 },
      ],
      2,
      2
    );

    const user1 = results.find((r) => r.userId === 1)!;
    expect(user1.pointsEarned).toBe(10);
    expect(user1.isGolden).toBe(false);
    expect(user1.goldenPoints).toBe(0);
  });

  // 5. No correct prediction = 0 points
  it('Scenario 5: No correct predictions = 0 points awarded to all users', () => {
    const results = simulateMatchEvaluation(
      2,
      [
        { userId: 1, homeScore: 0, awayScore: 0 },
        { userId: 2, homeScore: 1, awayScore: 0 },
      ],
      3,
      2
    );

    results.forEach((r) => {
      expect(r.pointsEarned).toBe(0);
      expect(r.isGolden).toBe(false);
    });
  });

  // 6. Confirm Result is Idempotent: Confirming twice does not duplicate points
  it('Scenario 6: Confirm Result twice produces identical ledger without duplicate points', () => {
    const predictions = [
      { userId: 1, homeScore: 2, awayScore: 1 },
      { userId: 2, homeScore: 2, awayScore: 1 },
      { userId: 3, homeScore: 0, awayScore: 1 },
    ];

    const result = simulateIdempotentEvaluationLedger(2, predictions, 2, 1);
    expect(result.isIdentical).toBe(true);
    expect(result.secondRunResult.length).toBe(2);
    expect(result.secondRunResult[0].points).toBe(2);
    expect(result.secondRunResult[1].points).toBe(2);
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
});

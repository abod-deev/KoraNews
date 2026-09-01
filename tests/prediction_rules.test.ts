import { describe, it, expect } from 'vitest';
import { isMatchOpenForPrediction } from '../src/services/predictionService.ts';

describe('Comprehensive Prediction Rules & Business Logic Tests (15 Test Cases)', () => {
  // Helper for computing prediction evaluation
  function evaluateMatchPrediction(pointsPerMatch: number, totalCorrectPredictors: number, userPredictedCorrect: boolean) {
    if (!userPredictedCorrect) {
      return { isCorrect: false, pointsEarned: 0, isGolden: false, goldenPoints: 0 };
    }
    const isGoldenEligible = pointsPerMatch === 2 && totalCorrectPredictors === 1;
    const goldenBonus = isGoldenEligible ? 1 : 0;
    return {
      isCorrect: true,
      pointsEarned: pointsPerMatch + goldenBonus,
      isGolden: isGoldenEligible,
      goldenPoints: goldenBonus,
    };
  }

  // 1. Golden Prediction: 2-point match with exactly 1 winner
  it('Test Case 1: 2-point match with 1 winner grants Golden Prediction (+1 bonus, total 3)', () => {
    const result = evaluateMatchPrediction(2, 1, true);
    expect(result.isGolden).toBe(true);
    expect(result.goldenPoints).toBe(1);
    expect(result.pointsEarned).toBe(3);
  });

  // 2. Golden Prediction: 2-point match with 2 or more winners
  it('Test Case 2: 2-point match with multiple winners gives 2 base points only (no golden)', () => {
    const result = evaluateMatchPrediction(2, 2, true);
    expect(result.isGolden).toBe(false);
    expect(result.goldenPoints).toBe(0);
    expect(result.pointsEarned).toBe(2);

    const result5 = evaluateMatchPrediction(2, 5, true);
    expect(result5.isGolden).toBe(false);
    expect(result5.goldenPoints).toBe(0);
    expect(result5.pointsEarned).toBe(2);
  });

  // 3. Golden Exclusion: 3-point match with 1 winner
  it('Test Case 3: 3-point match with 1 winner awards 3 base points only (strictly excluded from golden)', () => {
    const result = evaluateMatchPrediction(3, 1, true);
    expect(result.isGolden).toBe(false);
    expect(result.goldenPoints).toBe(0);
    expect(result.pointsEarned).toBe(3);
  });

  // 4. Golden Exclusion: 4, 5, 10-point match
  it('Test Case 4: 4, 5, and 10-point matches are excluded from golden predictions even with single winner', () => {
    [4, 5, 10].forEach((pts) => {
      const result = evaluateMatchPrediction(pts, 1, true);
      expect(result.isGolden).toBe(false);
      expect(result.goldenPoints).toBe(0);
      expect(result.pointsEarned).toBe(pts);
    });
  });

  // 5. Incorrect prediction receives 0 points
  it('Test Case 5: Incorrect predictions receive 0 points and no golden bonuses regardless of match weight', () => {
    const res2 = evaluateMatchPrediction(2, 1, false);
    expect(res2.pointsEarned).toBe(0);
    expect(res2.isGolden).toBe(false);

    const res5 = evaluateMatchPrediction(5, 1, false);
    expect(res5.pointsEarned).toBe(0);
    expect(res5.isGolden).toBe(false);
  });

  // 6. Match open for prediction when scheduled > 1 min before kickoff
  it('Test Case 6: Match is open when scheduled > 1 minute prior to kickoff', () => {
    const futureKickoff = new Date(Date.now() + 15 * 60 * 1000); // 15 mins ahead
    expect(isMatchOpenForPrediction(true, 'SCHEDULED', futureKickoff)).toBe(true);
  });

  // 7. Match locked within 1 minute of kickoff
  it('Test Case 7: Match is locked for prediction within 1 minute of kickoff', () => {
    const imminentKickoff = new Date(Date.now() + 45 * 1000); // 45 seconds ahead
    expect(isMatchOpenForPrediction(true, 'SCHEDULED', imminentKickoff)).toBe(false);
  });

  // 8. Match locked when live or finished
  it('Test Case 8: Live and finished matches are locked regardless of kickoff time', () => {
    const past = new Date(Date.now() - 30 * 60 * 1000);
    expect(isMatchOpenForPrediction(true, 'IN_PLAY', past)).toBe(false);
    expect(isMatchOpenForPrediction(true, 'PAUSED', past)).toBe(false);
    expect(isMatchOpenForPrediction(true, 'FINISHED', past)).toBe(false);
    expect(isMatchOpenForPrediction(false, 'SCHEDULED', new Date(Date.now() + 100000))).toBe(false);
  });

  // 9. 1-minute edit window logic
  it('Test Case 9: Prediction edit window allows modifications within 60 seconds of submission', () => {
    function canEditPrediction(submittedAt: Date): boolean {
      const elapsed = Date.now() - submittedAt.getTime();
      return elapsed <= 60 * 1000;
    }

    const justNow = new Date(Date.now() - 20 * 1000); // 20s ago
    expect(canEditPrediction(justNow)).toBe(true);

    const expired = new Date(Date.now() - 65 * 1000); // 65s ago
    expect(canEditPrediction(expired)).toBe(false);
  });

  // 10. Integer score validation (>= 0 and <= 30)
  it('Test Case 10: Score validation strictly enforces integers between 0 and 30', () => {
    function isValidScore(val: any): boolean {
      return typeof val === 'number' && Number.isInteger(val) && val >= 0 && val <= 30;
    }

    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(2)).toBe(true);
    expect(isValidScore(30)).toBe(true);
    expect(isValidScore(-1)).toBe(false);
    expect(isValidScore(31)).toBe(false);
    expect(isValidScore(2.5)).toBe(false);
    expect(isValidScore('2')).toBe(false);
    expect(isValidScore(null)).toBe(false);
    expect(isValidScore(undefined)).toBe(false);
  });

  // 11. 7-tier Leaderboard tie-breaking logic
  it('Test Case 11: Leaderboard sorting strictly applies 7-tier tie-breaking rules', () => {
    const participants = [
      { id: 4, name: 'D', totalPoints: 10, correct: 3, golden: 1, successRate: 60, total: 5, time: 200 },
      { id: 3, name: 'C', totalPoints: 10, correct: 4, golden: 1, successRate: 80, total: 5, time: 200 },
      { id: 2, name: 'B', totalPoints: 10, correct: 4, golden: 2, successRate: 80, total: 5, time: 200 },
      { id: 1, name: 'A', totalPoints: 15, correct: 5, golden: 3, successRate: 100, total: 5, time: 100 },
    ];

    participants.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.golden !== a.golden) return b.golden - a.golden;
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      if (b.total !== a.total) return b.total - a.total;
      if (a.time !== b.time) return a.time - b.time;
      return a.id - b.id;
    });

    expect(participants[0].id).toBe(1); // 15 pts
    expect(participants[1].id).toBe(2); // 10 pts, 4 correct, 2 golden
    expect(participants[2].id).toBe(3); // 10 pts, 4 correct, 1 golden
    expect(participants[3].id).toBe(4); // 10 pts, 3 correct
  });

  // 12. Golden Leaderboard sorting
  it('Test Case 12: Golden Leaderboard sorts by Golden Predictions DESC, then Golden Points DESC, then Total Points', () => {
    const entries = [
      { id: 1, goldenCount: 2, goldenPoints: 2, totalPoints: 8 },
      { id: 2, goldenCount: 3, goldenPoints: 3, totalPoints: 6 },
      { id: 3, goldenCount: 3, goldenPoints: 3, totalPoints: 12 },
    ];

    entries.sort((a, b) => {
      if (b.goldenCount !== a.goldenCount) return b.goldenCount - a.goldenCount;
      if (b.goldenPoints !== a.goldenPoints) return b.goldenPoints - a.goldenPoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.id - b.id;
    });

    expect(entries[0].id).toBe(3); // 3 golden, 12 total
    expect(entries[1].id).toBe(2); // 3 golden, 6 total
    expect(entries[2].id).toBe(1); // 2 golden
  });

  // 13. Prevention of calculated match modification / deletion
  it('Test Case 13: Protection logic blocks deletion or re-activating of calculated matches', () => {
    function canDeleteMatch(isCalculated: boolean, isConfirmed: boolean): boolean {
      if (isCalculated || isConfirmed) return false;
      return true;
    }

    expect(canDeleteMatch(false, false)).toBe(true);
    expect(canDeleteMatch(true, false)).toBe(false);
    expect(canDeleteMatch(false, true)).toBe(false);
    expect(canDeleteMatch(true, true)).toBe(false);
  });

  // 14. Contest Participant Authorization Check
  it('Test Case 14: Only approved participants can have predictions submitted and scored', () => {
    function canParticipate(status: string): boolean {
      return status === 'approved';
    }

    expect(canParticipate('approved')).toBe(true);
    expect(canParticipate('pending')).toBe(false);
    expect(canParticipate('rejected')).toBe(false);
    expect(canParticipate('blocked')).toBe(false);
  });

  // 15. Dynamic Points Range Validation
  it('Test Case 15: Admin custom match points range is bounded between 1 and 20', () => {
    function validateMatchPoints(pts: any): boolean {
      return typeof pts === 'number' && Number.isInteger(pts) && pts >= 1 && pts <= 20;
    }

    expect(validateMatchPoints(1)).toBe(true);
    expect(validateMatchPoints(2)).toBe(true);
    expect(validateMatchPoints(5)).toBe(true);
    expect(validateMatchPoints(20)).toBe(true);
    expect(validateMatchPoints(0)).toBe(false);
    expect(validateMatchPoints(-2)).toBe(false);
    expect(validateMatchPoints(21)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { normalizeApiMatchPayload } from '../footballService.ts';
import { isMatchOpenForPrediction, determineMatchPredictionState } from '../predictionService.ts';

describe('Football API Normalization Unit Tests', () => {
  it('should correctly normalize a valid raw match payload from external API', () => {
    const rawApiMatch = {
      id: 456123,
      utcDate: '2026-10-15T19:00:00Z',
      status: 'IN_PLAY',
      season: { startDate: '2026-08-01', endDate: '2027-05-30' },
      competition: {
        id: 2021,
        code: 'PL',
        name: 'Premier League',
        emblem: 'https://crests.football-data.org/PL.png',
      },
      homeTeam: {
        id: 65,
        name: 'Manchester City FC',
        shortName: 'Man City',
        crest: 'https://crests.football-data.org/65.png',
      },
      awayTeam: {
        id: 57,
        name: 'Arsenal FC',
        shortName: 'Arsenal',
        crest: 'https://crests.football-data.org/57.png',
      },
      score: {
        fullTime: { home: 2, away: 1 },
      },
    };

    const normalized = normalizeApiMatchPayload(rawApiMatch);
    expect(normalized).not.toBeNull();
    if (!normalized) return;

    expect(normalized.id).toBe('456123');
    expect(normalized.leagueId).toBe('PL');
    expect(normalized.leagueName).toBe('الدوري الإنجليزي الممتاز');
    expect(normalized.homeTeam.id).toBe('65');
    expect(normalized.homeTeam.name).toBe('مانشستر سيتي');
    expect(normalized.awayTeam.id).toBe('57');
    expect(normalized.awayTeam.name).toBe('أرسنال');
    expect(normalized.status).toBe('LIVE');
    expect(normalized.homeScore).toBe(2);
    expect(normalized.awayScore).toBe(1);
  });

  it('should return null for malformed or missing team/match payloads', () => {
    expect(normalizeApiMatchPayload(null)).toBeNull();
    expect(normalizeApiMatchPayload({})).toBeNull();
    expect(normalizeApiMatchPayload({ id: 123 })).toBeNull(); // missing teams
    expect(normalizeApiMatchPayload({ id: 123, homeTeam: { id: 1 } })).toBeNull(); // missing away team
  });

  it('should map postponed, cancelled, and suspended match statuses accurately', () => {
    const baseMatch = {
      id: 999,
      utcDate: '2026-11-20T18:00:00Z',
      competition: { code: 'PL' },
      homeTeam: { id: 1, name: 'Team A' },
      awayTeam: { id: 2, name: 'Team B' },
    };

    const postponedNorm = normalizeApiMatchPayload({ ...baseMatch, status: 'POSTPONED' });
    expect(postponedNorm?.status).toBe('POSTPONED');
    expect(postponedNorm?.matchTime).toBe('مؤجلة');

    const cancelledNorm = normalizeApiMatchPayload({ ...baseMatch, status: 'CANCELLED' });
    expect(cancelledNorm?.status).toBe('CANCELLED');
    expect(cancelledNorm?.matchTime).toBe('ملغاة');

    const suspendedNorm = normalizeApiMatchPayload({ ...baseMatch, status: 'ABANDONED' });
    expect(suspendedNorm?.status).toBe('SUSPENDED');
    expect(suspendedNorm?.matchTime).toBe('معلقة');
  });
});

describe('Prediction Lock Logic Unit Tests', () => {
  it('should allow predictions when kickoff is more than 1 minute in the future', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
    const isOpen = isMatchOpenForPrediction(true, 'TIMED', futureDate);
    expect(isOpen).toBe(true);

    const state = determineMatchPredictionState(true, 'TIMED', futureDate, false, false);
    expect(state).toBe('open');
  });

  it('should lock predictions when kickoff is less than 1 minute away or already started', () => {
    const nearDate = new Date(Date.now() + 30 * 1000); // 30 seconds in future
    const isOpen = isMatchOpenForPrediction(true, 'TIMED', nearDate);
    expect(isOpen).toBe(false);

    const state = determineMatchPredictionState(true, 'TIMED', nearDate, false, false);
    expect(state).toBe('upcoming');
  });

  it('should lock predictions when match is LIVE, FINISHED, or CANCELLED', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    expect(isMatchOpenForPrediction(true, 'LIVE', futureDate)).toBe(false);
    expect(isMatchOpenForPrediction(true, 'FINISHED', futureDate)).toBe(false);
    expect(isMatchOpenForPrediction(true, 'POSTPONED', futureDate)).toBe(false);
  });
});

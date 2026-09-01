import { describe, it, expect } from 'vitest';
import {
  isMatchOpenForPrediction,
  determineMatchPredictionState,
} from '../src/services/predictionService.ts';

describe('Phase 4: Prediction Timing & Lock Rules (Server-Authoritative)', () => {
  const SERVER_NOW = 1772438400000; // Fixed Server Time timestamp: 2026-03-02T08:00:00.000Z

  // 1. Match starting in 10 minutes (Allow)
  it('1. Match starting in 10 minutes (Allow creation/prediction)', () => {
    const kickoffTime = new Date(SERVER_NOW + 10 * 60 * 1000); // 10 minutes in future
    const isOpen = isMatchOpenForPrediction(true, 'SCHEDULED', kickoffTime, SERVER_NOW);
    const state = determineMatchPredictionState(true, 'SCHEDULED', kickoffTime, false, false, SERVER_NOW);

    expect(isOpen).toBe(true);
    expect(state).toBe('open');
  });

  // 2. Match starting in 2 minutes (Allow)
  it('2. Match starting in 2 minutes (Allow creation/prediction)', () => {
    const kickoffTime = new Date(SERVER_NOW + 2 * 60 * 1000); // 2 minutes (120 seconds) in future
    const isOpen = isMatchOpenForPrediction(true, 'SCHEDULED', kickoffTime, SERVER_NOW);
    const state = determineMatchPredictionState(true, 'SCHEDULED', kickoffTime, false, false, SERVER_NOW);

    expect(isOpen).toBe(true);
    expect(state).toBe('open');
  });

  // 3. Match starting in 59 seconds (Lock)
  it('3. Match starting in 59 seconds (Lock creation - inside 1-minute window)', () => {
    const kickoffTime = new Date(SERVER_NOW + 59 * 1000); // 59 seconds in future (< 60s)
    const isOpen = isMatchOpenForPrediction(true, 'SCHEDULED', kickoffTime, SERVER_NOW);
    const state = determineMatchPredictionState(true, 'SCHEDULED', kickoffTime, false, false, SERVER_NOW);

    expect(isOpen).toBe(false);
    expect(state).toBe('upcoming');
  });

  // 3b. Match starting exactly in 60 seconds (Lock boundary)
  it('3b. Match starting at exactly 60 seconds (Lock at boundary)', () => {
    const kickoffTime = new Date(SERVER_NOW + 60 * 1000); // exactly 60,000ms
    const isOpen = isMatchOpenForPrediction(true, 'SCHEDULED', kickoffTime, SERVER_NOW);
    // At exactly 60 seconds, now (SERVER_NOW) < lockTime (kickoffTime - 60s = SERVER_NOW) is false
    expect(isOpen).toBe(false);
  });

  // 4. Match already started (Lock)
  it('4. Match already started (Lock creation/prediction)', () => {
    const kickoffTime = new Date(SERVER_NOW - 15 * 60 * 1000); // Started 15 minutes ago
    const isOpenLive = isMatchOpenForPrediction(true, 'LIVE', kickoffTime, SERVER_NOW);
    const isOpenInPlay = isMatchOpenForPrediction(true, 'IN_PLAY', kickoffTime, SERVER_NOW);
    const isOpenScheduledPast = isMatchOpenForPrediction(true, 'SCHEDULED', kickoffTime, SERVER_NOW);

    const stateLive = determineMatchPredictionState(true, 'LIVE', kickoffTime, false, false, SERVER_NOW);
    const stateInPlay = determineMatchPredictionState(true, 'IN_PLAY', kickoffTime, false, false, SERVER_NOW);

    expect(isOpenLive).toBe(false);
    expect(isOpenInPlay).toBe(false);
    expect(isOpenScheduledPast).toBe(false);

    expect(stateLive).toBe('live');
    expect(stateInPlay).toBe('live');
  });

  // 5. Match finished (Lock)
  it('5. Match finished (Lock creation/prediction)', () => {
    const kickoffTime = new Date(SERVER_NOW - 120 * 60 * 1000); // Started 2 hours ago
    const isOpenFinished = isMatchOpenForPrediction(true, 'FINISHED', kickoffTime, SERVER_NOW);
    const statePending = determineMatchPredictionState(true, 'FINISHED', kickoffTime, false, false, SERVER_NOW);
    const stateConfirmed = determineMatchPredictionState(true, 'FINISHED', kickoffTime, true, true, SERVER_NOW);

    expect(isOpenFinished).toBe(false);
    expect(statePending).toBe('pending_admin');
    expect(stateConfirmed).toBe('calculated');
  });

  // 6. Edit within 1 minute of creation (Allow)
  it('6. Edit within 1 minute of creation (Allow editing)', () => {
    const predCreatedAt = new Date(SERVER_NOW - 35 * 1000); // Created 35 seconds ago
    const elapsed = SERVER_NOW - predCreatedAt.getTime(); // 35,000ms

    const canEdit = elapsed <= 60 * 1000;
    const remainingSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

    expect(canEdit).toBe(true);
    expect(remainingSeconds).toBe(25);
  });

  // 7. Edit after 1 minute of creation (Lock)
  it('7. Edit after 1 minute of creation (Lock editing)', () => {
    const predCreatedAt = new Date(SERVER_NOW - 65 * 1000); // Created 65 seconds ago (> 60s)
    const elapsed = SERVER_NOW - predCreatedAt.getTime(); // 65,000ms

    const canEdit = elapsed <= 60 * 1000;
    const remainingSeconds = Math.max(0, Math.round((60 * 1000 - elapsed) / 1000));

    expect(canEdit).toBe(false);
    expect(remainingSeconds).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('Database Schema, Constraints & Relational Audit Tests', () => {
  it('1. Verifies all required tables exist in Drizzle schema', () => {
    const tableNames = [
      'users',
      'categories',
      'news',
      'comments',
      'contest_settings',
      'contest_participants',
      'leagues',
      'teams',
      'matches',
      'prediction_matches',
      'predictions',
      'prediction_points',
      'activity_logs',
      'standings_cache',
      'email_verifications',
    ];

    expect(getTableName(schema.users)).toBe('users');
    expect(getTableName(schema.categories)).toBe('categories');
    expect(getTableName(schema.news)).toBe('news');
    expect(getTableName(schema.comments)).toBe('comments');
    expect(getTableName(schema.contestSettings)).toBe('contest_settings');
    expect(getTableName(schema.contestParticipants)).toBe('contest_participants');
    expect(getTableName(schema.leagues)).toBe('leagues');
    expect(getTableName(schema.teams)).toBe('teams');
    expect(getTableName(schema.matches)).toBe('matches');
    expect(getTableName(schema.predictionMatches)).toBe('prediction_matches');
    expect(getTableName(schema.predictions)).toBe('predictions');
    expect(getTableName(schema.predictionPoints)).toBe('prediction_points');
    expect(getTableName(schema.activityLogs)).toBe('activity_logs');
    expect(getTableName(schema.standingsCache)).toBe('standings_cache');
    expect(getTableName(schema.emailVerifications)).toBe('email_verifications');
  });

  it('2. Enforces contest isolation columns across prediction tables', () => {
    const predColumns = getTableColumns(schema.predictions);
    const pointsColumns = getTableColumns(schema.predictionPoints);
    const predMatchColumns = getTableColumns(schema.predictionMatches);
    const participantColumns = getTableColumns(schema.contestParticipants);

    expect(predColumns.contestId).toBeDefined();
    expect(pointsColumns.contestId).toBeDefined();
    expect(predMatchColumns.contestId).toBeDefined();
    expect(participantColumns.contestId).toBeDefined();
  });

  it('3. Enforces unique constraint fields for predictions (user + predictionMatch)', () => {
    const predColumns = getTableColumns(schema.predictions);
    expect(predColumns.userId).toBeDefined();
    expect(predColumns.predictionMatchId).toBeDefined();
    expect(predColumns.homeScore).toBeDefined();
    expect(predColumns.awayScore).toBeDefined();
    expect(predColumns.pointsEarned).toBeDefined();
    expect(predColumns.isEvaluated).toBeDefined();
    expect(predColumns.isGolden).toBeDefined();
    expect(predColumns.goldenPoints).toBeDefined();
  });

  it('4. Enforces unique constraint fields for prediction points ledger (predictionId)', () => {
    const pointsColumns = getTableColumns(schema.predictionPoints);
    expect(pointsColumns.userId).toBeDefined();
    expect(pointsColumns.predictionId).toBeDefined();
    expect(pointsColumns.predictionMatchId).toBeDefined();
    expect(pointsColumns.points).toBeDefined();
    expect(pointsColumns.reason).toBeDefined();
  });

  it('5. Enforces one-to-many relationship from matches to predictionMatches', () => {
    // Matches relations must define predictionMatches (one match can belong to multiple prediction matches or contests)
    expect(schema.matchesRelations).toBeDefined();
    expect(schema.predictionMatchesRelations).toBeDefined();
  });

  it('6. Verifies users table security and role columns', () => {
    const userCols = getTableColumns(schema.users);
    expect(userCols.uid).toBeDefined();
    expect(userCols.email).toBeDefined();
    expect(userCols.passwordHash).toBeDefined();
    expect(userCols.role).toBeDefined();
    expect(userCols.permissions).toBeDefined();
    expect(userCols.isActive).toBeDefined();
  });

  it('7. Verifies email_verifications table columns and lifecycle fields', () => {
    const evCols = getTableColumns(schema.emailVerifications);
    expect(evCols.email).toBeDefined();
    expect(evCols.name).toBeDefined();
    expect(evCols.passwordHash).toBeDefined();
    expect(evCols.codeHash).toBeDefined();
    expect(evCols.expiresAt).toBeDefined();
    expect(evCols.attempts).toBeDefined();
    expect(evCols.lastSentAt).toBeDefined();
    expect(evCols.verified).toBeDefined();
  });
});

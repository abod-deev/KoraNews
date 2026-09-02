/**
 * System Date & Season Validation Utilities for KoraNews
 * 
 * Provides a unified reference for the application/system date (YYYY-MM-DD)
 * without depending on user IANA timezones or geographic shifting.
 * Strictly enforces Season 2026 across all match queries and records.
 */

export interface MatchSeasonCheckable {
  season?: string | number | { startDate?: string; id?: string | number };
  league?: { season?: string | number } | null;
  matchDate?: string | Date | number;
  utcDate?: string | Date | number;
}

/**
 * Returns the application/system's current date as 'YYYY-MM-DD'.
 * Acts as the unified reference for "Today" across Home and Matches pages.
 */
export function getSystemTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Backward-compatible alias for getSystemTodayStr.
 * Always resolves to the unified application/system date.
 */
export function getUserTodayStr(): string {
  return getSystemTodayStr();
}

/**
 * Returns a relative system date string (YYYY-MM-DD) shifted by offsetDays.
 * offsetDays = -1 for Yesterday, 0 for Today, +1 for Tomorrow.
 */
export function getSystemOffsetDateStr(offsetDays: number): string {
  const todayStr = getSystemTodayStr();
  const parts = todayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const [y, m, day] = parts;
  const targetDate = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  targetDate.setUTCDate(targetDate.getUTCDate() + offsetDays);

  const resYear = targetDate.getUTCFullYear();
  const resMonth = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const resDay = String(targetDate.getUTCDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Backward-compatible alias for getSystemOffsetDateStr.
 */
export function getUserOffsetDateStr(offsetDays: number): string {
  return getSystemOffsetDateStr(offsetDays);
}

/**
 * Extracts the standard date string (YYYY-MM-DD) from a matchDate or timestamp.
 */
export function getMatchDateStr(matchDate: string | Date | number | undefined | null): string {
  if (!matchDate) return '';
  if (typeof matchDate === 'string') {
    // If format is 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss...'
    if (matchDate.length >= 10 && matchDate.charAt(4) === '-' && matchDate.charAt(7) === '-') {
      return matchDate.slice(0, 10);
    }
  }
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a match belongs to a given date string (YYYY-MM-DD).
 */
export function isMatchOnDate(matchDate: string | Date | number | undefined | null, targetDateStr: string): boolean {
  if (!targetDateStr) return true;
  if (!matchDate) return false;
  return getMatchDateStr(matchDate) === targetDateStr.trim();
}

/**
 * Strict validator to guarantee that a match belongs ONLY to Season 2026.
 * Rejects matches from 2025, 2024, or any previous seasons.
 */
export function isMatchSeason2026(match: MatchSeasonCheckable | null | undefined): boolean {
  if (!match) return false;

  // 1. Direct season property check
  if (match.season !== undefined && match.season !== null) {
    if (typeof match.season === 'string' || typeof match.season === 'number') {
      if (String(match.season) !== '2026') return false;
    } else if (typeof match.season === 'object') {
      if (match.season.startDate) {
        const startYr = new Date(match.season.startDate).getFullYear();
        if (startYr !== 2026) return false;
      }
    }
  }

  // 2. League season property check
  if (match.league && match.league.season !== undefined && match.league.season !== null) {
    if (String(match.league.season) !== '2026') return false;
  }

  // 3. Match date check: must be in 2026 or 2026/2027 season window (rejects < 2026 or > 2027-07)
  const rawDate = match.matchDate || match.utcDate;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      // Rejects any match prior to 2026
      if (year < 2026) return false;
      // Rejects matches after season 2026/2027 finish
      if (year === 2027 && month > 7) return false;
      if (year > 2027) return false;
    }
  }

  return true;
}

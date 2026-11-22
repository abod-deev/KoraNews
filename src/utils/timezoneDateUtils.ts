/**
 * System Date & Season Validation Utilities for KoraNews
 * 
 * Provides a unified reference for Mecca Time (Asia/Riyadh / توقيت مكة المكرمة - UTC+3)
 * across the application, ensuring match creation, editing, filtering, and display
 * are accurately synchronized with Mecca Time without accidental timezone shifting.
 * Strictly enforces Season 2026 across all match queries and records.
 */

export const MECCA_TIMEZONE = 'Asia/Riyadh';

export interface MatchSeasonCheckable {
  season?: string | number | { startDate?: string; id?: string | number };
  league?: { season?: string | number } | null;
  matchDate?: string | Date | number;
  utcDate?: string | Date | number;
}

/**
 * Returns the current date in Mecca Time (Asia/Riyadh) as 'YYYY-MM-DD'.
 * Acts as the unified reference for "Today" across Home and Matches pages.
 */
export function getMeccaTodayStr(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MECCA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns the application/system's current date as 'YYYY-MM-DD' in Mecca Time.
 */
export function getSystemTodayStr(): string {
  return getMeccaTodayStr();
}

/**
 * Backward-compatible alias for getSystemTodayStr.
 * Always resolves to the unified Mecca Time date.
 */
export function getUserTodayStr(): string {
  return getMeccaTodayStr();
}

/**
 * Returns a relative system date string (YYYY-MM-DD) shifted by offsetDays in Mecca Time.
 * offsetDays = -1 for Yesterday, 0 for Today, +1 for Tomorrow.
 */
export function getMeccaOffsetDateStr(offsetDays: number): string {
  const todayStr = getMeccaTodayStr();
  const parts = todayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: MECCA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  }

  const [y, m, day] = parts;
  const targetDate = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  targetDate.setUTCDate(targetDate.getUTCDate() + offsetDays);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MECCA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(targetDate);
}

/**
 * Backward-compatible alias for getMeccaOffsetDateStr.
 */
export function getSystemOffsetDateStr(offsetDays: number): string {
  return getMeccaOffsetDateStr(offsetDays);
}

/**
 * Backward-compatible alias for getSystemOffsetDateStr.
 */
export function getUserOffsetDateStr(offsetDays: number): string {
  return getMeccaOffsetDateStr(offsetDays);
}

/**
 * Extracts the standard date string (YYYY-MM-DD) in Mecca Time (Asia/Riyadh) from a matchDate or timestamp.
 */
export function getMatchDateStr(matchDate: string | Date | number | undefined | null): string {
  if (!matchDate) return '';
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) {
    if (typeof matchDate === 'string' && matchDate.length >= 10 && matchDate.charAt(4) === '-' && matchDate.charAt(7) === '-') {
      return matchDate.slice(0, 10);
    }
    return '';
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MECCA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Alias for getMatchDateStr in Mecca timezone.
 */
export function getMeccaDateStr(matchDate: string | Date | number | undefined | null): string {
  return getMatchDateStr(matchDate);
}

/**
 * Checks if a match belongs to a given date string (YYYY-MM-DD) in Mecca Time.
 */
export function isMatchOnDate(matchDate: string | Date | number | undefined | null, targetDateStr: string): boolean {
  if (!targetDateStr) return true;
  if (!matchDate) return false;
  return getMatchDateStr(matchDate) === targetDateStr.trim();
}

/**
 * Formats time in Mecca Timezone (Asia/Riyadh, UTC+3) in Arabic (e.g. "11:00 م" or "02:30 ص").
 */
export function formatMeccaTime(
  date: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true }
): string {
  if (!date) return '00:00';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '00:00';
  return d.toLocaleTimeString('ar-SA', {
    ...options,
    timeZone: MECCA_TIMEZONE,
  });
}

/**
 * Formats 24-hour time in Mecca Timezone (Asia/Riyadh, UTC+3) (e.g. "23:00").
 */
export function formatMeccaTime24(date: string | Date | number | null | undefined): string {
  if (!date) return '00:00';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '00:00';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MECCA_TIMEZONE,
  });
}

/**
 * Formats date in Mecca Timezone (Asia/Riyadh) in Arabic (e.g. "21 سبتمبر 2026").
 */
export function formatMeccaDate(
  date: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-SA', {
    ...options,
    timeZone: MECCA_TIMEZONE,
  });
}

/**
 * Formats combined date and time in Mecca Timezone in Arabic (e.g. "21 سبتمبر 2026 • 11:00 م (توقيت مكة)").
 */
export function formatMeccaDateTime(
  date: string | Date | number | null | undefined,
  includeTimezoneLabel: boolean = false
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const dateStr = formatMeccaDate(d, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = formatMeccaTime(d, { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} • ${timeStr}${includeTimezoneLabel ? ' (توقيت مكة)' : ''}`;
}

/**
 * Formats a Date into a string compatible with <input type="datetime-local" /> in Mecca Time (YYYY-MM-DDTHH:mm).
 */
export function getMeccaDateTimeLocalStr(date?: Date | string | number | null): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MECCA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  // Handle case where some engines return "24" for midnight
  if (hour === '24') hour = '00';
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Parses user input from <input type="datetime-local" /> as explicit Mecca Time (UTC+3) into a standard Date object.
 * e.g., "2026-09-21T23:00" -> Date representing 2026-09-21 23:00:00+03:00 (which is 2026-09-21 20:00:00 UTC).
 */
export function parseMeccaDateTimeInput(inputStr: string | Date | number | null | undefined): Date {
  if (!inputStr) return new Date();
  if (inputStr instanceof Date) return inputStr;
  if (typeof inputStr === 'number') return new Date(inputStr);

  const trimmed = String(inputStr).trim();
  if (!trimmed) return new Date();

  // If format is YYYY-MM-DDTHH:mm:ss without timezone offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}+03:00`);
  }

  // If format is YYYY-MM-DDTHH:mm without seconds or timezone offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}:00+03:00`);
  }

  // If format is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00+03:00`);
  }

  return new Date(trimmed);
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

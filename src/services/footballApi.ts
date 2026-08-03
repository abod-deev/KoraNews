import { fetchLiveMatches, fetchUpcomingMatches } from './footballService.ts';

export { fetchLiveMatches, fetchUpcomingMatches };

const BASE_URL = 'https://api.football-data.org/v4';
const DEFAULT_TIMEOUT_MS = 10000;

// Rate limiter state in-memory to respect football-data.org 10 requests / minute limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 6000; // 6 seconds between requests = max 10 requests / minute

/**
 * Gets the Football API Key from environment variables with safe fallback.
 */
export function getApiKey(): string {
  return process.env.FOOTBALL_API_KEY || '56b299425e7a45db8f57817ab1a45009';
}

/**
 * Custom error class for API Rate Limit errors (HTTP 429).
 */
export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Low-level robust fetch wrapper for football-data.org API.
 * Handles rate limits, network timeouts, status codes, and JSON parsing.
 */
export async function fetchFromFootballData<T = any>(
  endpoint: string,
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1 } = options;
  const apiKey = getApiKey();

  // Throttling to prevent exceeding rate limit
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - timeSinceLast;
    console.log(`[footballApi] Rate limiting pause for ${delay}ms before calling ${endpoint}...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
      console.warn(`[footballApi] Rate limit hit (429). Retry after ${retryAfter} seconds.`);
      throw new RateLimitError(`Rate limit exceeded for football-data.org API. Retry after ${retryAfter}s`, retryAfter);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Football API Error HTTP ${response.status} (${response.statusText}): ${errorText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error(`[footballApi] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      throw new Error(`Football API request timed out after ${timeoutMs}ms`);
    }

    // Retry logic for transient errors (not rate limits)
    if (retries > 0 && !(error instanceof RateLimitError)) {
      console.warn(`[footballApi] Retrying request to ${endpoint} (${retries} retries left)...`);
      await new Promise((res) => setTimeout(res, 2000));
      return fetchFromFootballData<T>(endpoint, { timeoutMs, retries: retries - 1 });
    }

    console.error(`[footballApi] Error fetching endpoint ${endpoint}:`, error.message || error);
    throw error;
  }
}

/**
 * Fetch matches directly from API with status filtering.
 */
export async function apiFetchLiveMatches() {
  return fetchFromFootballData('/matches?status=IN_PLAY,PAUSED');
}

/**
 * Fetch matches for date range from API.
 */
export async function apiFetchUpcomingMatches(dateFrom: string, dateTo: string) {
  return fetchFromFootballData(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
}

/**
 * Fetch competitions from API.
 */
export async function apiFetchCompetitions() {
  return fetchFromFootballData('/competitions');
}

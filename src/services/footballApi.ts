import { fetchLiveMatches, fetchUpcomingMatches } from './footballService.ts';

export { fetchLiveMatches, fetchUpcomingMatches };

const BASE_URL = 'https://api.football-data.org/v4';
const DEFAULT_TIMEOUT_MS = 25000;

// Rate limiter state in-memory to respect football-data.org 10 requests / minute limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 6000; // 6 seconds between requests = max 10 requests / minute

/**
 * Gets the Football API Key from environment variables securely.
 */
export function getApiKey(): string {
  const key = process.env.FOOTBALL_API_KEY || '';
  if (!key) {
    // When API key is not configured, system safely serves pre-stored database fixtures & cached matches
    return '';
  }
  return key;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
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

// In-memory response cache to respect football-data.org free tier limits (10 req/min)
const cache = new Map<string, { timestamp: number; data: any }>();

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes('/standings')) return 30 * 60 * 1000; // 30 mins
  if (endpoint.includes('/matches')) return 10 * 60 * 1000;   // 10 mins
  return 15 * 60 * 1000; // 15 mins default
}

/**
 * Low-level robust fetch wrapper for football-data.org API.
 * Handles rate limits, network timeouts, status codes, in-memory caching, and fallback data.
 */
export async function fetchFromFootballData<T = any>(
  endpoint: string,
  options: { timeoutMs?: number; retries?: number; ignoreCache?: boolean } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, ignoreCache = false } = options;
  const apiKey = getApiKey();

  // Check cache first
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  const ttl = getCacheTTL(endpoint);

  if (!ignoreCache && cached && (Date.now() - cached.timestamp < ttl)) {
    console.log(`[footballApi] Serving cached data for ${endpoint}`);
    return cached.data as T;
  }

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
      console.warn(`[footballApi] Rate limit hit (429) for ${endpoint}. Retry after ${retryAfter}s.`);

      // If we have stale cached data, serve it gracefully
      if (cached) {
        console.log(`[footballApi] Returning stale cache for ${endpoint} due to rate limit.`);
        return cached.data as T;
      }
      throw new RateLimitError(`Rate limit exceeded for football-data.org API. Retry after ${retryAfter}s`, retryAfter);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (cached) {
        console.log(`[footballApi] Returning stale cache for ${endpoint} due to HTTP ${response.status}`);
        return cached.data as T;
      }
      if (response.status === 404) {
        throw new NotFoundError(`Endpoint ${endpoint} not found (404)`);
      }
      throw new Error(`Football API Error HTTP ${response.status} (${response.statusText}): ${errorText}`);
    }

    const data = await response.json();
    // Cache the successful response
    cache.set(cacheKey, { timestamp: Date.now(), data });
    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (cached) {
      console.log(`[footballApi] Returning stale cache for ${endpoint} due to error: ${error.message}`);
      return cached.data as T;
    }

    if (error.name === 'AbortError') {
      console.warn(`[footballApi] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      throw new Error(`Football API request timed out after ${timeoutMs}ms`);
    }

    // Retry logic for transient errors (not rate limits or 404s)
    if (retries > 0 && !(error instanceof RateLimitError) && !(error instanceof NotFoundError)) {
      console.warn(`[footballApi] Retrying request to ${endpoint} (${retries} retries left)...`);
      await new Promise((res) => setTimeout(res, 2000));
      return fetchFromFootballData<T>(endpoint, { timeoutMs, retries: retries - 1, ignoreCache });
    }

    if (error instanceof RateLimitError) {
      console.warn(`[footballApi] Rate limit active for ${endpoint}`);
    } else if (error instanceof NotFoundError) {
      console.log(`[footballApi] Resource not found for ${endpoint}`);
    } else {
      console.warn(`[footballApi] Error fetching endpoint ${endpoint}:`, error.message || error);
    }
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

/**
 * Fetch specific competition details by ID or code (e.g., 'PL', 'CL', 'PD').
 */
export async function apiFetchCompetition(idOrCode: string) {
  return fetchFromFootballData(`/competitions/${idOrCode}`);
}

/**
 * Fetch standings for a particular competition.
 */
export async function apiFetchStandings(competitionId: string, season?: string) {
  const query = season ? `?season=${season}` : '';
  return fetchFromFootballData(`/competitions/${competitionId}/standings${query}`);
}

/**
 * Fetch matches for a specific competition.
 */
export async function apiFetchCompetitionMatches(competitionId: string, filters: { dateFrom?: string; dateTo?: string; status?: string; matchday?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.status) params.append('status', filters.status);
  if (filters.matchday) params.append('matchday', filters.matchday);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return fetchFromFootballData(`/competitions/${competitionId}/matches${queryString}`);
}

/**
 * Fetch teams for a competition.
 */
export async function apiFetchCompetitionTeams(competitionId: string, season?: string) {
  const query = season ? `?season=${season}` : '';
  return fetchFromFootballData(`/competitions/${competitionId}/teams${query}`);
}

/**
 * Fetch top scorers for a competition.
 */
export async function apiFetchTopScorers(competitionId: string, limit: number = 10) {
  return fetchFromFootballData(`/competitions/${competitionId}/scorers?limit=${limit}`);
}

/**
 * Fetch a specific team by ID.
 */
export async function apiFetchTeam(teamId: string) {
  return fetchFromFootballData(`/teams/${teamId}`);
}

/**
 * Fetch matches for a specific team.
 */
export async function apiFetchTeamMatches(teamId: string, limit: number = 10) {
  return fetchFromFootballData(`/teams/${teamId}/matches?limit=${limit}`);
}

/**
 * Fetch a specific match by ID.
 */
export async function apiFetchMatch(matchId: string) {
  return fetchFromFootballData(`/matches/${matchId}`);
}

/**
 * Fetch Head-to-Head stats for a specific match.
 */
export async function apiFetchMatchHeadToHead(matchId: string) {
  return fetchFromFootballData(`/matches/${matchId}/head2head`);
}

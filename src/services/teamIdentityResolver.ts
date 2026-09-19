import { db } from '../db/index.ts';
import { teams } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  ALL_KNOWN_TEAMS,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  normalizeSportsName,
  isNationalTeam,
  type KnownTeam,
} from './knownTeamsAndLeagues.ts';
import { TEAM_AR_NAMES } from '../utils/teamTranslations.ts';

export type TeamMatchStatus = 'CONFIRMED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'GENERIC_PLACEHOLDER';

export interface CandidateTeam {
  name: string;
  country?: string;
  league?: string;
  apiTeamId: number;
}

export interface TeamResolutionResult {
  koraTeamId: string;
  koraTeamName: string;
  searchName: string;
  country: string | null;
  league: string | null;
  apiTeamId: number | null;
  apiResultName: string | null;
  matchStatus: TeamMatchStatus;
  candidates: CandidateTeam[];
  reason: string;
}

/**
 * Standard API-Football IDs for Canonical Saudi and Global Clubs
 */
const CANONICAL_API_FOOTBALL_MAP: Record<string, { apiTeamId: number; nameEn: string; country: string; league: string }> = {
  // === Saudi Pro League (Verified API-Football Club IDs from API-Sports) ===
  sa_ittihad: { apiTeamId: 2930, nameEn: 'Al-Ittihad FC', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_ahli: { apiTeamId: 2931, nameEn: 'Al-Ahli Saudi FC', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_hilal: { apiTeamId: 2932, nameEn: 'Al-Hilal Saudi FC', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_raed: { apiTeamId: 2933, nameEn: 'Al-Raed', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_fateh: { apiTeamId: 2934, nameEn: 'Al-Fateh', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_taawoun: { apiTeamId: 2935, nameEn: 'Al-Taawoun', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_shabab: { apiTeamId: 2936, nameEn: 'Al-Shabab', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_ettifaq: { apiTeamId: 2937, nameEn: 'Al-Ettifaq', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_fayha: { apiTeamId: 2938, nameEn: 'Al-Fayha', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_nassr: { apiTeamId: 2939, nameEn: 'Al-Nassr', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_qadsiah: { apiTeamId: 2940, nameEn: 'Al-Qadsiah', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_damac: { apiTeamId: 2941, nameEn: 'Damac', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_khaleej: { apiTeamId: 2942, nameEn: 'Al-Khaleej', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_riyadh: { apiTeamId: 2943, nameEn: 'Al-Riyadh', country: 'Saudi Arabia', league: 'Saudi Pro League' },
  sa_wehda: { apiTeamId: 2944, nameEn: 'Al-Wehda', country: 'Saudi Arabia', league: 'Saudi Pro League' },

  // === Arab Clubs (Disambiguated by country and official club identity) ===
  eg_zamalek: { apiTeamId: 1030, nameEn: 'Zamalek SC', country: 'Egypt', league: 'Egyptian Premier League' },
  eg_pyramids: { apiTeamId: 1031, nameEn: 'Pyramids FC', country: 'Egypt', league: 'Egyptian Premier League' },
  ae_ain: { apiTeamId: 1050, nameEn: 'Al Ain FC', country: 'UAE', league: 'UAE Pro League' },
  ae_jazira: { apiTeamId: 1051, nameEn: 'Al Jazira', country: 'UAE', league: 'UAE Pro League' },
  ae_shabab_ahli: { apiTeamId: 1052, nameEn: 'Shabab Al Ahli', country: 'UAE', league: 'UAE Pro League' },
  ae_wasl: { apiTeamId: 1053, nameEn: 'Al Wasl', country: 'UAE', league: 'UAE Pro League' },
  qa_sadd: { apiTeamId: 1060, nameEn: 'Al Sadd SC', country: 'Qatar', league: 'Qatar Stars League' },
  qa_duhail: { apiTeamId: 1061, nameEn: 'Al Duhail SC', country: 'Qatar', league: 'Qatar Stars League' },
  qa_rayyan: { apiTeamId: 1062, nameEn: 'Al Rayyan SC', country: 'Qatar', league: 'Qatar Stars League' },
  qa_gharafa: { apiTeamId: 1063, nameEn: 'Al Gharafa SC', country: 'Qatar', league: 'Qatar Stars League' },
  iq_shorta: { apiTeamId: 1070, nameEn: 'Al Shorta SC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_quwa: { apiTeamId: 1071, nameEn: 'Al Quwa Al Jawiya', country: 'Iraq', league: 'Iraq Stars League' },
  iq_zawraa: { apiTeamId: 1072, nameEn: 'Al Zawraa SC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_talaba: { apiTeamId: 1073, nameEn: 'Al Talaba SC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_zakho: { apiTeamId: 1074, nameEn: 'Zakho SC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_erbil: { apiTeamId: 1075, nameEn: 'Erbil SC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_najaf: { apiTeamId: 1076, nameEn: 'Al Najaf FC', country: 'Iraq', league: 'Iraq Stars League' },
  iq_mina: { apiTeamId: 1077, nameEn: 'Al Minaa SC', country: 'Iraq', league: 'Iraq Stars League' },
  ma_wydad: { apiTeamId: 1080, nameEn: 'Wydad AC', country: 'Morocco', league: 'Botola Pro' },
  ma_raja: { apiTeamId: 1081, nameEn: 'Raja CA', country: 'Morocco', league: 'Botola Pro' },
  ma_far: { apiTeamId: 1082, nameEn: 'AS FAR', country: 'Morocco', league: 'Botola Pro' },
  tn_taraji: { apiTeamId: 1090, nameEn: 'Esperance de Tunis', country: 'Tunisia', league: 'Ligue Professionnelle 1' },
  tn_club_africain: { apiTeamId: 1091, nameEn: 'Club Africain', country: 'Tunisia', league: 'Ligue Professionnelle 1' },
  tn_etoile: { apiTeamId: 1092, nameEn: 'Etoile du Sahel', country: 'Tunisia', league: 'Ligue Professionnelle 1' },
  tn_css: { apiTeamId: 1093, nameEn: 'CS Sfaxien', country: 'Tunisia', league: 'Ligue Professionnelle 1' },

  // === National Teams ===
  nt_ksa: { apiTeamId: 1530, nameEn: 'Saudi Arabia', country: 'Saudi Arabia', league: 'International / AFC' },
  nt_egy: { apiTeamId: 1520, nameEn: 'Egypt', country: 'Egypt', league: 'International / CAF' },
  nt_mar: { apiTeamId: 811, nameEn: 'Morocco', country: 'Morocco', league: 'International / CAF' },
  nt_dza: { apiTeamId: 1522, nameEn: 'Algeria', country: 'Algeria', league: 'International / CAF' },
  nt_tun: { apiTeamId: 1525, nameEn: 'Tunisia', country: 'Tunisia', league: 'International / CAF' },
  nt_irq: { apiTeamId: 1533, nameEn: 'Iraq', country: 'Iraq', league: 'International / AFC' },
  nt_jor: { apiTeamId: 1534, nameEn: 'Jordan', country: 'Jordan', league: 'International / AFC' },
  nt_uae: { apiTeamId: 1531, nameEn: 'United Arab Emirates', country: 'UAE', league: 'International / AFC' },
  nt_qat: { apiTeamId: 1532, nameEn: 'Qatar', country: 'Qatar', league: 'International / AFC' },
  nt_kwt: { apiTeamId: 1535, nameEn: 'Kuwait', country: 'Kuwait', league: 'International / AFC' },
  nt_bhr: { apiTeamId: 1536, nameEn: 'Bahrain', country: 'Bahrain', league: 'International / AFC' },
  nt_omn: { apiTeamId: 1537, nameEn: 'Oman', country: 'Oman', league: 'International / AFC' },
  nt_syr: { apiTeamId: 1538, nameEn: 'Syria', country: 'Syria', league: 'International / AFC' },
  nt_pse: { apiTeamId: 1539, nameEn: 'Palestine', country: 'Palestine', league: 'International / AFC' },
  nt_lbn: { apiTeamId: 1540, nameEn: 'Lebanon', country: 'Lebanon', league: 'International / AFC' },
  nt_yem: { apiTeamId: 1541, nameEn: 'Yemen', country: 'Yemen', league: 'International / AFC' },
  nt_sdn: { apiTeamId: 1542, nameEn: 'Sudan', country: 'Sudan', league: 'International / CAF' },
  nt_lby: { apiTeamId: 1543, nameEn: 'Libya', country: 'Libya', league: 'International / CAF' },
  nt_mrt: { apiTeamId: 1544, nameEn: 'Mauritania', country: 'Mauritania', league: 'International / CAF' },
  nt_esp: { apiTeamId: 760, nameEn: 'Spain', country: 'Spain', league: 'International / UEFA' },
  nt_deu: { apiTeamId: 759, nameEn: 'Germany', country: 'Germany', league: 'International / UEFA' },
  nt_arg: { apiTeamId: 762, nameEn: 'Argentina', country: 'Argentina', league: 'International / CONMEBOL' },
  nt_bra: { apiTeamId: 764, nameEn: 'Brazil', country: 'Brazil', league: 'International / CONMEBOL' },
  nt_prt: { apiTeamId: 765, nameEn: 'Portugal', country: 'Portugal', league: 'International / UEFA' },
  nt_eng: { apiTeamId: 770, nameEn: 'England', country: 'England', league: 'International / UEFA' },
  nt_fra: { apiTeamId: 773, nameEn: 'France', country: 'France', league: 'International / UEFA' },
  nt_ita: { apiTeamId: 784, nameEn: 'Italy', country: 'Italy', league: 'International / UEFA' },
  nt_nld: { apiTeamId: 674, nameEn: 'Netherlands', country: 'Netherlands', league: 'International / UEFA' },
  nt_hrv: { apiTeamId: 799, nameEn: 'Croatia', country: 'Croatia', league: 'International / UEFA' },
  nt_bel: { apiTeamId: 805, nameEn: 'Belgium', country: 'Belgium', league: 'International / UEFA' },
  nt_usa: { apiTeamId: 1500, nameEn: 'United States', country: 'USA', league: 'International / CONCACAF' },
  nt_sen: { apiTeamId: 1521, nameEn: 'Senegal', country: 'Senegal', league: 'International / CAF' },
  nt_jpn: { apiTeamId: 1510, nameEn: 'Japan', country: 'Japan', league: 'International / AFC' },
  nt_kor: { apiTeamId: 1511, nameEn: 'South Korea', country: 'South Korea', league: 'International / AFC' },
  nt_ury: { apiTeamId: 1502, nameEn: 'Uruguay', country: 'Uruguay', league: 'International / CONMEBOL' },

  // === Top European / Global Aliases ===
  '721b': { apiTeamId: 721, nameEn: 'RB Leipzig', country: 'Germany', league: 'Bundesliga' },
  '678b': { apiTeamId: 678, nameEn: 'AFC Ajax', country: 'Netherlands', league: 'Eredivisie' },
  '674b': { apiTeamId: 674, nameEn: 'Netherlands', country: 'Netherlands', league: 'International / UEFA' },
  ext_t1: { apiTeamId: 86, nameEn: 'Real Madrid CF', country: 'Spain', league: 'La Liga' },
  ext_t2: { apiTeamId: 81, nameEn: 'FC Barcelona', country: 'Spain', league: 'La Liga' },
  ext_t5: { apiTeamId: 65, nameEn: 'Manchester City FC', country: 'England', league: 'Premier League' },
  ext_t6: { apiTeamId: 64, nameEn: 'Liverpool FC', country: 'England', league: 'Premier League' },
  ext_t_juventus_mtwdup2s_5le3: { apiTeamId: 109, nameEn: 'Juventus FC', country: 'Italy', league: 'Serie A' },
  ext_t_napoli_mtwdup3c_opbc: { apiTeamId: 113, nameEn: 'SSC Napoli', country: 'Italy', league: 'Serie A' },
};

/**
 * List of known generic placeholders that should be marked as GENERIC_PLACEHOLDER
 */
const GENERIC_PLACEHOLDER_NAMES = new Set([
  'فريق',
  'فريق أ',
  'فريق ب',
  'فريق 1 أ',
  'فريق 1 ب',
  'فريق 2 أ',
  'فريق 2 ب',
  'فريق 3 أ',
  'فريق 3 ب',
  'فريق 4 أ',
  'فريق 4 ب',
  'فريق 5 أ',
  'فريق 5 ب',
  'فريق 6 أ',
  'فريق 6 ب',
  'team',
  'null',
]);

/**
 * Disambiguates common multi-club Arabic names based on country/league context.
 */
function disambiguateArabicName(
  normName: string,
  context: { country?: string; league?: string; id?: string }
): { apiTeamId: number; nameEn: string; country: string; league: string } | null {
  const isSaudi =
    context.country?.includes('سعودي') ||
    context.country?.toLowerCase().includes('saudi') ||
    context.league?.includes('روشن') ||
    context.league?.includes('يلو') ||
    context.league?.includes('سعودي') ||
    context.id?.startsWith('sa_');

  const isEgypt =
    context.country?.includes('مصر') ||
    context.country?.toLowerCase().includes('egypt') ||
    context.league?.includes('مصر') ||
    context.id?.startsWith('eg_');

  const isUAE =
    context.country?.includes('إمارات') ||
    context.country?.includes('امارات') ||
    context.country?.toLowerCase().includes('uae') ||
    context.id?.startsWith('ae_');

  const isQatar =
    context.country?.includes('قطر') ||
    context.country?.toLowerCase().includes('qatar') ||
    context.id?.startsWith('qa_');

  const isIraq =
    context.country?.includes('عراق') ||
    context.country?.toLowerCase().includes('iraq') ||
    context.id?.startsWith('iq_');

  const isTunisia =
    context.country?.includes('تونس') ||
    context.country?.toLowerCase().includes('tunis') ||
    context.id?.startsWith('tn_');

  const isMorocco =
    context.country?.includes('مغرب') ||
    context.country?.toLowerCase().includes('morocco') ||
    context.id?.startsWith('ma_');

  // 1. الاتحاد
  if (normName === 'الاتحاد' || normName === 'اتحاد') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_ittihad'];
    return null; // Ambiguous if context is missing (could be Ittihad Alexandria, Ittihad Tanger, Ittihad Kalba)
  }

  // 2. الأهلي
  if (normName === 'الاهلي' || normName === 'الاهلى') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_ahli'];
    if (isEgypt) return { apiTeamId: 1029, nameEn: 'Al Ahly SC', country: 'Egypt', league: 'Egyptian Premier League' };
    if (isUAE) return CANONICAL_API_FOOTBALL_MAP['ae_shabab_ahli'];
    return null; // Ambiguous if context is missing (Saudi Al-Ahli vs Egyptian Al Ahly vs Qatari Al-Ahli)
  }

  // 3. النصر
  if (normName === 'النصر' || normName === 'نصر') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_nassr'];
    if (isUAE) return { apiTeamId: 1054, nameEn: 'Al-Nasr Dubai', country: 'UAE', league: 'UAE Pro League' };
    return null; // Ambiguous if context is missing
  }

  // 4. الهلال
  if (normName === 'الهلال' || normName === 'هلال') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_hilal'];
    return null; // Ambiguous (Saudi Al-Hilal vs Sudanese Al-Hilal Omdurman)
  }

  // 5. الشباب
  if (normName === 'الشباب' || normName === 'شباب') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_shabab'];
    if (isUAE) return CANONICAL_API_FOOTBALL_MAP['ae_shabab_ahli'];
    return null;
  }

  // 6. الاتفاق
  if (normName === 'الاتفاق' || normName === 'اتفاق') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_ettifaq'];
    return null;
  }

  // 7. القادسية
  if (normName === 'القادسية' || normName === 'قادسية') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_qadsiah'];
    return null;
  }

  // 8. الوحدة
  if (normName === 'الوحدة' || normName === 'وحدة') {
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_wehda'];
    return null;
  }

  // 9. الترجي
  if (normName === 'الترجي' || normName === 'ترجي') {
    if (isTunisia) return CANONICAL_API_FOOTBALL_MAP['tn_taraji'];
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_taraji'];
    return null;
  }

  // 10. العين
  if (normName === 'العين' || normName === 'عين') {
    if (isUAE) return CANONICAL_API_FOOTBALL_MAP['ae_ain'];
    if (isSaudi) return CANONICAL_API_FOOTBALL_MAP['sa_ain'];
    return null;
  }

  return null;
}

/**
 * Resolves a KoraNews team identity against API-Football data model with context validation.
 */
export function resolveTeamIdentity(koraTeam: { id: string; name: string }): TeamResolutionResult {
  const rawId = koraTeam.id ? koraTeam.id.trim() : '';
  const rawName = koraTeam.name ? koraTeam.name.trim() : '';
  const normName = normalizeSportsName(rawName);

  // 0. Check Generic Placeholders
  if (
    !rawName ||
    rawName === 'null' ||
    rawId === 'null' ||
    GENERIC_PLACEHOLDER_NAMES.has(rawName.toLowerCase()) ||
    GENERIC_PLACEHOLDER_NAMES.has(normName) ||
    rawId.startsWith('T_FINAL_') ||
    rawId.startsWith('T_P3_')
  ) {
    return {
      koraTeamId: rawId,
      koraTeamName: rawName || 'Unknown',
      searchName: rawName,
      country: null,
      league: null,
      apiTeamId: null,
      apiResultName: null,
      matchStatus: 'GENERIC_PLACEHOLDER',
      candidates: [],
      reason: 'Generic tournament bracket placeholder or null identifier',
    };
  }

  // 1. Direct Canonical Map Check (Exact Kora ID Match)
  if (CANONICAL_API_FOOTBALL_MAP[rawId]) {
    const canonical = CANONICAL_API_FOOTBALL_MAP[rawId];
    return {
      koraTeamId: rawId,
      koraTeamName: rawName,
      searchName: canonical.nameEn,
      country: canonical.country,
      league: canonical.league,
      apiTeamId: canonical.apiTeamId,
      apiResultName: canonical.nameEn,
      matchStatus: 'CONFIRMED',
      candidates: [{ name: canonical.nameEn, country: canonical.country, league: canonical.league, apiTeamId: canonical.apiTeamId }],
      reason: `Exact canonical match for verified identifier [${rawId}]`,
    };
  }

  // 2. Numeric ID Match (e.g. Existing football-data / API-Football team numeric IDs like '86', '81', '64')
  if (/^\d+$/.test(rawId)) {
    const numId = parseInt(rawId, 10);
    // Find in translation or known catalogs
    let candidateName = rawName;
    let country: string | null = null;
    let league: string | null = null;

    // Search in known catalog
    const foundInCatalog = ALL_KNOWN_TEAMS.find(t => t.id === rawId || t.name === rawName || normalizeSportsName(t.name) === normName);
    if (foundInCatalog) {
      candidateName = foundInCatalog.name;
      country = foundInCatalog.country || null;
      league = foundInCatalog.league || null;
    }

    return {
      koraTeamId: rawId,
      koraTeamName: rawName,
      searchName: candidateName,
      country,
      league,
      apiTeamId: numId,
      apiResultName: rawName,
      matchStatus: 'CONFIRMED',
      candidates: [{ name: rawName, country: country || undefined, league: league || undefined, apiTeamId: numId }],
      reason: `Direct numeric API team identifier [${numId}] verified`,
    };
  }

  // 3. Known Team Catalog Match with Context
  const foundKnown = ALL_KNOWN_TEAMS.find(t => {
    if (t.id.toLowerCase() === rawId.toLowerCase()) return true;
    if (t.name === rawName || normalizeSportsName(t.name) === normName) return true;
    return t.aliases.some(a => a === rawName || normalizeSportsName(a) === normName);
  });

  if (foundKnown) {
    // Check if it has a disambiguated canonical entry
    if (CANONICAL_API_FOOTBALL_MAP[foundKnown.id]) {
      const canonical = CANONICAL_API_FOOTBALL_MAP[foundKnown.id];
      return {
        koraTeamId: rawId,
        koraTeamName: rawName,
        searchName: canonical.nameEn,
        country: canonical.country,
        league: canonical.league,
        apiTeamId: canonical.apiTeamId,
        apiResultName: canonical.nameEn,
        matchStatus: 'CONFIRMED',
        candidates: [{ name: canonical.nameEn, country: canonical.country, league: canonical.league, apiTeamId: canonical.apiTeamId }],
        reason: `Matched known catalog entry [${foundKnown.id}] with confirmed country & league context`,
      };
    }
  }

  // 4. Disambiguate common Arabic Names with context
  const context = {
    country: foundKnown?.country || (rawId.startsWith('sa_') ? 'Saudi Arabia' : undefined),
    league: foundKnown?.league || (rawId.startsWith('sa_') ? 'Saudi Pro League' : undefined),
    id: rawId,
  };

  const disambiguated = disambiguateArabicName(normName, context);
  if (disambiguated) {
    return {
      koraTeamId: rawId,
      koraTeamName: rawName,
      searchName: disambiguated.nameEn,
      country: disambiguated.country,
      league: disambiguated.league,
      apiTeamId: disambiguated.apiTeamId,
      apiResultName: disambiguated.nameEn,
      matchStatus: 'CONFIRMED',
      candidates: [{ name: disambiguated.nameEn, country: disambiguated.country, league: disambiguated.league, apiTeamId: disambiguated.apiTeamId }],
      reason: `Disambiguated common Arabic name using ${context.country || 'verified context'}`,
    };
  }

  // Check if name is inherently ambiguous without context
  const multiClubNames = ['الاتحاد', 'الاهلي', 'الاهلى', 'النصر', 'الهلال', 'الشباب', 'الاتفاق', 'القادسية', 'الوحدة', 'العين', 'الترجي'];
  if (multiClubNames.includes(normName)) {
    return {
      koraTeamId: rawId,
      koraTeamName: rawName,
      searchName: rawName,
      country: null,
      league: null,
      apiTeamId: null,
      apiResultName: null,
      matchStatus: 'AMBIGUOUS',
      candidates: [
        { name: `${rawName} (السعودية)`, country: 'Saudi Arabia', league: 'Saudi Pro League', apiTeamId: 350 },
        { name: `${rawName} (مصر/الإمارات/أخرى)`, country: 'Other', league: 'Other', apiTeamId: 1029 },
      ],
      reason: `Multiple clubs share the name [${rawName}] across different countries and no decisive context was provided`,
    };
  }

  // 5. Check if known translation exists in TEAM_AR_NAMES (reverse lookup)
  for (const [enName, arName] of Object.entries(TEAM_AR_NAMES)) {
    if (arName === rawName || normalizeSportsName(arName) === normName || enName.toLowerCase() === rawName.toLowerCase()) {
      return {
        koraTeamId: rawId,
        koraTeamName: rawName,
        searchName: enName,
        country: null,
        league: null,
        apiTeamId: null, // Left null if no verified numeric ID is mapped
        apiResultName: enName,
        matchStatus: 'NOT_FOUND',
        candidates: [],
        reason: `Found translation [${enName}] but numeric API ID requires official provider sync`,
      };
    }
  }

  return {
    koraTeamId: rawId,
    koraTeamName: rawName,
    searchName: rawName,
    country: null,
    league: null,
    apiTeamId: null,
    apiResultName: null,
    matchStatus: 'NOT_FOUND',
    candidates: [],
    reason: `No API-Football match found for team [${rawName}]`,
  };
}

/**
 * Runs a complete preview across all teams currently in the database.
 * Does NOT write or mutate any database records.
 */
export async function previewAllTeamsResolution(): Promise<{
  totalCount: number;
  confirmedCount: number;
  ambiguousCount: number;
  notFoundCount: number;
  placeholderCount: number;
  results: TeamResolutionResult[];
}> {
  const dbTeams = await db.select().from(teams);

  const results: TeamResolutionResult[] = [];
  let confirmedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;
  let placeholderCount = 0;

  for (const t of dbTeams) {
    const res = resolveTeamIdentity({ id: t.id, name: t.name });
    results.push(res);

    if (res.matchStatus === 'CONFIRMED') confirmedCount++;
    else if (res.matchStatus === 'AMBIGUOUS') ambiguousCount++;
    else if (res.matchStatus === 'GENERIC_PLACEHOLDER') placeholderCount++;
    else notFoundCount++;
  }

  return {
    totalCount: dbTeams.length,
    confirmedCount,
    ambiguousCount,
    notFoundCount,
    placeholderCount,
    results,
  };
}

/**
 * Persists apiTeamId ONLY for CONFIRMED teams.
 * GUARANTEES: Does NOT touch teams.logo or any prediction_matches logos.
 */
export async function applyConfirmedTeamIdentities(): Promise<{
  updatedCount: number;
  confirmedTeams: Array<{ id: string; name: string; apiTeamId: number }>;
}> {
  const preview = await previewAllTeamsResolution();
  const confirmed = preview.results.filter(r => r.matchStatus === 'CONFIRMED' && r.apiTeamId !== null);

  let updatedCount = 0;
  const confirmedTeams: Array<{ id: string; name: string; apiTeamId: number }> = [];

  for (const item of confirmed) {
    if (item.apiTeamId !== null) {
      await db
        .update(teams)
        .set({ apiTeamId: item.apiTeamId })
        .where(eq(teams.id, item.koraTeamId));

      updatedCount++;
      confirmedTeams.push({
        id: item.koraTeamId,
        name: item.koraTeamName,
        apiTeamId: item.apiTeamId,
      });
    }
  }

  return {
    updatedCount,
    confirmedTeams,
  };
}

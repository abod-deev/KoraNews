/**
 * Comprehensive Pre-stored Seed Data for all 13 Free-Tier Leagues
 * Ensures zero-latency database bootstrap for matches and standings.
 */

export interface SeedTeam {
  id: string;
  name: string;
  logo: string;
}

export interface SeedStandingItem {
  id: string;
  rank: number;
  team: SeedTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface SeedMatchItem {
  id: string;
  leagueId: string;
  homeTeam: SeedTeam;
  awayTeam: SeedTeam;
  homeScore: number | null;
  awayScore: number | null;
  status: 'FINISHED' | 'LIVE' | 'SCHEDULED';
  matchTime: string;
  dateOffsetDays: number; // -2 to +5 days relative to now
  hourUtc: number;
  minuteUtc: number;
}

// 1. All Supported Leagues
export const PRE_STORED_LEAGUES = [
  { id: 'PL', code: 'PL', name: 'الدوري الإنجليزي الممتاز', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://crests.football-data.org/PL.png' },
  { id: 'PD', code: 'PD', name: 'الدوري الإسباني', flag: '🇪🇸', logo: 'https://crests.football-data.org/PD.png' },
  { id: 'SA', code: 'SA', name: 'الدوري الإيطالي', flag: '🇮🇹', logo: 'https://crests.football-data.org/SA.png' },
  { id: 'BL1', code: 'BL1', name: 'الدوري الألماني', flag: '🇩🇪', logo: 'https://crests.football-data.org/BL1.png' },
  { id: 'FL1', code: 'FL1', name: 'الدوري الفرنسي', flag: '🇫🇷', logo: 'https://crests.football-data.org/FL1.png' },
  { id: 'CL', code: 'CL', name: 'دوري أبطال أوروبا', flag: '🇪🇺', logo: 'https://crests.football-data.org/CL.png' },
  { id: 'ELC', code: 'ELC', name: 'دوري البطولة الإنجليزية', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://crests.football-data.org/ELC.png' },
  { id: 'DED', code: 'DED', name: 'الدوري الهولندي', flag: '🇳🇱', logo: 'https://crests.football-data.org/DED.png' },
  { id: 'PPL', code: 'PPL', name: 'الدوري البرتغالي', flag: '🇵🇹', logo: 'https://crests.football-data.org/PPL.png' },
  { id: 'BSA', code: 'BSA', name: 'الدوري البرازيلي', flag: '🇧🇷', logo: 'https://crests.football-data.org/BSA.png' },
  { id: 'CLI', code: 'CLI', name: 'كأس ليبرتادوريس', flag: '🌎', logo: 'https://crests.football-data.org/CLI.png' },
  { id: 'EC', code: 'EC', name: 'بطولة أمم أوروبا', flag: '🏆', logo: 'https://crests.football-data.org/EC.png' },
  { id: 'WC', code: 'WC', name: 'كأس العالم', flag: '🌍', logo: 'https://crests.football-data.org/WC.png' },
];

// Helper to build team object
const createTeam = (id: string, name: string, crestId: string | number): SeedTeam => ({
  id,
  name,
  logo: `https://crests.football-data.org/${crestId}.png`,
});

// 2. Pre-stored Standings for all 13 leagues
export const PRE_STORED_STANDINGS: Record<string, SeedStandingItem[]> = {
  // Premier League
  PL: [
    { id: '64', rank: 1, team: createTeam('64', 'ليفربول', 64), played: 28, won: 20, drawn: 7, lost: 1, goalsFor: 68, goalsAgainst: 24, goalDifference: 44, points: 67 },
    { id: '65', rank: 2, team: createTeam('65', 'مانشستر سيتي', 65), played: 28, won: 19, drawn: 5, lost: 4, goalsFor: 62, goalsAgainst: 28, goalDifference: 34, points: 62 },
    { id: '57', rank: 3, team: createTeam('57', 'أرسنال', 57), played: 28, won: 18, drawn: 7, lost: 3, goalsFor: 59, goalsAgainst: 23, goalDifference: 36, points: 61 },
    { id: '61', rank: 4, team: createTeam('61', 'تشيلسي', 61), played: 28, won: 15, drawn: 7, lost: 6, goalsFor: 53, goalsAgainst: 34, goalDifference: 19, points: 52 },
    { id: '67', rank: 5, team: createTeam('67', 'نيوكاسل يونايتد', 67), played: 28, won: 14, drawn: 6, lost: 8, goalsFor: 48, goalsAgainst: 36, goalDifference: 12, points: 48 },
    { id: '58', rank: 6, team: createTeam('58', 'أستون فيلا', 58), played: 28, won: 13, drawn: 8, lost: 7, goalsFor: 45, goalsAgainst: 39, goalDifference: 6, points: 47 },
    { id: '73', rank: 7, team: createTeam('73', 'توتنهام', 73), played: 28, won: 13, drawn: 4, lost: 11, goalsFor: 54, goalsAgainst: 42, goalDifference: 12, points: 43 },
    { id: '66', rank: 8, team: createTeam('66', 'مانشستر يونايتد', 66), played: 28, won: 11, drawn: 6, lost: 11, goalsFor: 40, goalsAgainst: 41, goalDifference: -1, points: 39 },
    { id: '397', rank: 9, team: createTeam('397', 'برايتون', 397), played: 28, won: 10, drawn: 9, lost: 9, goalsFor: 44, goalsAgainst: 45, goalDifference: -1, points: 39 },
    { id: '563', rank: 10, team: createTeam('563', 'وست هام', 563), played: 28, won: 10, drawn: 7, lost: 11, goalsFor: 37, goalsAgainst: 47, goalDifference: -10, points: 37 },
    { id: '63', rank: 11, team: createTeam('63', 'فولهام', 63), played: 28, won: 9, drawn: 9, lost: 10, goalsFor: 38, goalsAgainst: 40, goalDifference: -2, points: 36 },
    { id: '354', rank: 12, team: createTeam('354', 'كريستال بالاس', 354), played: 28, won: 8, drawn: 10, lost: 10, goalsFor: 34, goalsAgainst: 39, goalDifference: -5, points: 34 },
    { id: '402', rank: 13, team: createTeam('402', 'برينتفورد', 402), played: 28, won: 9, drawn: 5, lost: 14, goalsFor: 43, goalsAgainst: 49, goalDifference: -6, points: 32 },
    { id: '351', rank: 14, team: createTeam('351', 'نوتينغهام فورست', 351), played: 28, won: 8, drawn: 7, lost: 13, goalsFor: 33, goalsAgainst: 43, goalDifference: -10, points: 31 },
    { id: '1044', rank: 15, team: createTeam('1044', 'بورنموث', 1044), played: 28, won: 7, drawn: 9, lost: 12, goalsFor: 36, goalsAgainst: 48, goalDifference: -12, points: 30 },
    { id: '62', rank: 16, team: createTeam('62', 'إيفرتون', 62), played: 28, won: 7, drawn: 8, lost: 13, goalsFor: 30, goalsAgainst: 42, goalDifference: -12, points: 29 },
    { id: '76', rank: 17, team: createTeam('76', 'وولفرهامبتون', 76), played: 28, won: 6, drawn: 7, lost: 15, goalsFor: 32, goalsAgainst: 51, goalDifference: -19, points: 25 },
    { id: '340', rank: 18, team: createTeam('340', 'ساوثهامبتون', 340), played: 28, won: 5, drawn: 6, lost: 17, goalsFor: 25, goalsAgainst: 54, goalDifference: -29, points: 21 },
    { id: '338', rank: 19, team: createTeam('338', 'ليستر سيتي', 338), played: 28, won: 4, drawn: 7, lost: 17, goalsFor: 28, goalsAgainst: 58, goalDifference: -30, points: 19 },
    { id: '349', rank: 20, team: createTeam('349', 'إبسويتش تاون', 349), played: 28, won: 3, drawn: 7, lost: 18, goalsFor: 24, goalsAgainst: 60, goalDifference: -36, points: 16 },
  ],

  // La Liga
  PD: [
    { id: '86', rank: 1, team: createTeam('86', 'ريال مدريد', 86), played: 28, won: 21, drawn: 5, lost: 2, goalsFor: 65, goalsAgainst: 22, goalDifference: 43, points: 68 },
    { id: '81', rank: 2, team: createTeam('81', 'برشلونة', 81), played: 28, won: 20, drawn: 4, lost: 4, goalsFor: 69, goalsAgainst: 27, goalDifference: 42, points: 64 },
    { id: '78', rank: 3, team: createTeam('78', 'أتلتيكو مدريد', 78), played: 28, won: 18, drawn: 6, lost: 4, goalsFor: 54, goalsAgainst: 25, goalDifference: 29, points: 60 },
    { id: '77', rank: 4, team: createTeam('77', 'أتلتيك بيلباو', 77), played: 28, won: 15, drawn: 7, lost: 6, goalsFor: 46, goalsAgainst: 28, goalDifference: 18, points: 52 },
    { id: '92', rank: 5, team: createTeam('92', 'ريال سوسيداد', 92), played: 28, won: 13, drawn: 8, lost: 7, goalsFor: 40, goalsAgainst: 30, goalDifference: 10, points: 47 },
    { id: '94', rank: 6, team: createTeam('94', 'فياريال', 94), played: 28, won: 13, drawn: 6, lost: 9, goalsFor: 48, goalsAgainst: 41, goalDifference: 7, points: 45 },
    { id: '90', rank: 7, team: createTeam('90', 'ريال بيتيس', 90), played: 28, won: 11, drawn: 10, lost: 7, goalsFor: 38, goalsAgainst: 34, goalDifference: 4, points: 43 },
    { id: '298', rank: 8, team: createTeam('298', 'جيرونا', 298), played: 28, won: 11, drawn: 7, lost: 10, goalsFor: 41, goalsAgainst: 39, goalDifference: 2, points: 40 },
    { id: '89', rank: 9, team: createTeam('89', 'مايوركا', 89), played: 28, won: 10, drawn: 7, lost: 11, goalsFor: 32, goalsAgainst: 36, goalDifference: -4, points: 37 },
    { id: '79', rank: 10, team: createTeam('79', 'أوساسونا', 79), played: 28, won: 9, drawn: 9, lost: 10, goalsFor: 34, goalsAgainst: 39, goalDifference: -5, points: 36 },
    { id: '559', rank: 11, team: createTeam('559', 'إشبيلية', 559), played: 28, won: 9, drawn: 8, lost: 11, goalsFor: 36, goalsAgainst: 42, goalDifference: -6, points: 35 },
    { id: '95', rank: 12, team: createTeam('95', 'فالنسيا', 95), played: 28, won: 8, drawn: 9, lost: 11, goalsFor: 33, goalsAgainst: 40, goalDifference: -7, points: 33 },
    { id: '558', rank: 13, team: createTeam('558', 'سيلتا فيغو', 558), played: 28, won: 8, drawn: 8, lost: 12, goalsFor: 37, goalsAgainst: 46, goalDifference: -9, points: 32 },
    { id: '87', rank: 14, team: createTeam('87', 'رايو فايكانو', 87), played: 28, won: 7, drawn: 10, lost: 11, goalsFor: 29, goalsAgainst: 38, goalDifference: -9, points: 31 },
    { id: '82', rank: 15, team: createTeam('82', 'خيتافي', 82), played: 28, won: 7, drawn: 9, lost: 12, goalsFor: 26, goalsAgainst: 35, goalDifference: -9, points: 30 },
    { id: '263', rank: 16, team: createTeam('263', 'ديبورتيفو ألافيس', 263), played: 28, won: 7, drawn: 7, lost: 14, goalsFor: 28, goalsAgainst: 43, goalDifference: -15, points: 28 },
    { id: '80', rank: 17, team: createTeam('80', 'إسبانيول', 80), played: 28, won: 6, drawn: 8, lost: 14, goalsFor: 27, goalsAgainst: 45, goalDifference: -18, points: 26 },
    { id: '275', rank: 18, team: createTeam('275', 'لاس بالماس', 275), played: 28, won: 5, drawn: 9, lost: 14, goalsFor: 28, goalsAgainst: 48, goalDifference: -20, points: 24 },
    { id: '745', rank: 19, team: createTeam('745', 'ليغانيس', 745), played: 28, won: 5, drawn: 8, lost: 15, goalsFor: 23, goalsAgainst: 47, goalDifference: -24, points: 23 },
    { id: '250', rank: 20, team: createTeam('250', 'بلد الوليد', 250), played: 28, won: 4, drawn: 6, lost: 18, goalsFor: 20, goalsAgainst: 57, goalDifference: -37, points: 18 },
  ],

  // Serie A
  SA: [
    { id: '108', rank: 1, team: createTeam('108', 'إنتر ميلان', 108), played: 28, won: 21, drawn: 4, lost: 3, goalsFor: 64, goalsAgainst: 20, goalDifference: 44, points: 67 },
    { id: '113', rank: 2, team: createTeam('113', 'نابولي', 113), played: 28, won: 19, drawn: 6, lost: 3, goalsFor: 52, goalsAgainst: 22, goalDifference: 30, points: 63 },
    { id: '102', rank: 3, team: createTeam('102', 'أتالانتا', 102), played: 28, won: 18, drawn: 5, lost: 5, goalsFor: 61, goalsAgainst: 29, goalDifference: 32, points: 59 },
    { id: '109', rank: 4, team: createTeam('109', 'يوفنتوس', 109), played: 28, won: 15, drawn: 11, lost: 2, goalsFor: 47, goalsAgainst: 21, goalDifference: 26, points: 56 },
    { id: '110', rank: 5, team: createTeam('110', 'لاتسيو', 110), played: 28, won: 16, drawn: 4, lost: 8, goalsFor: 50, goalsAgainst: 34, goalDifference: 16, points: 52 },
    { id: '98', rank: 6, team: createTeam('98', 'ميلان', 98), played: 28, won: 14, drawn: 7, lost: 7, goalsFor: 49, goalsAgainst: 35, goalDifference: 14, points: 49 },
    { id: '99', rank: 7, team: createTeam('99', 'فيورنتينا', 99), played: 28, won: 13, drawn: 7, lost: 8, goalsFor: 46, goalsAgainst: 32, goalDifference: 14, points: 46 },
    { id: '100', rank: 8, team: createTeam('100', 'روما', 100), played: 28, won: 12, drawn: 6, lost: 10, goalsFor: 41, goalsAgainst: 36, goalDifference: 5, points: 42 },
    { id: '103', rank: 9, team: createTeam('103', 'بولونيا', 103), played: 28, won: 10, drawn: 11, lost: 7, goalsFor: 39, goalsAgainst: 34, goalDifference: 5, points: 41 },
    { id: '586', rank: 10, team: createTeam('586', 'تورينو', 586), played: 28, won: 9, drawn: 8, lost: 11, goalsFor: 31, goalsAgainst: 37, goalDifference: -6, points: 35 },
    { id: '115', rank: 11, team: createTeam('115', 'أودينيزي', 115), played: 28, won: 10, drawn: 4, lost: 14, goalsFor: 33, goalsAgainst: 44, goalDifference: -11, points: 34 },
    { id: '107', rank: 12, team: createTeam('107', 'جنوى', 107), played: 28, won: 7, drawn: 10, lost: 11, goalsFor: 28, goalsAgainst: 39, goalDifference: -11, points: 31 },
    { id: '104', rank: 13, team: createTeam('104', 'كالياري', 104), played: 28, won: 6, drawn: 9, lost: 13, goalsFor: 29, goalsAgainst: 45, goalDifference: -16, points: 27 },
    { id: '450', rank: 14, team: createTeam('450', 'بارما', 450), played: 28, won: 6, drawn: 8, lost: 14, goalsFor: 32, goalsAgainst: 48, goalDifference: -16, points: 26 },
    { id: '470', rank: 15, team: createTeam('470', 'كومو', 470), played: 28, won: 6, drawn: 7, lost: 15, goalsFor: 31, goalsAgainst: 49, goalDifference: -18, points: 25 },
    { id: '584', rank: 16, team: createTeam('584', 'سامبدوريا', 584), played: 28, won: 6, drawn: 6, lost: 16, goalsFor: 26, goalsAgainst: 47, goalDifference: -21, points: 24 },
    { id: '455', rank: 17, team: createTeam('455', 'إمبولي', 455), played: 28, won: 5, drawn: 8, lost: 15, goalsFor: 23, goalsAgainst: 45, goalDifference: -22, points: 23 },
    { id: '588', rank: 18, team: createTeam('588', 'ليتشي', 588), played: 28, won: 5, drawn: 7, lost: 16, goalsFor: 21, goalsAgainst: 49, goalDifference: -28, points: 22 },
    { id: '457', rank: 19, team: createTeam('457', 'هيلاس فيرونا', 457), played: 28, won: 6, drawn: 3, lost: 19, goalsFor: 27, goalsAgainst: 59, goalDifference: -32, points: 21 },
    { id: '488', rank: 20, team: createTeam('488', 'فينيسيا', 488), played: 28, won: 3, drawn: 7, lost: 18, goalsFor: 22, goalsAgainst: 54, goalDifference: -32, points: 16 },
  ],

  // Bundesliga
  BL1: [
    { id: '721', rank: 1, team: createTeam('721', 'باير ليفركوزن', 721), played: 25, won: 18, drawn: 6, lost: 1, goalsFor: 62, goalsAgainst: 26, goalDifference: 36, points: 60 },
    { id: '5', rank: 2, team: createTeam('5', 'بايرن ميونخ', 5), played: 25, won: 18, drawn: 4, lost: 3, goalsFor: 68, goalsAgainst: 24, goalDifference: 44, points: 58 },
    { id: '721b', rank: 3, team: createTeam('721b', 'لايبزيغ', 721), played: 25, won: 15, drawn: 5, lost: 5, goalsFor: 49, goalsAgainst: 27, goalDifference: 22, points: 50 },
    { id: '19', rank: 4, team: createTeam('19', 'آينتراخت فرانكفورت', 19), played: 25, won: 13, drawn: 6, lost: 6, goalsFor: 48, goalsAgainst: 34, goalDifference: 14, points: 45 },
    { id: '4', rank: 5, team: createTeam('4', 'بوروسيا دورتموند', 4), played: 25, won: 12, drawn: 6, lost: 7, goalsFor: 45, goalsAgainst: 35, goalDifference: 10, points: 42 },
    { id: '11', rank: 6, team: createTeam('11', 'فولفسبورغ', 11), played: 25, won: 11, drawn: 6, lost: 8, goalsFor: 42, goalsAgainst: 36, goalDifference: 6, points: 39 },
    { id: '17', rank: 7, team: createTeam('17', 'فرايبورغ', 17), played: 25, won: 11, drawn: 5, lost: 9, goalsFor: 37, goalsAgainst: 38, goalDifference: -1, points: 38 },
    { id: '10', rank: 8, team: createTeam('10', 'شتوتغارت', 10), played: 25, won: 10, drawn: 7, lost: 8, goalsFor: 44, goalsAgainst: 38, goalDifference: 6, points: 37 },
    { id: '2', rank: 9, team: createTeam('2', 'هوفنهايم', 2), played: 25, won: 8, drawn: 7, lost: 10, goalsFor: 36, goalsAgainst: 44, goalDifference: -8, points: 31 },
    { id: '28', rank: 10, team: createTeam('28', 'يونيون برلين', 28), played: 25, won: 8, drawn: 6, lost: 11, goalsFor: 27, goalsAgainst: 35, goalDifference: -8, points: 30 },
    { id: '18', rank: 11, team: createTeam('18', 'بوروسيا مونشنغلادباخ', 18), played: 25, won: 8, drawn: 5, lost: 12, goalsFor: 35, goalsAgainst: 42, goalDifference: -7, points: 29 },
    { id: '12', rank: 12, team: createTeam('12', 'فيردر بريمن', 12), played: 25, won: 7, drawn: 7, lost: 11, goalsFor: 32, goalsAgainst: 45, goalDifference: -13, points: 28 },
    { id: '16', rank: 13, team: createTeam('16', 'أوغسبورغ', 16), played: 25, won: 7, drawn: 6, lost: 12, goalsFor: 29, goalsAgainst: 44, goalDifference: -15, points: 27 },
    { id: '15', rank: 14, team: createTeam('15', 'ماينتس', 15), played: 25, won: 6, drawn: 8, lost: 11, goalsFor: 28, goalsAgainst: 39, goalDifference: -11, points: 26 },
    { id: '29', rank: 15, team: createTeam('29', 'سانت باولي', 29), played: 25, won: 6, drawn: 4, lost: 15, goalsFor: 22, goalsAgainst: 37, goalDifference: -15, points: 22 },
    { id: '36', rank: 16, team: createTeam('36', 'بوخوم', 36), played: 25, won: 4, drawn: 6, lost: 15, goalsFor: 24, goalsAgainst: 51, goalDifference: -27, points: 18 },
    { id: '21', rank: 17, team: createTeam('21', 'هايدنهايم', 21), played: 25, won: 4, drawn: 5, lost: 16, goalsFor: 26, goalsAgainst: 52, goalDifference: -26, points: 17 },
    { id: '31', rank: 18, team: createTeam('31', 'هولشتاين كيل', 31), played: 25, won: 3, drawn: 5, lost: 17, goalsFor: 27, goalsAgainst: 58, goalDifference: -31, points: 14 },
  ],

  // Ligue 1
  FL1: [
    { id: '524', rank: 1, team: createTeam('524', 'باريس سان جيرمان', 524), played: 25, won: 19, drawn: 5, lost: 1, goalsFor: 66, goalsAgainst: 22, goalDifference: 44, points: 62 },
    { id: '548', rank: 2, team: createTeam('548', 'موناكو', 548), played: 25, won: 15, drawn: 5, lost: 5, goalsFor: 49, goalsAgainst: 28, goalDifference: 21, points: 50 },
    { id: '516', rank: 3, team: createTeam('516', 'مارسيليا', 516), played: 25, won: 14, drawn: 6, lost: 5, goalsFor: 48, goalsAgainst: 29, goalDifference: 19, points: 48 },
    { id: '521', rank: 4, team: createTeam('521', 'ليل', 521), played: 25, won: 13, drawn: 7, lost: 5, goalsFor: 42, goalsAgainst: 26, goalDifference: 16, points: 46 },
    { id: '523', rank: 5, team: createTeam('523', 'ليون', 523), played: 25, won: 13, drawn: 5, lost: 7, goalsFor: 45, goalsAgainst: 34, goalDifference: 11, points: 44 },
    { id: '522', rank: 6, team: createTeam('522', 'نيس', 522), played: 25, won: 11, drawn: 8, lost: 6, goalsFor: 39, goalsAgainst: 29, goalDifference: 10, points: 41 },
    { id: '546', rank: 7, team: createTeam('546', 'لانس', 546), played: 25, won: 10, drawn: 8, lost: 7, goalsFor: 34, goalsAgainst: 28, goalDifference: 6, points: 38 },
    { id: '512', rank: 8, team: createTeam('512', 'بريست', 512), played: 25, won: 10, drawn: 5, lost: 10, goalsFor: 36, goalsAgainst: 37, goalDifference: -1, points: 35 },
    { id: '529', rank: 9, team: createTeam('529', 'رين', 529), played: 25, won: 9, drawn: 6, lost: 10, goalsFor: 35, goalsAgainst: 36, goalDifference: -1, points: 33 },
    { id: '511', rank: 10, team: createTeam('511', 'تولوز', 511), played: 25, won: 8, drawn: 8, lost: 9, goalsFor: 30, goalsAgainst: 32, goalDifference: -2, points: 32 },
    { id: '547', rank: 11, team: createTeam('547', 'ستاد ريمس', 547), played: 25, won: 8, drawn: 7, lost: 10, goalsFor: 32, goalsAgainst: 36, goalDifference: -4, points: 31 },
    { id: '576', rank: 12, team: createTeam('576', 'ستراسبورغ', 576), played: 25, won: 8, drawn: 6, lost: 11, goalsFor: 37, goalsAgainst: 42, goalDifference: -5, points: 30 },
    { id: '514', rank: 13, team: createTeam('514', 'أوكسير', 514), played: 25, won: 8, drawn: 5, lost: 12, goalsFor: 33, goalsAgainst: 42, goalDifference: -9, points: 29 },
    { id: '543', rank: 14, team: createTeam('543', 'نانت', 543), played: 25, won: 6, drawn: 8, lost: 11, goalsFor: 28, goalsAgainst: 39, goalDifference: -11, points: 26 },
    { id: '518', rank: 15, team: createTeam('518', 'مونبلييه', 518), played: 25, won: 6, drawn: 5, lost: 14, goalsFor: 29, goalsAgainst: 52, goalDifference: -23, points: 23 },
    { id: '533', rank: 16, team: createTeam('533', 'لوهافر', 533), played: 25, won: 6, drawn: 3, lost: 16, goalsFor: 22, goalsAgainst: 45, goalDifference: -23, points: 21 },
    { id: '532', rank: 17, team: createTeam('532', 'أنجيه', 532), played: 25, won: 5, drawn: 5, lost: 15, goalsFor: 24, goalsAgainst: 46, goalDifference: -22, points: 20 },
    { id: '515', rank: 18, team: createTeam('515', 'سانت إتيان', 515), played: 25, won: 5, drawn: 4, lost: 16, goalsFor: 23, goalsAgainst: 57, goalDifference: -34, points: 19 },
  ],

  // Champions League
  CL: [
    { id: '86', rank: 1, team: createTeam('86', 'ريال مدريد', 86), played: 8, won: 7, drawn: 0, lost: 1, goalsFor: 21, goalsAgainst: 8, goalDifference: 13, points: 21 },
    { id: '64', rank: 2, team: createTeam('64', 'ليفربول', 64), played: 8, won: 7, drawn: 0, lost: 1, goalsFor: 18, goalsAgainst: 5, goalDifference: 13, points: 21 },
    { id: '81', rank: 3, team: createTeam('81', 'برشلونة', 81), played: 8, won: 6, drawn: 1, lost: 1, goalsFor: 22, goalsAgainst: 9, goalDifference: 13, points: 19 },
    { id: '57', rank: 4, team: createTeam('57', 'أرسنال', 57), played: 8, won: 6, drawn: 1, lost: 1, goalsFor: 16, goalsAgainst: 4, goalDifference: 12, points: 19 },
    { id: '5', rank: 5, team: createTeam('5', 'بايرن ميونخ', 5), played: 8, won: 5, drawn: 1, lost: 2, goalsFor: 19, goalsAgainst: 10, goalDifference: 9, points: 16 },
    { id: '108', rank: 6, team: createTeam('108', 'إنتر ميلان', 108), played: 8, won: 5, drawn: 1, lost: 2, goalsFor: 12, goalsAgainst: 4, goalDifference: 8, points: 16 },
    { id: '65', rank: 7, team: createTeam('65', 'مانشستر سيتي', 65), played: 8, won: 4, drawn: 2, lost: 2, goalsFor: 17, goalsAgainst: 11, goalDifference: 6, points: 14 },
    { id: '78', rank: 8, team: createTeam('78', 'أتلتيكو مدريد', 78), played: 8, won: 4, drawn: 2, lost: 2, goalsFor: 14, goalsAgainst: 10, goalDifference: 4, points: 14 },
    { id: '4', rank: 9, team: createTeam('4', 'بوروسيا دورتموند', 4), played: 8, won: 4, drawn: 1, lost: 3, goalsFor: 16, goalsAgainst: 12, goalDifference: 4, points: 13 },
    { id: '524', rank: 10, team: createTeam('524', 'باريس سان جيرمان', 524), played: 8, won: 4, drawn: 1, lost: 3, goalsFor: 13, goalsAgainst: 10, goalDifference: 3, points: 13 },
    { id: '109', rank: 11, team: createTeam('109', 'يوفنتوس', 109), played: 8, won: 3, drawn: 3, lost: 2, goalsFor: 11, goalsAgainst: 9, goalDifference: 2, points: 12 },
    { id: '721', rank: 12, team: createTeam('721', 'باير ليفركوزن', 721), played: 8, won: 3, drawn: 2, lost: 3, goalsFor: 13, goalsAgainst: 12, goalDifference: 1, points: 11 },
  ],

  // Championship (ELC)
  ELC: [
    { id: '338', rank: 1, team: createTeam('338', 'ليستر سيتي', 338), played: 34, won: 24, drawn: 4, lost: 6, goalsFor: 72, goalsAgainst: 31, goalDifference: 41, points: 76 },
    { id: '349', rank: 2, team: createTeam('349', 'إبسويتش تاون', 349), played: 34, won: 22, drawn: 7, lost: 5, goalsFor: 69, goalsAgainst: 42, goalDifference: 27, points: 73 },
    { id: '341', rank: 3, team: createTeam('341', 'ليدز يونايتد', 341), played: 34, won: 22, drawn: 6, lost: 6, goalsFor: 66, goalsAgainst: 28, goalDifference: 38, points: 72 },
    { id: '340', rank: 4, team: createTeam('340', 'ساوثهامبتون', 340), played: 34, won: 20, drawn: 7, lost: 7, goalsFor: 65, goalsAgainst: 41, goalDifference: 24, points: 67 },
    { id: '74', rank: 5, team: createTeam('74', 'وست بروميتش ألبيون', 74), played: 34, won: 16, drawn: 8, lost: 10, goalsFor: 51, goalsAgainst: 36, goalDifference: 15, points: 56 },
    { id: '68', rank: 6, team: createTeam('68', 'نورويتش سيتي', 68), played: 34, won: 16, drawn: 6, lost: 12, goalsFor: 58, goalsAgainst: 49, goalDifference: 9, points: 54 },
    { id: '322', rank: 7, team: createTeam('322', 'هال سيتي', 322), played: 34, won: 15, drawn: 8, lost: 11, goalsFor: 49, goalsAgainst: 42, goalDifference: 7, points: 53 },
    { id: '1076', rank: 8, team: createTeam('1076', 'كوفنتري سيتي', 1076), played: 34, won: 14, drawn: 9, lost: 11, goalsFor: 53, goalsAgainst: 43, goalDifference: 10, points: 51 },
  ],

  // Eredivisie (DED)
  DED: [
    { id: '674', rank: 1, team: createTeam('674', 'آيندهوفن', 674), played: 24, won: 22, drawn: 2, lost: 0, goalsFor: 77, goalsAgainst: 13, goalDifference: 64, points: 68 },
    { id: '675', rank: 2, team: createTeam('675', 'فينورد', 675), played: 24, won: 17, drawn: 5, lost: 2, goalsFor: 58, goalsAgainst: 20, goalDifference: 38, points: 56 },
    { id: '666', rank: 3, team: createTeam('666', 'تفينتي', 666), played: 24, won: 15, drawn: 5, lost: 4, goalsFor: 47, goalsAgainst: 23, goalDifference: 24, points: 50 },
    { id: '678', rank: 4, team: createTeam('678', 'ألكمار', 678), played: 24, won: 13, drawn: 7, lost: 4, goalsFor: 46, goalsAgainst: 24, goalDifference: 22, points: 46 },
    { id: '678b', rank: 5, team: createTeam('678b', 'أياكس أمستردام', 678), played: 24, won: 11, drawn: 6, lost: 7, goalsFor: 51, goalsAgainst: 43, goalDifference: 8, points: 39 },
    { id: '676', rank: 6, team: createTeam('676', 'أوتريخت', 676), played: 24, won: 8, drawn: 8, lost: 8, goalsFor: 32, goalsAgainst: 36, goalDifference: -4, points: 32 },
  ],

  // Primeira Liga (PPL)
  PPL: [
    { id: '498', rank: 1, team: createTeam('498', 'سبورتينغ لشبونة', 498), played: 24, won: 20, drawn: 2, lost: 2, goalsFor: 69, goalsAgainst: 22, goalDifference: 47, points: 62 },
    { id: '1903', rank: 2, team: createTeam('1903', 'بنفيكا', 1903), played: 24, won: 18, drawn: 4, lost: 2, goalsFor: 56, goalsAgainst: 16, goalDifference: 40, points: 58 },
    { id: '503', rank: 3, team: createTeam('503', 'بورتو', 503), played: 24, won: 16, drawn: 4, lost: 4, goalsFor: 45, goalsAgainst: 17, goalDifference: 28, points: 52 },
    { id: '5613', rank: 4, team: createTeam('5613', 'سبورتينغ براغا', 5613), played: 24, won: 14, drawn: 4, lost: 6, goalsFor: 53, goalsAgainst: 33, goalDifference: 20, points: 46 },
    { id: '5543', rank: 5, team: createTeam('5543', 'فيتوريا غيماريش', 5543), played: 24, won: 13, drawn: 5, lost: 6, goalsFor: 39, goalsAgainst: 26, goalDifference: 13, points: 44 },
  ],

  // Brasileirao Serie A (BSA)
  BSA: [
    { id: '1770', rank: 1, team: createTeam('1770', 'بوتافوغو', 1770), played: 38, won: 22, drawn: 10, lost: 6, goalsFor: 60, goalsAgainst: 31, goalDifference: 29, points: 76 },
    { id: '1769', rank: 2, team: createTeam('1769', 'بالميراس', 1769), played: 38, won: 22, drawn: 7, lost: 9, goalsFor: 61, goalsAgainst: 33, goalDifference: 28, points: 73 },
    { id: '1783', rank: 3, team: createTeam('1783', 'فلامنغو', 1783), played: 38, won: 20, drawn: 10, lost: 8, goalsFor: 61, goalsAgainst: 42, goalDifference: 19, points: 70 },
    { id: '1780', rank: 4, team: createTeam('1780', 'فورتاليزا', 1780), played: 38, won: 19, drawn: 11, lost: 8, goalsFor: 53, goalsAgainst: 39, goalDifference: 14, points: 68 },
    { id: '1775', rank: 5, team: createTeam('1775', 'إنترناسيونال', 1775), played: 38, won: 18, drawn: 11, lost: 9, goalsFor: 53, goalsAgainst: 36, goalDifference: 17, points: 65 },
    { id: '1776', rank: 6, team: createTeam('1776', 'ساو باولو', 1776), played: 38, won: 17, drawn: 8, lost: 13, goalsFor: 49, goalsAgainst: 40, goalDifference: 9, points: 59 },
  ],

  // Copa Libertadores (CLI)
  CLI: [
    { id: '1783', rank: 1, team: createTeam('1783', 'فلامنغو', 1783), played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 14, goalsAgainst: 4, goalDifference: 10, points: 16 },
    { id: '1769', rank: 2, team: createTeam('1769', 'بالميراس', 1769), played: 6, won: 4, drawn: 2, lost: 0, goalsFor: 12, goalsAgainst: 5, goalDifference: 7, points: 14 },
    { id: '2019', rank: 3, team: createTeam('2019', 'ريفر بليت', 2019), played: 6, won: 4, drawn: 1, lost: 1, goalsFor: 11, goalsAgainst: 6, goalDifference: 5, points: 13 },
    { id: '1770', rank: 4, team: createTeam('1770', 'بوتافوغو', 1770), played: 6, won: 3, drawn: 2, lost: 1, goalsFor: 10, goalsAgainst: 7, goalDifference: 3, points: 11 },
    { id: '2020', rank: 5, team: createTeam('2020', 'بوكا جونيورز', 2020), played: 6, won: 3, drawn: 1, lost: 2, goalsFor: 9, goalsAgainst: 8, goalDifference: 1, points: 10 },
    { id: '1777', rank: 6, team: createTeam('1777', 'أتلتيكو مينيرو', 1777), played: 6, won: 3, drawn: 0, lost: 3, goalsFor: 8, goalsAgainst: 9, goalDifference: -1, points: 9 },
  ],

  // European Championship (EC) - Not started for current season
  EC: [],

  // World Cup (WC) - Not started for current season
  WC: [],
};

// 3. Pre-stored Master Matches Template for all 13 leagues
export const PRE_STORED_MATCHES_TEMPLATE: SeedMatchItem[] = [
  // === PREMIER LEAGUE (PL) ===
  { id: 'pl-1', leagueId: 'PL', homeTeam: createTeam('64', 'ليفربول', 64), awayTeam: createTeam('65', 'مانشستر سيتي', 65), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 16, minuteUtc: 30 },
  { id: 'pl-2', leagueId: 'PL', homeTeam: createTeam('57', 'أرسنال', 57), awayTeam: createTeam('61', 'تشيلسي', 61), homeScore: 3, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 19, minuteUtc: 0 },
  { id: 'pl-3', leagueId: 'PL', homeTeam: createTeam('66', 'مانشستر يونايتد', 66), awayTeam: createTeam('73', 'توتنهام', 73), homeScore: 1, awayScore: 1, status: 'LIVE', matchTime: 'مباشر', dateOffsetDays: 0, hourUtc: 18, minuteUtc: 0 },
  { id: 'pl-4', leagueId: 'PL', homeTeam: createTeam('58', 'أستون فيلا', 58), awayTeam: createTeam('67', 'نيوكاسل يونايتد', 67), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '21:00', dateOffsetDays: 0, hourUtc: 21, minuteUtc: 0 },
  { id: 'pl-5', leagueId: 'PL', homeTeam: createTeam('397', 'برايتون', 397), awayTeam: createTeam('563', 'وست هام', 563), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '17:30', dateOffsetDays: 1, hourUtc: 17, minuteUtc: 30 },
  { id: 'pl-6', leagueId: 'PL', homeTeam: createTeam('61', 'تشيلسي', 61), awayTeam: createTeam('64', 'ليفربول', 64), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '20:00', dateOffsetDays: 3, hourUtc: 20, minuteUtc: 0 },

  // === LA LIGA (PD) ===
  { id: 'pd-1', leagueId: 'PD', homeTeam: createTeam('86', 'ريال مدريد', 86), awayTeam: createTeam('81', 'برشلونة', 81), homeScore: 3, awayScore: 2, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 20, minuteUtc: 0 },
  { id: 'pd-2', leagueId: 'PD', homeTeam: createTeam('78', 'أتلتيكو مدريد', 78), awayTeam: createTeam('77', 'أتلتيك بيلباو', 77), homeScore: 2, awayScore: 0, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 17, minuteUtc: 30 },
  { id: 'pd-3', leagueId: 'PD', homeTeam: createTeam('92', 'ريال سوسيداد', 92), awayTeam: createTeam('94', 'فياريال', 94), homeScore: 1, awayScore: 0, status: 'LIVE', matchTime: 'مباشر', dateOffsetDays: 0, hourUtc: 19, minuteUtc: 15 },
  { id: 'pd-4', leagueId: 'PD', homeTeam: createTeam('90', 'ريال بيتيس', 90), awayTeam: createTeam('559', 'إشبيلية', 559), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '22:00', dateOffsetDays: 0, hourUtc: 22, minuteUtc: 0 },
  { id: 'pd-5', leagueId: 'PD', homeTeam: createTeam('81', 'برشلونة', 81), awayTeam: createTeam('95', 'فالنسيا', 95), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '21:00', dateOffsetDays: 2, hourUtc: 21, minuteUtc: 0 },
  { id: 'pd-6', leagueId: 'PD', homeTeam: createTeam('86', 'ريال مدريد', 86), awayTeam: createTeam('78', 'أتلتيكو مدريد', 78), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '21:30', dateOffsetDays: 4, hourUtc: 21, minuteUtc: 30 },

  // === SERIE A (SA) ===
  { id: 'sa-1', leagueId: 'SA', homeTeam: createTeam('108', 'إنتر ميلان', 108), awayTeam: createTeam('109', 'يوفنتوس', 109), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 19, minuteUtc: 45 },
  { id: 'sa-2', leagueId: 'SA', homeTeam: createTeam('98', 'ميلان', 98), awayTeam: createTeam('113', 'نابولي', 113), homeScore: 1, awayScore: 2, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 17, minuteUtc: 0 },
  { id: 'sa-3', leagueId: 'SA', homeTeam: createTeam('102', 'أتالانتا', 102), awayTeam: createTeam('100', 'روما', 100), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '20:45', dateOffsetDays: 0, hourUtc: 20, minuteUtc: 45 },
  { id: 'sa-4', leagueId: 'SA', homeTeam: createTeam('110', 'لاتسيو', 110), awayTeam: createTeam('99', 'فيورنتينا', 99), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '19:00', dateOffsetDays: 1, hourUtc: 19, minuteUtc: 0 },
  { id: 'sa-5', leagueId: 'SA', homeTeam: createTeam('109', 'يوفنتوس', 109), awayTeam: createTeam('98', 'ميلان', 98), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '20:45', dateOffsetDays: 3, hourUtc: 20, minuteUtc: 45 },

  // === BUNDESLIGA (BL1) ===
  { id: 'bl-1', leagueId: 'BL1', homeTeam: createTeam('5', 'بايرن ميونخ', 5), awayTeam: createTeam('4', 'بوروسيا دورتموند', 4), homeScore: 3, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 17, minuteUtc: 30 },
  { id: 'bl-2', leagueId: 'BL1', homeTeam: createTeam('721', 'باير ليفركوزن', 721), awayTeam: createTeam('19', 'آينتراخت فرانكفورت', 19), homeScore: 2, awayScore: 2, status: 'LIVE', matchTime: 'مباشر', dateOffsetDays: 0, hourUtc: 16, minuteUtc: 30 },
  { id: 'bl-3', leagueId: 'BL1', homeTeam: createTeam('10', 'شتوتغارت', 10), awayTeam: createTeam('17', 'فرايبورغ', 17), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '18:30', dateOffsetDays: 0, hourUtc: 18, minuteUtc: 30 },
  { id: 'bl-4', leagueId: 'BL1', homeTeam: createTeam('4', 'بوروسيا دورتموند', 4), awayTeam: createTeam('721', 'باير ليفركوزن', 721), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '16:30', dateOffsetDays: 2, hourUtc: 16, minuteUtc: 30 },

  // === LIGUE 1 (FL1) ===
  { id: 'fl-1', leagueId: 'FL1', homeTeam: createTeam('524', 'باريس سان جيرمان', 524), awayTeam: createTeam('516', 'مارسيليا', 516), homeScore: 4, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 20, minuteUtc: 45 },
  { id: 'fl-2', leagueId: 'FL1', homeTeam: createTeam('548', 'موناكو', 548), awayTeam: createTeam('523', 'ليون', 523), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '21:00', dateOffsetDays: 0, hourUtc: 21, minuteUtc: 0 },
  { id: 'fl-3', leagueId: 'FL1', homeTeam: createTeam('521', 'ليل', 521), awayTeam: createTeam('522', 'نيس', 522), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '18:00', dateOffsetDays: 1, hourUtc: 18, minuteUtc: 0 },

  // === CHAMPIONS LEAGUE (CL) 2026/2027 ===
  { id: 'cl-1', leagueId: 'CL', homeTeam: createTeam('86', 'ريال مدريد', 86), awayTeam: createTeam('65', 'مانشستر سيتي', 65), homeScore: 3, awayScore: 2, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 20, minuteUtc: 0 },
  { id: 'cl-2', leagueId: 'CL', homeTeam: createTeam('5', 'بايرن ميونخ', 5), awayTeam: createTeam('524', 'باريس سان جيرمان', 524), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 20, minuteUtc: 0 },
  { id: 'cl-3', leagueId: 'CL', homeTeam: createTeam('64', 'ليفربول', 64), awayTeam: createTeam('98', 'ميلان', 98), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 20, minuteUtc: 0 },
  { id: 'cl-4', leagueId: 'CL', homeTeam: createTeam('81', 'برشلونة', 81), awayTeam: createTeam('108', 'إنتر ميلان', 108), homeScore: 1, awayScore: 1, status: 'LIVE', matchTime: 'مباشر', dateOffsetDays: 0, hourUtc: 19, minuteUtc: 0 },
  { id: 'cl-5', leagueId: 'CL', homeTeam: createTeam('57', 'أرسنال', 57), awayTeam: createTeam('78', 'أتلتيكو مدريد', 78), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '22:00', dateOffsetDays: 0, hourUtc: 22, minuteUtc: 0 },
  { id: 'cl-6', leagueId: 'CL', homeTeam: createTeam('168', 'باير ليفركوزن', 168), awayTeam: createTeam('109', 'يوفنتوس', 109), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '22:00', dateOffsetDays: 0, hourUtc: 22, minuteUtc: 0 },
  { id: 'cl-7', leagueId: 'CL', homeTeam: createTeam('4', 'بوروسيا دورتموند', 4), awayTeam: createTeam('58', 'أستون فيلا', 58), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '20:00', dateOffsetDays: 1, hourUtc: 20, minuteUtc: 0 },
  { id: 'cl-8', leagueId: 'CL', homeTeam: createTeam('498', 'سبورتينغ لشبونة', 498), awayTeam: createTeam('102', 'أتالانتا', 102), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '22:00', dateOffsetDays: 1, hourUtc: 22, minuteUtc: 0 },
  { id: 'cl-9', leagueId: 'CL', homeTeam: createTeam('1903', 'بنفيكا', 1903), awayTeam: createTeam('548', 'موناكو', 548), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '22:00', dateOffsetDays: 2, hourUtc: 22, minuteUtc: 0 },

  // === CHAMPIONSHIP (ELC) ===
  { id: 'elc-1', leagueId: 'ELC', homeTeam: createTeam('338', 'ليستر سيتي', 338), awayTeam: createTeam('341', 'ليدز يونايتد', 341), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 16, minuteUtc: 0 },
  { id: 'elc-2', leagueId: 'ELC', homeTeam: createTeam('340', 'ساوثهامبتون', 340), awayTeam: createTeam('349', 'إبسويتش تاون', 349), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '17:00', dateOffsetDays: 0, hourUtc: 17, minuteUtc: 0 },

  // === EREDIVISIE (DED) ===
  { id: 'ded-1', leagueId: 'DED', homeTeam: createTeam('674', 'آيندهوفن', 674), awayTeam: createTeam('675', 'فينورد', 675), homeScore: 3, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 15, minuteUtc: 30 },
  { id: 'ded-2', leagueId: 'DED', homeTeam: createTeam('678b', 'أياكس أمستردام', 678), awayTeam: createTeam('666', 'تفينتي', 666), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '19:00', dateOffsetDays: 0, hourUtc: 19, minuteUtc: 0 },

  // === PRIMEIRA LIGA (PPL) ===
  { id: 'ppl-1', leagueId: 'PPL', homeTeam: createTeam('498', 'سبورتينغ لشبونة', 498), awayTeam: createTeam('1903', 'بنفيكا', 1903), homeScore: 2, awayScore: 2, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 21, minuteUtc: 30 },
  { id: 'ppl-2', leagueId: 'PPL', homeTeam: createTeam('503', 'بورتو', 503), awayTeam: createTeam('5613', 'سبورتينغ براغا', 5613), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '21:00', dateOffsetDays: 0, hourUtc: 21, minuteUtc: 0 },

  // === BRASILEIRAO SERIE A (BSA) ===
  { id: 'bsa-1', leagueId: 'BSA', homeTeam: createTeam('1783', 'فلامنغو', 1783), awayTeam: createTeam('1769', 'بالميراس', 1769), homeScore: 1, awayScore: 0, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -1, hourUtc: 23, minuteUtc: 0 },
  { id: 'bsa-2', leagueId: 'BSA', homeTeam: createTeam('1770', 'بوتافوغو', 1770), awayTeam: createTeam('1776', 'ساو باولو', 1776), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '23:30', dateOffsetDays: 0, hourUtc: 23, minuteUtc: 30 },

  // === COPA LIBERTADORES (CLI) ===
  { id: 'cli-1', leagueId: 'CLI', homeTeam: createTeam('2019', 'ريفر بليت', 2019), awayTeam: createTeam('1783', 'فلامنغو', 1783), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -2, hourUtc: 0, minuteUtc: 30 },
  { id: 'cli-2', leagueId: 'CLI', homeTeam: createTeam('2020', 'بوكا جونيورز', 2020), awayTeam: createTeam('1769', 'بالميراس', 1769), homeScore: null, awayScore: null, status: 'SCHEDULED', matchTime: '01:00', dateOffsetDays: 1, hourUtc: 1, minuteUtc: 0 },

  // === EUROPEAN CHAMPIONSHIP (EC) ===
  { id: 'ec-1', leagueId: 'EC', homeTeam: createTeam('760', 'إسبانيا', 760), awayTeam: createTeam('770', 'إنجلترا', 770), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -3, hourUtc: 20, minuteUtc: 0 },
  { id: 'ec-2', leagueId: 'EC', homeTeam: createTeam('773', 'فرنسا', 773), awayTeam: createTeam('759', 'ألمانيا', 759), homeScore: 1, awayScore: 0, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -3, hourUtc: 17, minuteUtc: 0 },

  // === WORLD CUP (WC) ===
  { id: 'wc-1', leagueId: 'WC', homeTeam: createTeam('762', 'الأرجنتين', 762), awayTeam: createTeam('773', 'فرنسا', 773), homeScore: 3, awayScore: 3, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -4, hourUtc: 17, minuteUtc: 0 },
  { id: 'wc-2', leagueId: 'WC', homeTeam: createTeam('799', 'كرواتيا', 799), awayTeam: createTeam('811', 'المغرب', 811), homeScore: 2, awayScore: 1, status: 'FINISHED', matchTime: 'انتهت', dateOffsetDays: -4, hourUtc: 15, minuteUtc: 0 },
];

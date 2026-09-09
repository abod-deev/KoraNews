import { db } from '../db/index.ts';
import { leagues, teams } from '../db/schema.ts';
import { eq, ilike } from 'drizzle-orm';

export const SAUDI_LEAGUE = {
  id: 'SPL',
  name: 'دوري روشن السعودي',
  logo: 'https://media.api-sports.io/football/leagues/307.png',
};

export const ADDITIONAL_LEAGUES = [
  SAUDI_LEAGUE,
  { id: 'AC', name: 'كأس آسيا', logo: 'https://media.api-sports.io/football/leagues/17.png' },
  { id: 'AFCON', name: 'كأس أمم أفريقيا', logo: 'https://media.api-sports.io/football/leagues/6.png' },
  { id: 'GULF', name: 'كأس الخليج العربي', logo: 'https://media.api-sports.io/football/leagues/19.png' },
  { id: 'WCQ', name: 'تصفيات كأس العالم', logo: 'https://crests.football-data.org/WC.png' },
];

export const SAUDI_TEAMS = [
  { id: 'sa_hilal', name: 'الهلال', logo: 'https://media.api-sports.io/football/teams/2939.png' },
  { id: 'sa_nassr', name: 'النصر', logo: 'https://media.api-sports.io/football/teams/2940.png' },
  { id: 'sa_ittihad', name: 'الاتحاد', logo: 'https://media.api-sports.io/football/teams/2936.png' },
  { id: 'sa_ahli', name: 'الأهلي', logo: 'https://media.api-sports.io/football/teams/2935.png' },
  { id: 'sa_shabab', name: 'الشباب', logo: 'https://media.api-sports.io/football/teams/2942.png' },
  { id: 'sa_ettifaq', name: 'الاتفاق', logo: 'https://media.api-sports.io/football/teams/2934.png' },
  { id: 'sa_taawoun', name: 'التعاون', logo: 'https://media.api-sports.io/football/teams/2938.png' },
  { id: 'sa_qadsiah', name: 'القادسية', logo: 'https://media.api-sports.io/football/teams/2941.png' },
  { id: 'sa_fateh', name: 'الفتح', logo: 'https://media.api-sports.io/football/teams/2937.png' },
  { id: 'sa_damac', name: 'ضمك', logo: 'https://media.api-sports.io/football/teams/2944.png' },
  { id: 'sa_khaleej', name: 'الخليج', logo: 'https://media.api-sports.io/football/teams/2943.png' },
  { id: 'sa_fayha', name: 'الفيحاء', logo: 'https://media.api-sports.io/football/teams/2945.png' },
  { id: 'sa_raed', name: 'الرائد', logo: 'https://media.api-sports.io/football/teams/2933.png' },
  { id: 'sa_wehda', name: 'الوحدة', logo: 'https://media.api-sports.io/football/teams/2946.png' },
  { id: 'sa_riyadh', name: 'الرياض', logo: 'https://media.api-sports.io/football/teams/2947.png' },
  { id: 'sa_akhdood', name: 'الأخدود', logo: 'https://media.api-sports.io/football/teams/2948.png' },
  { id: 'sa_orobah', name: 'العروبة', logo: 'https://media.api-sports.io/football/teams/2949.png' },
  { id: 'sa_kholood', name: 'الخلود', logo: 'https://media.api-sports.io/football/teams/2950.png' },
];

export const NATIONAL_TEAMS = [
  // المنتخبات العربية
  { id: 'nt_ksa', name: 'منتخب السعودية', logo: 'https://flagcdn.com/w160/sa.png' },
  { id: 'nt_egy', name: 'منتخب مصر', logo: 'https://flagcdn.com/w160/eg.png' },
  { id: 'nt_irq', name: 'منتخب العراق', logo: 'https://flagcdn.com/w160/iq.png' },
  { id: 'nt_mar', name: 'منتخب المغرب', logo: 'https://flagcdn.com/w160/ma.png' },
  { id: 'nt_dza', name: 'منتخب الجزائر', logo: 'https://flagcdn.com/w160/dz.png' },
  { id: 'nt_tun', name: 'منتخب تونس', logo: 'https://flagcdn.com/w160/tn.png' },
  { id: 'nt_qat', name: 'منتخب قطر', logo: 'https://flagcdn.com/w160/qa.png' },
  { id: 'nt_uae', name: 'منتخب الإمارات', logo: 'https://flagcdn.com/w160/ae.png' },
  { id: 'nt_jor', name: 'منتخب الأردن', logo: 'https://flagcdn.com/w160/jo.png' },
  { id: 'nt_omn', name: 'منتخب عُمان', logo: 'https://flagcdn.com/w160/om.png' },
  { id: 'nt_bhr', name: 'منتخب البحرين', logo: 'https://flagcdn.com/w160/bh.png' },
  { id: 'nt_kwt', name: 'منتخب الكويت', logo: 'https://flagcdn.com/w160/kw.png' },
  { id: 'nt_pse', name: 'منتخب فلسطين', logo: 'https://flagcdn.com/w160/ps.png' },
  { id: 'nt_syr', name: 'منتخب سوريا', logo: 'https://flagcdn.com/w160/sy.png' },
  { id: 'nt_lbn', name: 'منتخب لبنان', logo: 'https://flagcdn.com/w160/lb.png' },
  { id: 'nt_sdn', name: 'منتخب السودان', logo: 'https://flagcdn.com/w160/sd.png' },
  { id: 'nt_lby', name: 'منتخب ليبيا', logo: 'https://flagcdn.com/w160/ly.png' },
  { id: 'nt_yem', name: 'منتخب اليمن', logo: 'https://flagcdn.com/w160/ye.png' },
  { id: 'nt_mrt', name: 'منتخب موريتانيا', logo: 'https://flagcdn.com/w160/mr.png' },

  // المنتخبات العالمية الكبرى
  { id: 'nt_bra', name: 'منتخب البرازيل', logo: 'https://flagcdn.com/w160/br.png' },
  { id: 'nt_arg', name: 'منتخب الأرجنتين', logo: 'https://flagcdn.com/w160/ar.png' },
  { id: 'nt_fra', name: 'منتخب فرنسا', logo: 'https://flagcdn.com/w160/fr.png' },
  { id: 'nt_eng', name: 'منتخب إنجلترا', logo: 'https://flagcdn.com/w160/gb-eng.png' },
  { id: 'nt_esp', name: 'منتخب إسبانيا', logo: 'https://flagcdn.com/w160/es.png' },
  { id: 'nt_deu', name: 'منتخب ألمانيا', logo: 'https://flagcdn.com/w160/de.png' },
  { id: 'nt_ita', name: 'منتخب إيطاليا', logo: 'https://flagcdn.com/w160/it.png' },
  { id: 'nt_prt', name: 'منتخب البرتغال', logo: 'https://flagcdn.com/w160/pt.png' },
  { id: 'nt_nld', name: 'منتخب هولندا', logo: 'https://flagcdn.com/w160/nl.png' },
  { id: 'nt_bel', name: 'منتخب بلجيكا', logo: 'https://flagcdn.com/w160/be.png' },
  { id: 'nt_hrv', name: 'منتخب كرواتيا', logo: 'https://flagcdn.com/w160/hr.png' },
  { id: 'nt_ury', name: 'منتخب الأوروغواي', logo: 'https://flagcdn.com/w160/uy.png' },
  { id: 'nt_jpn', name: 'منتخب اليابان', logo: 'https://flagcdn.com/w160/jp.png' },
  { id: 'nt_kor', name: 'منتخب كوريا الجنوبية', logo: 'https://flagcdn.com/w160/kr.png' },
  { id: 'nt_sen', name: 'منتخب السنغال', logo: 'https://flagcdn.com/w160/sn.png' },
  { id: 'nt_usa', name: 'منتخب الولايات المتحدة', logo: 'https://flagcdn.com/w160/us.png' },
];

let hasSeeded = false;
let seedingPromise: Promise<{ leaguesCount: number; teamsCount: number }> | null = null;

/**
 * Ensures Saudi League and National Teams are seeded in the database without duplicates.
 */
export async function seedSaudiAndNationalTeams(): Promise<{ leaguesCount: number; teamsCount: number }> {
  if (hasSeeded) {
    return { leaguesCount: 0, teamsCount: 0 };
  }
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      let seededLeagues = 0;
      let seededTeams = 0;

      // 1. Seed Leagues
      for (const league of ADDITIONAL_LEAGUES) {
        const existing = await db
          .select()
          .from(leagues)
          .where(ilike(leagues.name, league.name));

        if (existing.length === 0) {
          await db
            .insert(leagues)
            .values({
              id: league.id,
              name: league.name,
              logo: league.logo,
            })
            .onConflictDoNothing();
          seededLeagues++;
        }
      }

      // 2. Seed Saudi Teams
      for (const team of SAUDI_TEAMS) {
        const existing = await db
          .select()
          .from(teams)
          .where(ilike(teams.name, team.name));

        if (existing.length === 0) {
          await db
            .insert(teams)
            .values({
              id: team.id,
              name: team.name,
              logo: team.logo,
            })
            .onConflictDoNothing();
          seededTeams++;
        }
      }

      // 3. Seed National Teams
      for (const team of NATIONAL_TEAMS) {
        const existing = await db
          .select()
          .from(teams)
          .where(ilike(teams.name, team.name));

        if (existing.length === 0) {
          await db
            .insert(teams)
            .values({
              id: team.id,
              name: team.name,
              logo: team.logo,
            })
            .onConflictDoNothing();
          seededTeams++;
        }
      }

      hasSeeded = true;
      return { leaguesCount: seededLeagues, teamsCount: seededTeams };
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

import { db } from '../src/db/index.ts';
import { teams } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function updateTeams() {
  console.log('=== APPLYING VERIFIED TEAM IDENTITY & LOGO UPDATES ===\n');

  const VERIFIED_UPDATES: Record<string, { apiTeamId: number | null; nameEn: string; logo: string | null }> = {
    sa_ittihad: { apiTeamId: 2930, nameEn: 'Al-Ittihad FC', logo: 'https://media.api-sports.io/football/teams/2930.png' },
    sa_ahli: { apiTeamId: 2931, nameEn: 'Al-Ahli Saudi FC', logo: 'https://media.api-sports.io/football/teams/2931.png' },
    sa_hilal: { apiTeamId: 2932, nameEn: 'Al-Hilal Saudi FC', logo: 'https://media.api-sports.io/football/teams/2932.png' },
    sa_raed: { apiTeamId: 2933, nameEn: 'Al-Raed', logo: 'https://media.api-sports.io/football/teams/2933.png' },
    sa_fateh: { apiTeamId: 2934, nameEn: 'Al-Fateh', logo: 'https://media.api-sports.io/football/teams/2934.png' },
    sa_taawoun: { apiTeamId: 2935, nameEn: 'Al-Taawoun', logo: 'https://media.api-sports.io/football/teams/2935.png' },
    sa_shabab: { apiTeamId: 2936, nameEn: 'Al-Shabab', logo: 'https://media.api-sports.io/football/teams/2936.png' },
    sa_ettifaq: { apiTeamId: 2937, nameEn: 'Al-Ettifaq', logo: 'https://media.api-sports.io/football/teams/2937.png' },
    sa_fayha: { apiTeamId: 2938, nameEn: 'Al-Fayha', logo: 'https://media.api-sports.io/football/teams/2938.png' },
    sa_nassr: { apiTeamId: 2939, nameEn: 'Al-Nassr', logo: 'https://media.api-sports.io/football/teams/2939.png' },
    sa_qadsiah: { apiTeamId: 2940, nameEn: 'Al-Qadsiah', logo: 'https://media.api-sports.io/football/teams/2940.png' },
    sa_damac: { apiTeamId: 2941, nameEn: 'Damac', logo: 'https://media.api-sports.io/football/teams/2941.png' },
    sa_khaleej: { apiTeamId: 2942, nameEn: 'Al-Khaleej', logo: 'https://media.api-sports.io/football/teams/2942.png' },
    sa_riyadh: { apiTeamId: 2943, nameEn: 'Al-Riyadh', logo: 'https://media.api-sports.io/football/teams/2943.png' },
    sa_wehda: { apiTeamId: 2944, nameEn: 'Al-Wehda', logo: 'https://media.api-sports.io/football/teams/2944.png' },

    // Yelo teams with invalid old IDs 364-387: Set apiTeamId and logo to null to avoid wrong crests
    sa_orobah: { apiTeamId: null, nameEn: 'Al-Orobah', logo: null },
    sa_kholood: { apiTeamId: null, nameEn: 'Al-Kholood', logo: null },
    sa_akhdood: { apiTeamId: null, nameEn: 'Al-Akhdood', logo: null },
    sa_hazem: { apiTeamId: null, nameEn: 'Al-Hazem', logo: null },
    sa_batin: { apiTeamId: null, nameEn: 'Al-Batin', logo: null },
    sa_abha: { apiTeamId: null, nameEn: 'Abha', logo: null },
    sa_tai: { apiTeamId: null, nameEn: 'Al-Tai', logo: null },
    sa_faisaly: { apiTeamId: null, nameEn: 'Al-Faisaly', logo: null },
    sa_adalah: { apiTeamId: null, nameEn: 'Al-Adalah', logo: null },
    sa_ohod: { apiTeamId: null, nameEn: 'Ohod', logo: null },
    sa_jabalain: { apiTeamId: null, nameEn: 'Al-Jabalain', logo: null },
    sa_hajer: { apiTeamId: null, nameEn: 'Hajer', logo: null },
    sa_najran: { apiTeamId: null, nameEn: 'Najran', logo: null },
    sa_najma: { apiTeamId: null, nameEn: 'Al-Najma', logo: null },
    sa_ain: { apiTeamId: null, nameEn: 'Al-Ain Saudi', logo: null },
    sa_arabi: { apiTeamId: null, nameEn: 'Al-Arabi Saudi', logo: null },
    sa_bukiryah: { apiTeamId: null, nameEn: 'Al-Bukiryah', logo: null },
    sa_jandal: { apiTeamId: null, nameEn: 'Al-Jandal', logo: null },
    sa_jeddah: { apiTeamId: null, nameEn: 'Jeddah', logo: null },
    sa_zulfi: { apiTeamId: null, nameEn: 'Al-Zulfi', logo: null },
    sa_jubail: { apiTeamId: null, nameEn: 'Al-Jubail', logo: null },
    sa_safa: { apiTeamId: null, nameEn: 'Al-Safa', logo: null },
    sa_diriyah: { apiTeamId: null, nameEn: 'Al-Diriyah', logo: null },
    sa_taraji: { apiTeamId: null, nameEn: 'Al-Taraji Saudi', logo: null },
  };

  let updatedCount = 0;

  for (const [teamId, data] of Object.entries(VERIFIED_UPDATES)) {
    const existing = await db.select().from(teams).where(eq(teams.id, teamId));
    if (existing.length > 0) {
      await db
        .update(teams)
        .set({
          apiTeamId: data.apiTeamId,
          logo: data.logo,
        })
        .where(eq(teams.id, teamId));
      console.log(`Updated team [${teamId}]: apiTeamId=${data.apiTeamId}, logo=${data.logo}`);
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} teams in database.`);
  process.exit(0);
}

updateTeams().catch(console.error);

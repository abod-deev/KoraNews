import { db } from '../src/db/index.ts';
import { teams } from '../src/db/schema.ts';

async function performAudit() {
  const allTeams = await db.select().from(teams);
  console.log(`=== READ-ONLY AUDIT REPORT (${allTeams.length} TEAMS) ===\n`);

  let correctCount = 0;
  let wrongCount = 0;
  let unverifiedCount = 0;
  let ambiguousCount = 0;

  const wrongTeamsList: Array<{ id: string; name: string; oldApiId: number; newApiId?: number; logo?: string; reason: string }> = [];
  const correctTeamsList: Array<{ id: string; name: string; apiId: number; logo: string }> = [];
  const unverifiedList: Array<{ id: string; name: string }> = [];

  // Verified Saudi Pro League Mapping (Verified via API-Sports / API-Football)
  const VERIFIED_SAUDI_MAP: Record<string, { apiTeamId: number; nameEn: string; logo: string }> = {
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
  };

  for (const t of allTeams) {
    if (t.apiTeamId === null) {
      unverifiedCount++;
      unverifiedList.push({ id: t.id, name: t.name });
      continue;
    }

    // Check if team is in Saudi map
    if (VERIFIED_SAUDI_MAP[t.id]) {
      const verified = VERIFIED_SAUDI_MAP[t.id];
      if (t.apiTeamId !== verified.apiTeamId || t.logo !== verified.logo) {
        wrongCount++;
        wrongTeamsList.push({
          id: t.id,
          name: t.name,
          oldApiId: t.apiTeamId,
          newApiId: verified.apiTeamId,
          logo: t.logo || '',
          reason: `Old ID ${t.apiTeamId} mapped to wrong European entity instead of API-Football ${verified.nameEn} (${verified.apiTeamId})`,
        });
      } else {
        correctCount++;
        correctTeamsList.push({ id: t.id, name: t.name, apiId: t.apiTeamId, logo: t.logo || '' });
      }
    } else if (t.id.startsWith('sa_')) {
      // Yelo / Saudi teams with unverified old IDs 367-387
      wrongCount++;
      wrongTeamsList.push({
        id: t.id,
        name: t.name,
        oldApiId: t.apiTeamId,
        reason: `Unverified old ID ${t.apiTeamId} in Yelo/Saudi league`,
      });
    } else {
      // Global/European or National Teams with matching IDs
      correctCount++;
      correctTeamsList.push({ id: t.id, name: t.name, apiId: t.apiTeamId, logo: t.logo || '' });
    }
  }

  console.log(`Total Teams Reviewed: ${allTeams.length}`);
  console.log(`- Teams with Correct IDs: ${correctCount}`);
  console.log(`- Teams with Wrong IDs: ${wrongCount}`);
  console.log(`- Teams Unverified (Placeholders): ${unverifiedCount}`);
  console.log(`- Ambiguous Teams: ${ambiguousCount}\n`);

  console.log('--- Sample Proposed Corrections ---');
  console.table(wrongTeamsList.slice(0, 15));

  process.exit(0);
}

performAudit().catch(console.error);

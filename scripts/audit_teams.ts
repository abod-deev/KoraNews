import { db } from '../src/db/index.ts';
import { teams } from '../src/db/schema.ts';

async function auditDatabaseTeams() {
  console.log('=== STEP 1: READ-ONLY DATABASE AUDIT ===\n');

  const allTeams = await db.select().from(teams);
  console.log(`Total teams in DB: ${allTeams.length}`);

  const teamsWithApiId = allTeams.filter((t) => t.apiTeamId !== null);
  const teamsWithoutApiId = allTeams.filter((t) => t.apiTeamId === null);

  console.log(`Teams with apiTeamId: ${teamsWithApiId.length}`);
  console.log(`Teams without apiTeamId (placeholders): ${teamsWithoutApiId.length}\n`);

  // Let's check candidate IDs and image URLs
  const checkLogos: Array<{ id: string; name: string; apiTeamId: number | null; logo: string | null }> = [];

  for (const t of allTeams) {
    checkLogos.push({
      id: t.id,
      name: t.name,
      apiTeamId: t.apiTeamId,
      logo: t.logo,
    });
  }

  // Print first 20 teams
  console.log('Sample teams in DB:');
  console.table(checkLogos.slice(0, 20));
}

auditDatabaseTeams().catch(console.error);

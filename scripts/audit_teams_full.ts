import { db } from '../src/db/index.ts';
import { teams } from '../src/db/schema.ts';

async function runAudit() {
  const allDbTeams = await db.select().from(teams);
  console.log(`=== FULL READ-ONLY AUDIT OF DB TEAMS (${allDbTeams.length} teams) ===\n`);

  // Target Saudi 8 teams
  const targetSaudiNames = [
    'الاتحاد',
    'الهلال',
    'الأهلي',
    'الاهلي',
    'النصر',
    'الاتفاق',
    'القادسية',
    'الشباب',
    'الفيحاء'
  ];

  const saudi8Db = allDbTeams.filter((t) =>
    targetSaudiNames.some((n) => t.name.includes(n) || t.id.includes(n))
  );

  console.log('--- DB Records for Target 8 Saudi Teams ---');
  saudi8Db.forEach((t) => {
    console.log(`ID: ${t.id} | Name: "${t.name}" | apiTeamId: ${t.apiTeamId} | logo: ${t.logo}`);
  });

  process.exit(0);
}

runAudit().catch(console.error);

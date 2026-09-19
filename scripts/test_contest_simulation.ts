import 'dotenv/config';
import { db } from '../src/db/index.ts';
import {
  users,
  contestSettings,
  contestParticipants,
  predictionMatches,
  predictions,
  predictionPoints,
  matches,
  leagues,
  teams,
} from '../src/db/schema.ts';
import { eq, and, inArray, desc, sum } from 'drizzle-orm';
import {
  getOrCreateLeague,
  getOrCreateTeam,
  confirmAndEvaluatePredictionMatch,
  recalculateContestPredictions,
  getUserPredictionStats,
  getLeaderboard,
  getGoldenLeaderboard,
  getAdminPredictionStats,
  calculateGoldenPoints,
} from '../src/services/predictionService.ts';

async function runContestSimulation() {
  console.log('====================================================');
  console.log('🚀 بدء اختبار نظام المسابقات والتوقعات الشامل (100 مباراة)');
  console.log('====================================================\n');

  // 1. Check or Prepare Contest
  let contest = await db.query.contestSettings.findFirst({
    where: eq(contestSettings.status, 'active'),
  });

  if (!contest) {
    const existingAny = await db.query.contestSettings.findFirst();
    if (existingAny) {
      const [updated] = await db
        .update(contestSettings)
        .set({
          name: 'مسابقة التوقعات الكبرى - دورة الاختبار الشاملة',
          description: 'مسابقة تجريبية تحتوي على 100 مباراة و100 توقع لكل متسابق للتحقق من دقة احتساب النقاط والتوقعات الذهبية',
          status: 'active',
          registrationStartDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          registrationEndDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          predictionsStartDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          contestEndDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(contestSettings.id, (existingAny as unknown as { id: number }).id))
        .returning();
      contest = updated;
    } else {
      const [created] = await db
        .insert(contestSettings)
        .values({
          name: 'مسابقة التوقعات الكبرى - دورة الاختبار الشاملة',
          description: 'مسابقة تجريبية تحتوي على 100 مباراة و100 توقع لكل متسابق للتحقق من دقة احتساب النقاط والتوقعات الذهبية',
          status: 'active',
          registrationStartDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          registrationEndDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          predictionsStartDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          contestEndDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        })
        .returning();
      contest = created;
    }
  }

  const contestId = contest.id;
  console.log(`📌 المسابقة النشطة: [${contest.id}] "${contest.name}"`);

  // 2. Clear old test data for this contest
  console.log('🧹 تنظيف البيانات السابقة للمسابقة...');
  await db.delete(predictionPoints).where(eq(predictionPoints.contestId, contestId));
  await db.delete(predictions).where(eq(predictions.contestId, contestId));
  await db.delete(predictionMatches).where(eq(predictionMatches.contestId, contestId));

  // 3. Identify / Setup target users
  const allExistingUsers = await db.select().from(users);
  
  // Abdullah Al-Rai (User 1)
  let userAbdullah = allExistingUsers.find((u) => u.id === 1 || u.name === 'عبدالله الراعي' || u.email === 'abod46071@gmail.com');
  if (!userAbdullah) {
    const [u] = await db.insert(users).values({
      uid: `uid_abdullah_${Date.now()}`,
      name: 'عبدالله الراعي',
      email: 'abod46071@gmail.com',
      role: 'owner',
      isAdmin: true,
    }).returning();
    userAbdullah = u;
  }

  // Aboud Ahmad (User 2)
  let userAboud = allExistingUsers.find((u) => u.id === 63 || u.name === 'عبود احمد' || u.email === 'abod460071@gmail.com');
  if (!userAboud) {
    const [u] = await db.insert(users).values({
      uid: `uid_aboud_${Date.now()}`,
      name: 'عبود احمد',
      email: 'abod460071@gmail.com',
      role: 'admin',
      isAdmin: true,
    }).returning();
    userAboud = u;
  }

  // Japanese 2 (User 3)
  let userJapan = allExistingUsers.find((u) => u.name === 'ياباني 2' || u.email === 'japan46071@gmail.com');
  if (!userJapan) {
    const [u] = await db.insert(users).values({
      uid: `uid_japan_${Date.now()}`,
      name: 'ياباني 2',
      email: 'japan46071@gmail.com',
      role: 'user',
    }).returning();
    userJapan = u;
  }

  // Additional participant users from existing accounts or create with uid
  const otherUsersList: typeof users.$inferSelect[] = [];
  const existingFiltered = allExistingUsers.filter(
    (u) => u.id !== userAbdullah!.id && u.id !== userAboud!.id && (userJapan ? u.id !== userJapan.id : true)
  );

  const otherNames = ['فهد الدوسري', 'سلطان القحطاني', 'محمد العتيبي', 'خالد الشمري', 'سعد الشهري'];
  
  for (let i = 0; i < otherNames.length; i++) {
    const name = otherNames[i];
    const email = `contestant_${i + 1}@koranews.test`;
    let found = allExistingUsers.find((u) => u.name === name || u.email === email);
    if (!found) {
      // If we have an unused existing account from DB, we can use it or rename it, or insert with uid
      const unused = existingFiltered[i];
      if (unused) {
        found = unused;
      } else {
        const [u] = await db.insert(users).values({
          uid: `uid_sim_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          email,
          role: 'user',
        }).returning();
        found = u;
      }
    }
    otherUsersList.push(found);
  }

  const participantUsers = [userAbdullah, userAboud, userJapan, ...otherUsersList];
  console.log(`👥 عدد المتسابقين المشاركين: ${participantUsers.length}`);
  for (const u of participantUsers) {
    console.log(`   - [ID: ${u.id}] ${u.name} (${u.email})`);
  }

  // 4. Ensure all participants are approved in this contest
  for (const u of participantUsers) {
    const pExisting = await db.query.contestParticipants.findFirst({
      where: and(
        eq(contestParticipants.userId, u.id),
        eq(contestParticipants.contestId, contestId)
      ),
    });
    if (!pExisting) {
      await db.insert(contestParticipants).values({
        userId: u.id,
        contestId: contestId,
        status: 'approved',
        appliedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: userAbdullah.id,
      });
    } else if (pExisting.status !== 'approved') {
      await db.update(contestParticipants)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(contestParticipants.id, pExisting.id));
    }
  }

  // 5. Create 100 Realistic Matches
  console.log('\n⚽ إنشاء 100 مباراة في مسابقة التوقعات...');
  const teamsCatalog = [
    { name: 'الهلال', logo: 'https://crests.football-data.org/al_hilal.png' },
    { name: 'النصر', logo: 'https://crests.football-data.org/al_nassr.png' },
    { name: 'الاتحاد', logo: 'https://crests.football-data.org/al_ittihad.png' },
    { name: 'الأهلي', logo: 'https://crests.football-data.org/al_ahli.png' },
    { name: 'الشباب', logo: 'https://crests.football-data.org/al_shabab.png' },
    { name: 'الاتفاق', logo: 'https://crests.football-data.org/al_ettifaq.png' },
    { name: 'التعاون', logo: 'https://crests.football-data.org/al_taawoun.png' },
    { name: 'الفهد', logo: 'https://crests.football-data.org/al_fateh.png' },
    { name: 'ضمك', logo: 'https://crests.football-data.org/damac.png' },
    { name: 'الفيحاء', logo: 'https://crests.football-data.org/al_fayha.png' },
    { name: 'ريال مدريد', logo: 'https://crests.football-data.org/86.png' },
    { name: 'برشلونة', logo: 'https://crests.football-data.org/81.png' },
    { name: 'أتلتيكو مدريد', logo: 'https://crests.football-data.org/78.png' },
    { name: 'مانشستر سيتي', logo: 'https://crests.football-data.org/65.png' },
    { name: 'ليفربول', logo: 'https://crests.football-data.org/64.png' },
    { name: 'أرسنال', logo: 'https://crests.football-data.org/57.png' },
    { name: 'بايرن ميونخ', logo: 'https://crests.football-data.org/5.png' },
    { name: 'باريس سان جيرمان', logo: 'https://crests.football-data.org/524.png' },
    { name: 'إنتر ميلان', logo: 'https://crests.football-data.org/108.png' },
    { name: 'يوفنتوس', logo: 'https://crests.football-data.org/109.png' },
  ];

  const leaguesList = [
    { name: 'دوري روشن السعودي', logo: 'https://crests.football-data.org/SPL.png' },
    { name: 'دوري أبطال أوروبا', logo: 'https://crests.football-data.org/CL.png' },
    { name: 'الدوري الإنجليزي الممتاز', logo: 'https://crests.football-data.org/PL.png' },
    { name: 'الدوري الإسباني', logo: 'https://crests.football-data.org/PD.png' },
  ];

  interface MatchPlan {
    matchNumber: number;
    homeTeam: string;
    homeLogo: string;
    awayTeam: string;
    awayLogo: string;
    league: string;
    leagueLogo: string;
    actualHomeScore: number;
    actualAwayScore: number;
  }

  const matchesPlan: MatchPlan[] = [];
  for (let i = 1; i <= 100; i++) {
    const tHome = teamsCatalog[(i * 3) % teamsCatalog.length];
    let tAway = teamsCatalog[(i * 3 + 1) % teamsCatalog.length];
    if (tAway.name === tHome.name) {
      tAway = teamsCatalog[(i * 3 + 2) % teamsCatalog.length];
    }
    const lg = leaguesList[i % leaguesList.length];
    
    // Scores varied realistic results
    const scorePatterns = [
      [2, 1], [1, 0], [3, 1], [0, 0], [2, 2], [1, 1], [3, 2], [2, 0], [0, 2], [1, 3],
      [1, 2], [4, 1], [0, 1], [3, 0], [2, 3], [1, 4], [0, 3], [3, 3], [4, 2], [2, 4]
    ];
    const [hScore, aScore] = scorePatterns[(i - 1) % scorePatterns.length];

    matchesPlan.push({
      matchNumber: i,
      homeTeam: tHome.name,
      homeLogo: tHome.logo,
      awayTeam: tAway.name,
      awayLogo: tAway.logo,
      league: lg.name,
      leagueLogo: lg.logo,
      actualHomeScore: hScore,
      actualAwayScore: aScore,
    });
  }

  // Insert 100 predictionMatches into DB
  const createdPredictionMatches: Array<typeof predictionMatches.$inferSelect & { actualHomeScore: number; actualAwayScore: number; matchNumber: number }> = [];

  for (const mp of matchesPlan) {
    const matchDate = new Date(Date.now() - (101 - mp.matchNumber) * 3600 * 1000); // in the past so already played
    const [pm] = await db.insert(predictionMatches).values({
      contestId: contestId,
      customLeagueName: mp.league,
      customLeagueLogo: mp.leagueLogo,
      customHomeName: mp.homeTeam,
      customHomeLogo: mp.homeLogo,
      customAwayName: mp.awayTeam,
      customAwayLogo: mp.awayLogo,
      customMatchDate: matchDate,
      customHomeScore: mp.actualHomeScore,
      customAwayScore: mp.actualAwayScore,
      customStatus: 'FINISHED',
      pointsPerMatch: 2,
      isActive: true,
      isExternal: true,
      isConfirmedByAdmin: false,
      isCalculated: false,
    }).returning();

    createdPredictionMatches.push({
      ...pm,
      actualHomeScore: mp.actualHomeScore,
      actualAwayScore: mp.actualAwayScore,
      matchNumber: mp.matchNumber,
    });
  }

  console.log(`✅ تم إنشاء 100 مباراة بنجاح في قاعدة البيانات.`);

  // 6. Plan Predictions for each match according to EXACT criteria:
  // User 1: "عبدالله الراعي" (userAbdullah.id):
  //   - Exactly 80 correct predictions.
  //   - Exactly 20 incorrect predictions.
  //   - Exactly 10 Golden predictions (where Abdullah is the ONLY correct predictor).
  //
  // User 2: "عبود احمد" (userAboud.id):
  //   - Exactly 70 correct predictions.
  //   - Exactly 30 incorrect predictions.
  //   - Exactly 15 Golden predictions (where Aboud is the ONLY correct predictor).
  //
  // Partition of 100 matches:
  // - Matches 1 to 10 (10 matches):
  //     Abdullah: CORRECT (10) -> GOLDEN! (No one else is correct)
  //     Aboud: INCORRECT
  //     Others: INCORRECT
  // - Matches 11 to 25 (15 matches):
  //     Aboud: CORRECT (15) -> GOLDEN! (No one else is correct)
  //     Abdullah: INCORRECT (15)
  //     Others: INCORRECT
  // - Matches 26 to 80 (55 matches):
  //     Abdullah: CORRECT (55) -> (Abdullah running total correct: 10 + 55 = 65)
  //     Aboud: CORRECT (55) -> (Aboud running total correct: 15 + 55 = 70 [Aboud reaches 70 target!])
  //     Others: Randomly correct or incorrect (so both have >= 2 correct predictors, no golden).
  // - Matches 81 to 95 (15 matches):
  //     Abdullah: CORRECT (15) -> (Abdullah running total correct: 65 + 15 = 80 [Abdullah reaches 80 target!])
  //     Aboud: INCORRECT (15) -> (Aboud running total incorrect: 10 + 15 = 25 + 5 later = 30)
  //     Others: At least one of 'Others' is CORRECT (so Abdullah has a partner, NOT golden).
  // - Matches 96 to 100 (5 matches):
  //     Abdullah: INCORRECT (5) -> (Abdullah total incorrect: 15 + 5 = 20 [Abdullah reaches 20 incorrect target!])
  //     Aboud: INCORRECT (5) -> (Aboud total incorrect: 10 + 15 + 5 = 30 [Aboud reaches 30 incorrect target!])
  //     Others: Random
  //
  // Let's verify totals:
  // Abdullah:
  //   Correct: 10 (golden) + 55 + 15 = 80 correct! (with 10 golden!)
  //   Incorrect: 15 + 5 = 20 incorrect!
  //   Total = 100 predictions.
  //
  // Aboud:
  //   Correct: 15 (golden) + 55 = 70 correct! (with 15 golden!)
  //   Incorrect: 10 + 15 + 5 = 30 incorrect!
  //   Total = 100 predictions.

  console.log('\n🎯 بناء التوقعات لجميع المتسابقين (100 توقع لكل متسابق)...');

  const insertPredRows: Array<{
    userId: number;
    predictionMatchId: number;
    contestId: number;
    homeScore: number;
    awayScore: number;
    pointsEarned: number;
    isEvaluated: boolean;
    isGolden: boolean;
    goldenPoints: number;
  }> = [];

  for (let mIdx = 0; mIdx < 100; mIdx++) {
    const matchNum = mIdx + 1; // 1 to 100
    const pm = createdPredictionMatches[mIdx];
    const actualH = pm.actualHomeScore;
    const actualA = pm.actualAwayScore;
    const wrongH = actualH + 1;
    const wrongA = actualA + 2;

    // 1. Abdullah prediction
    let abdullahCorrect = false;
    if (matchNum <= 10) {
      abdullahCorrect = true; // Golden match for Abdullah
    } else if (matchNum >= 11 && matchNum <= 25) {
      abdullahCorrect = false; // Aboud golden match
    } else if (matchNum >= 26 && matchNum <= 80) {
      abdullahCorrect = true; // Shared correct
    } else if (matchNum >= 81 && matchNum <= 95) {
      abdullahCorrect = true; // Shared correct with others
    } else {
      abdullahCorrect = false; // Incorrect
    }

    insertPredRows.push({
      userId: userAbdullah.id,
      predictionMatchId: pm.id,
      contestId: contestId,
      homeScore: abdullahCorrect ? actualH : wrongH,
      awayScore: abdullahCorrect ? actualA : wrongA,
      pointsEarned: 0,
      isEvaluated: false,
      isGolden: false,
      goldenPoints: 0,
    });

    // 2. Aboud prediction
    let aboudCorrect = false;
    if (matchNum <= 10) {
      aboudCorrect = false; // Abdullah golden match
    } else if (matchNum >= 11 && matchNum <= 25) {
      aboudCorrect = true; // Golden match for Aboud
    } else if (matchNum >= 26 && matchNum <= 80) {
      aboudCorrect = true; // Shared correct
    } else {
      aboudCorrect = false; // Incorrect (matches 81-100)
    }

    insertPredRows.push({
      userId: userAboud.id,
      predictionMatchId: pm.id,
      contestId: contestId,
      homeScore: aboudCorrect ? actualH : wrongH,
      awayScore: aboudCorrect ? actualA : wrongA,
      pointsEarned: 0,
      isEvaluated: false,
      isGolden: false,
      goldenPoints: 0,
    });

    // 3. Other contestants predictions
    const otherUsers = [userJapan, ...otherUsersList];
    for (let uIdx = 0; uIdx < otherUsers.length; uIdx++) {
      const u = otherUsers[uIdx];
      let userCorrect = false;

      if (matchNum <= 10) {
        // Abdullah Golden -> MUST be incorrect for all others
        userCorrect = false;
      } else if (matchNum >= 11 && matchNum <= 25) {
        // Aboud Golden -> MUST be incorrect for all others
        userCorrect = false;
      } else if (matchNum >= 81 && matchNum <= 95) {
        // Must have at least 1 other correct so Abdullah is not golden
        if (uIdx === 0) {
          userCorrect = true; // Japanese 2 gets correct
        } else {
          userCorrect = (matchNum + uIdx) % 3 === 0;
        }
      } else {
        // Random distribution for remaining matches (matches 26-80 and 96-100)
        userCorrect = (matchNum + uIdx) % 2 === 0;
      }

      const altWrongH = (actualH + uIdx + 1) % 5;
      const altWrongA = (actualA + uIdx + 2) % 5;

      insertPredRows.push({
        userId: u.id,
        predictionMatchId: pm.id,
        contestId: contestId,
        homeScore: userCorrect ? actualH : altWrongH,
        awayScore: userCorrect ? actualA : altWrongA,
        pointsEarned: 0,
        isEvaluated: false,
        isGolden: false,
        goldenPoints: 0,
      });
    }
  }

  // Batch insert predictions
  console.log(`📥 إدراج ${insertPredRows.length} توقع في قاعدة البيانات...`);
  // Insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < insertPredRows.length; i += chunkSize) {
    const chunk = insertPredRows.slice(i, i + chunkSize);
    await db.insert(predictions).values(chunk);
  }
  console.log(`✅ تم حفظ جميع التوقعات بنجاح.`);

  // 7. Evaluate and Confirm all 100 matches
  console.log('\n⚖️ تقييم واحتساب نتائج الـ 100 مباراة وتوزيع النقاط والجوائز الذهبية...');
  for (let i = 0; i < createdPredictionMatches.length; i++) {
    const pm = createdPredictionMatches[i];
    await confirmAndEvaluatePredictionMatch(
      pm.id,
      userAbdullah.id,
      pm.actualHomeScore,
      pm.actualAwayScore
    );
  }
  console.log(`✅ تم تقييم جميع الـ 100 مباراة بنجاح.`);

  // 8. Run Audit & Recalculation to guarantee integrity
  console.log('\n🔍 تشغيل التدقيق وإعادة الاحتساب الذاتي (Contest Recalculation Audit)...');
  const auditResult = await recalculateContestPredictions(userAbdullah.id, contestId);
  console.log(`✅ نتيجة التدقيق: ${auditResult.message} (${auditResult.evaluatedMatchesCount} مباراة، ${auditResult.totalPointsRecalculated} نقطة موثقة في السجل)`);

  // 9. Fetch & Print User Stats
  console.log('\n====================================================');
  console.log('📊 نتائج وإحصائيات المتسابقين الرسمية بعد انتهاء الـ 100 مباراة:');
  console.log('====================================================');

  // Stats for Abdullah Al-Rai
  const statsAbdullah = await getUserPredictionStats(userAbdullah.id, contestId);
  console.log(`\n👑 المتسابق الأول: "${userAbdullah.name}" (الترتيب العام: #${statsAbdullah.userRank} | الترتيب الذهبي: #${statsAbdullah.goldenRank})`);
  console.log(`   - إجمالي التوقعات: ${statsAbdullah.totalPredictions} / 100`);
  console.log(`   - التوقعات الصحيحة: ${statsAbdullah.correctPredictions} (المطلوب: 80) -> ${statsAbdullah.correctPredictions === 80 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - التوقعات الخاطئة: ${statsAbdullah.wrongPredictions} (المطلوب: 20) -> ${statsAbdullah.wrongPredictions === 20 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - التوقعات الذهبية: ${statsAbdullah.goldenPredictions} (المطلوب: 10) -> ${statsAbdullah.goldenPredictions === 10 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - نقاط التوقعات الذهبية: ${statsAbdullah.goldenPoints} (10 أساسية + 3 بونص ثلاثيات = 13 نقطة)`);
  console.log(`   - إجمالي النقاط الكلي: ${statsAbdullah.totalPoints} نقطة`);
  console.log(`   - نسبة الدقة والنجاح: ${statsAbdullah.successRate}%`);

  // Stats for Aboud Ahmad
  const statsAboud = await getUserPredictionStats(userAboud.id, contestId);
  console.log(`\n⭐ المتسابق الثاني: "${userAboud.name}" (الترتيب العام: #${statsAboud.userRank} | الترتيب الذهبي: #${statsAboud.goldenRank})`);
  console.log(`   - إجمالي التوقعات: ${statsAboud.totalPredictions} / 100`);
  console.log(`   - التوقعات الصحيحة: ${statsAboud.correctPredictions} (المطلوب: 70) -> ${statsAboud.correctPredictions === 70 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - التوقعات الخاطئة: ${statsAboud.wrongPredictions} (المطلوب: 30) -> ${statsAboud.wrongPredictions === 30 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - التوقعات الذهبية: ${statsAboud.goldenPredictions} (المطلوب: 15) -> ${statsAboud.goldenPredictions === 15 ? '✅ مطابق تماماً' : '❌ غير مطابق'}`);
  console.log(`   - نقاط التوقعات الذهبية: ${statsAboud.goldenPoints} (15 أساسية + 5 بونص ثلاثيات = 20 نقطة)`);
  console.log(`   - إجمالي النقاط الكلي: ${statsAboud.totalPoints} نقطة`);
  console.log(`   - نسبة الدقة والنجاح: ${statsAboud.successRate}%`);

  // Stats for other participants
  console.log(`\n👥 باقي المتسابقين (عشوائي):`);
  for (const u of [userJapan, ...otherUsersList]) {
    const st = await getUserPredictionStats(u.id, contestId);
    console.log(`   - ${u.name}: ${st.correctPredictions} صحيح | ${st.wrongPredictions} خاطئ | ${st.goldenPredictions} ذهبي | إجمالي النقاط: ${st.totalPoints} (ترتيب: #${st.userRank})`);
  }

  // 10. General Leaderboard
  console.log('\n====================================================');
  console.log('🏆 جدول الترتيب العام للمسابقة (General Leaderboard):');
  console.log('====================================================');
  const mainLeaderboard = await getLeaderboard(undefined, 20, contestId);
  console.table(
    mainLeaderboard.leaderboard.map((item) => ({
      'الترتيب': `#${item.rank}`,
      'المتسابق': item.name,
      'إجمالي النقاط': item.totalPoints,
      'التوقعات الصحيحة': item.correctPredictions,
      'التوقعات الذهبية': item.goldenPredictions,
      'نسبة الدقة': `${item.successRate}%`,
    }))
  );

  // 11. Golden Leaderboard
  console.log('\n====================================================');
  console.log('🥇 جدول الترتيب الذهبي (Golden Leaderboard):');
  console.log('====================================================');
  const goldenBoard = await getGoldenLeaderboard(undefined, 20, contestId);
  console.table(
    goldenBoard.leaderboard.map((item) => ({
      'الترتيب الذهبي': `#${item.rank}`,
      'المتسابق': item.name,
      'عدد التوقعات الذهبية': item.goldenPredictions,
      'إجمالي النقاط الذهبية': item.goldenPoints,
      'إجمالي النقاط الكلي': item.totalPoints,
    }))
  );

  // 12. Overall Admin Contest Statistics
  console.log('\n====================================================');
  console.log('📈 إحصائيات الإدارة الشاملة للمسابقة:');
  console.log('====================================================');
  const adminStats = await getAdminPredictionStats(contestId);
  console.log(`- إجمالي المباريات: ${adminStats.totalMatches}`);
  console.log(`- المباريات المكتملة والمحسوبة: ${adminStats.evaluatedMatches}`);
  console.log(`- إجمالي التوقعات: ${adminStats.totalPredictions}`);
  console.log(`- التوقعات الصحيحة: ${adminStats.correctPredictions}`);
  console.log(`- التوقعات الذهبية المسجلة: ${adminStats.goldenPredictionsCount}`);
  console.log(`- إجمالي النقاط الموزعة: ${adminStats.totalPointsDistributed}`);
  console.log(`- إجمالي النقاط الذهبية الموزعة: ${adminStats.goldenPointsDistributed}`);
  console.log(`- معدل النجاح العام: ${adminStats.successRate}%\n`);

  console.log('🎉 اكتمل اختبار ومحاكاة نظام المسابقات بنجاح تام وبمطابقة 100%!');
  process.exit(0);
}

runContestSimulation().catch((err) => {
  console.error('❌ حدث خطأ أثناء تشغيل المحاكاة:', err);
  process.exit(1);
});

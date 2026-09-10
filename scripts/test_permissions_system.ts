import crypto from 'crypto';
import { db, withDbRetry } from '../src/db/index.ts';
import { users, news, activityLogs, categories } from '../src/db/schema.ts';
import { eq, inArray, sql } from 'drizzle-orm';
import { createServerSessionToken, getSessionSecret, SessionPayload } from '../server/security/session.ts';
import { checkUserHasPermission } from '../src/constants/permissions.ts';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  category: string;
  testName: string;
  expected: string;
  actual: string;
  passed: boolean;
  statusCode: number;
}

const results: TestResult[] = [];

function recordTest(category: string, testName: string, expected: string, actual: string, passed: boolean, statusCode: number) {
  results.push({ category, testName, expected, actual, passed, statusCode });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] [${category}] ${testName} -> HTTP ${statusCode} (Expected: ${expected} | Result: ${actual})`);
}

function createExpiredToken(user: { uid: string; email: string; name?: string }): string {
  const secret = getSessionSecret();
  const now = Date.now() - 3600000;
  const payload: SessionPayload = {
    uid: user.uid,
    email: user.email.toLowerCase().trim(),
    name: user.name,
    iat: now - 10000,
    exp: now, // expired 1 hour ago
    jti: crypto.randomBytes(16).toString('hex'),
  };
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(base64Data).digest('base64url');
  return `srv_${base64Data}.${signature}`;
}

async function apiRequest(endpoint: string, method: string = 'GET', token?: string | null, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options: RequestInit = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🚀 STARTING COMPREHENSIVE PERMISSION & SECURITY TESTS');
  console.log('===============================================================');

  const testSuffix = Date.now();
  const testUids = [
    `test_reg_u_${testSuffix}`,
    `test_deact_u_${testSuffix}`,
    `test_unknown_role_${testSuffix}`,
    `test_admin_scoped_${testSuffix}`,
    `test_sys_manager_${testSuffix}`,
    `test_victim_b_${testSuffix}`,
  ];

  let createdUserIds: number[] = [];
  let createdNewsId: number | null = null;

  try {
    // 0. Setup test users in database
    console.log('\n📦 Seeding temporary test users into DB...');

    // Fetch valid category
    const [firstCategory] = await withDbRetry(() => db.select().from(categories).limit(1));
    const validCategoryId = firstCategory ? firstCategory.id : 1;

    // Regular User
    const [uRegular] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[0],
        email: `reg_user_${testSuffix}@koranews.test`,
        name: 'Regular User A',
        role: 'user',
        isAdmin: false,
        isActive: true,
        permissions: [],
      }).returning()
    );
    createdUserIds.push(uRegular.id);

    // Deactivated User
    const [uDeactivated] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[1],
        email: `deact_user_${testSuffix}@koranews.test`,
        name: 'Deactivated User',
        role: 'user',
        isAdmin: false,
        isActive: false, // inactive!
        permissions: [],
      }).returning()
    );
    createdUserIds.push(uDeactivated.id);

    // Unknown Role User
    const [uUnknownRole] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[2],
        email: `unknown_role_${testSuffix}@koranews.test`,
        name: 'Attacker Unknown Role',
        role: 'unknown_attacker_role',
        isAdmin: false,
        isActive: true,
        permissions: [],
      }).returning()
    );
    createdUserIds.push(uUnknownRole.id);

    // Scoped Admin (Only news_add and news_view, NO news_delete, NO admins_manage)
    const [uAdminScoped] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[3],
        email: `scoped_admin_${testSuffix}@koranews.test`,
        name: 'Scoped News Admin',
        role: 'admin',
        isAdmin: true,
        isActive: true,
        permissions: ['news_view', 'news_add'],
      }).returning()
    );
    createdUserIds.push(uAdminScoped.id);

    // System Manager
    const [uSysManager] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[4],
        email: `sys_manager_${testSuffix}@koranews.test`,
        name: 'System Manager User',
        role: 'system_manager',
        isAdmin: true,
        isActive: true,
        permissions: ['users_view', 'users_manage', 'admins_manage', 'news_view', 'news_add', 'news_edit', 'news_delete'],
      }).returning()
    );
    createdUserIds.push(uSysManager.id);

    // Victim User B
    const [uVictimB] = await withDbRetry(() =>
      db.insert(users).values({
        uid: testUids[5],
        email: `victim_b_${testSuffix}@koranews.test`,
        name: 'Victim User B',
        role: 'user',
        isAdmin: false,
        isActive: true,
        permissions: [],
      }).returning()
    );
    createdUserIds.push(uVictimB.id);

    // System Owner (Existing owner from DB)
    const [existingOwner] = await withDbRetry(() =>
      db.select().from(users).where(sql`role IN ('superadmin', 'owner', 'system_owner')`).orderBy(users.id).limit(1)
    );

    if (!existingOwner) {
      throw new Error('Fatal: Existing System Owner not found in DB!');
    }
    console.log(`👑 Existing System Owner identified: ID=${existingOwner.id}, Email=${existingOwner.email}, Role=${existingOwner.role}`);

    // Generate tokens
    const regularToken = createServerSessionToken(uRegular);
    const deactivatedToken = createServerSessionToken(uDeactivated);
    const unknownRoleToken = createServerSessionToken(uUnknownRole);
    const adminScopedToken = createServerSessionToken(uAdminScoped);
    const sysManagerToken = createServerSessionToken(uSysManager);
    const victimBToken = createServerSessionToken(uVictimB);
    const ownerToken = createServerSessionToken(existingOwner);
    const expiredToken = createExpiredToken(uRegular);
    const unregisteredToken = createServerSessionToken({ uid: 'non_existent_uid_12345', email: 'ghost_user@ghost.com', name: 'Ghost' });
    const forgedToken = 'srv_eyJ1aWQiOiJmb3JnZWQifQ.invalid_hmac_signature_abc123';

    // =========================================================================
    // CATEGORY 1: Authentication & Token Robustness
    // =========================================================================
    console.log('\n--- [1] Testing Auth & Token Robustness ---');

    // 1.1 Unregistered user token
    {
      const res = await apiRequest('/api/admin/users', 'GET', unregisteredToken);
      recordTest('Auth Robustness', 'Unregistered user token rejected', '401', `${res.status} (${res.data?.error || ''})`, res.status === 401, res.status);
    }

    // 1.2 Deactivated user token
    {
      const res = await apiRequest('/api/admin/users', 'GET', deactivatedToken);
      recordTest('Auth Robustness', 'Deactivated user rejected with 403', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 1.3 Expired token
    {
      const res = await apiRequest('/api/admin/users', 'GET', expiredToken);
      recordTest('Auth Robustness', 'Expired token rejected with 401', '401', `${res.status} (${res.data?.error || ''})`, res.status === 401, res.status);
    }

    // 1.4 Malformed / Invalid signature token
    {
      const res = await apiRequest('/api/admin/users', 'GET', forgedToken);
      recordTest('Auth Robustness', 'Forged/corrupted token rejected with 401', '401', `${res.status} (${res.data?.error || ''})`, res.status === 401, res.status);
    }

    // 1.5 Missing token
    {
      const res = await apiRequest('/api/admin/users', 'GET', null);
      recordTest('Auth Robustness', 'Unauthenticated request rejected with 401', '401', `${res.status} (${res.data?.error || ''})`, res.status === 401, res.status);
    }

    // 1.6 Unknown role in DB
    {
      const res = await apiRequest('/api/admin/users', 'GET', unknownRoleToken);
      recordTest('Auth Robustness', 'Unknown role rejected from admin API', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 1.7 Non-existent permission check
    {
      const permCheck = checkUserHasPermission(uAdminScoped, 'non_existent_fake_permission');
      recordTest('Auth Robustness', 'Non-existent permission evaluates to false', 'false', String(permCheck), permCheck === false, 200);
    }

    // =========================================================================
    // CATEGORY 2: Standard User Restrictions
    // =========================================================================
    console.log('\n--- [2] Testing Standard User Restrictions ---');

    // 2.1 Cannot access admin users list
    {
      const res = await apiRequest('/api/admin/users', 'GET', regularToken);
      recordTest('User Restrictions', 'User cannot access GET /api/admin/users', '403', `${res.status}`, res.status === 403, res.status);
    }

    // 2.2 Cannot access admin dashboard stats
    {
      const res = await apiRequest('/api/admin/stats', 'GET', regularToken);
      recordTest('User Restrictions', 'User cannot access GET /api/admin/stats', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 2.3 Cannot add news
    {
      const res = await apiRequest('/api/news', 'POST', regularToken, {
        title: 'Hacked News by User',
        content: 'Should be rejected',
        status: 'published',
        categoryId: validCategoryId,
      });
      recordTest('User Restrictions', 'User cannot POST /api/news', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 2.4 Cannot delete news
    {
      const res = await apiRequest('/api/news/1', 'DELETE', regularToken);
      recordTest('User Restrictions', 'User cannot DELETE /api/news/:id', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 2.5 Cannot manage contests (create contest)
    {
      const res = await apiRequest('/api/admin/predictions/contests', 'POST', regularToken, {
        title: 'Hacked Contest',
        description: 'Should be rejected',
      });
      recordTest('User Restrictions', 'User cannot create contest', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 2.6 Cannot access activity logs
    {
      const res = await apiRequest('/api/admin/logs', 'GET', regularToken);
      recordTest('User Restrictions', 'User cannot access GET /api/admin/logs', '403', `${res.status}`, res.status === 403, res.status);
    }

    // =========================================================================
    // CATEGORY 3: Scoped Admin Permissions
    // =========================================================================
    console.log('\n--- [3] Testing Scoped Admin Permissions ---');

    // 3.1 Can add news (has news_add permission)
    {
      const res = await apiRequest('/api/news', 'POST', adminScopedToken, {
        title: `Scoped Admin News ${testSuffix}`,
        content: 'Valid news created by scoped admin with news_add permission',
        status: 'published',
        categoryId: validCategoryId,
      });
      const passed = res.status === 201 || res.status === 200;
      if (passed && res.data?.id) createdNewsId = res.data.id;
      recordTest('Admin Permissions', 'Admin with news_add can create news', '200 or 201', `${res.status}`, passed, res.status);
    }

    // 3.2 Cannot delete news (lacks news_delete permission)
    {
      const targetNewsId = createdNewsId || 1;
      const res = await apiRequest(`/api/news/${targetNewsId}`, 'DELETE', adminScopedToken);
      recordTest('Admin Permissions', 'Admin without news_delete cannot delete news', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 3.3 Cannot create an Admin (lacks admins_manage)
    {
      const res = await apiRequest(`/api/admin/users/${uRegular.id}`, 'PUT', adminScopedToken, {
        role: 'admin',
        permissions: ['news_view'],
      });
      recordTest('Admin Permissions', 'Admin without admins_manage cannot promote user to admin', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 3.4 Cannot create System Manager
    {
      const res = await apiRequest(`/api/admin/users/${uRegular.id}`, 'PUT', adminScopedToken, {
        role: 'system_manager',
        permissions: [],
      });
      recordTest('Admin Permissions', 'Admin cannot create System Manager', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 3.5 Cannot modify Owner
    {
      const res = await apiRequest(`/api/admin/users/${existingOwner.id}`, 'PUT', adminScopedToken, {
        name: 'Hacked Owner Name',
        role: 'user',
      });
      recordTest('Admin Permissions', 'Admin cannot modify System Owner', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 3.6 Cannot elevate own privileges
    {
      const res = await apiRequest(`/api/admin/users/${uAdminScoped.id}`, 'PUT', adminScopedToken, {
        role: 'system_manager',
        permissions: ['admins_manage', 'system_settings'],
      });
      recordTest('Admin Permissions', 'Admin cannot self-elevate role or permissions', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 3.7 Scoped Admin without activity_logs_view cannot access logs
    {
      const res = await apiRequest('/api/admin/logs', 'GET', adminScopedToken);
      recordTest('Admin Permissions', 'Admin without activity_logs_view cannot access logs', '403', `${res.status}`, res.status === 403, res.status);
    }

    // =========================================================================
    // CATEGORY 4: System Manager Capabilities & Boundaries
    // =========================================================================
    console.log('\n--- [4] Testing System Manager Capabilities & Limits ---');

    // 4.1 System Manager can manage Admin permissions
    {
      const res = await apiRequest(`/api/admin/users/${uAdminScoped.id}`, 'PUT', sysManagerToken, {
        role: 'admin',
        permissions: ['news_view', 'news_add', 'categories_manage'],
      });

      // Query database to ensure permissions were actually written
      const [updatedAdmin] = await withDbRetry(() => db.select().from(users).where(eq(users.id, uAdminScoped.id)));
      const hasCategoriesManage = updatedAdmin?.permissions?.includes('categories_manage');
      const passed = res.status === 200 && res.data?.success === true && !!hasCategoriesManage;
      recordTest('System Manager', 'System Manager can update Admin permissions', '200 & permissions updated', `${res.status} (DB permissions: ${JSON.stringify(updatedAdmin?.permissions)})`, passed, res.status);
    }

    // 4.2 System Manager CANNOT create an Owner
    {
      const res = await apiRequest(`/api/admin/users/${uRegular.id}`, 'PUT', sysManagerToken, {
        role: 'system_owner',
      });
      recordTest('System Manager', 'System Manager CANNOT promote anyone to Owner', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 4.3 System Manager CANNOT modify Owner
    {
      const res = await apiRequest(`/api/admin/users/${existingOwner.id}`, 'PUT', sysManagerToken, {
        name: 'Manager Renamed Owner',
        role: 'admin',
      });
      recordTest('System Manager', 'System Manager CANNOT edit or demote System Owner', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 4.4 System Manager CANNOT elevate self to Owner
    {
      const res = await apiRequest(`/api/admin/users/${uSysManager.id}`, 'PUT', sysManagerToken, {
        role: 'system_owner',
      });
      recordTest('System Manager', 'System Manager CANNOT elevate self to Owner', '403', `${res.status} (${res.data?.error || ''})`, res.status === 403, res.status);
    }

    // 4.5 System Manager can access activity logs
    {
      const res = await apiRequest('/api/admin/logs', 'GET', sysManagerToken);
      const passed = res.status === 200 && Array.isArray(res.data?.logs);
      recordTest('System Manager', 'System Manager can access GET /api/admin/logs', '200 & logs array', `${res.status} (Total: ${res.data?.total})`, passed, res.status);
    }

    // =========================================================================
    // CATEGORY 5: System Owner Operations & Inviolability
    // =========================================================================
    console.log('\n--- [5] Testing System Owner Capabilities & Immutability ---');

    // 5.1 System Owner can access all admin routes
    {
      const res = await apiRequest('/api/admin/users', 'GET', ownerToken);
      recordTest('System Owner', 'System Owner can access GET /api/admin/users', '200', `${res.status}`, res.status === 200, res.status);
    }

    // 5.2 System Owner can manage System Manager
    {
      const res = await apiRequest(`/api/admin/users/${uSysManager.id}`, 'PUT', ownerToken, {
        role: 'system_manager',
        isActive: true,
        permissions: ['news_view', 'news_add', 'admins_manage'],
      });
      recordTest('System Owner', 'System Owner can manage System Manager accounts', '200', `${res.status}`, res.status === 200, res.status);
    }

    // 5.3 System Owner can delete news (even if created by another)
    if (createdNewsId) {
      const res = await apiRequest(`/api/news/${createdNewsId}`, 'DELETE', ownerToken);
      const passed = res.status === 200 || res.status === 204;
      recordTest('System Owner', 'System Owner can delete news', '200 or 204', `${res.status}`, passed, res.status);
      createdNewsId = null; // Mark deleted
    }

    // 5.4 System Owner CANNOT be demoted if it would leave 0 owners or is primary
    {
      const res = await apiRequest(`/api/admin/users/${existingOwner.id}`, 'PUT', ownerToken, {
        role: 'user',
      });
      recordTest('System Owner', 'System Owner cannot be demoted to user (Inviolable)', '400', `${res.status} (${res.data?.error || ''})`, res.status === 400, res.status);
    }

    // 5.5 System Owner CANNOT be deleted via DELETE /api/admin/users/:id
    {
      const res = await apiRequest(`/api/admin/users/${existingOwner.id}`, 'DELETE', ownerToken);
      recordTest('System Owner', 'System Owner account protected against deletion', '400', `${res.status} (${res.data?.error || ''})`, res.status === 400, res.status);
    }

    // 5.6 System Owner can access activity logs with pagination and counts
    {
      const res = await apiRequest('/api/admin/logs?limit=5', 'GET', ownerToken);
      const passed = res.status === 200 && Array.isArray(res.data?.logs);
      recordTest('System Owner', 'System Owner can access GET /api/admin/logs', '200 & logs array', `${res.status} (Count: ${res.data?.logs?.length}, Total: ${res.data?.total})`, passed, res.status);
    }

    // 5.7 User cannot delete or clear activity logs
    {
      const res = await apiRequest('/api/admin/logs', 'DELETE', regularToken);
      recordTest('User Restrictions', 'User cannot DELETE /api/admin/logs', '403', `${res.status}`, res.status === 403, res.status);
    }

    // =========================================================================
    // CATEGORY 6: IDOR (Insecure Direct Object Reference) Protection
    // =========================================================================
    console.log('\n--- [6] Testing IDOR Protections ---');

    // 6.1 User A attempts to delete User B via administrative user endpoint
    {
      const res = await apiRequest(`/api/admin/users/${uVictimB.id}`, 'DELETE', regularToken);
      recordTest('IDOR Protection', 'User A cannot delete User B via administrative endpoint', '403', `${res.status}`, res.status === 403, res.status);
    }

    // 6.2 User A attempts to modify User B via administrative user endpoint
    {
      const res = await apiRequest(`/api/admin/users/${uVictimB.id}`, 'PUT', regularToken, {
        role: 'admin',
        isActive: false,
      });
      recordTest('IDOR Protection', 'User A cannot modify User B role/status', '403', `${res.status}`, res.status === 403, res.status);
    }

    // 6.3 User A calls PUT /api/user/profile attempting to override User B by injecting id/userId
    {
      const res = await apiRequest('/api/user/profile', 'PUT', regularToken, {
        id: uVictimB.id,
        userId: uVictimB.id,
        email: uVictimB.email,
        name: 'User A Modified Name',
        role: 'system_owner',
      });

      // Verify User B remained completely intact
      const [victimInDb] = await withDbRetry(() => db.select().from(users).where(eq(users.id, uVictimB.id)));
      const [attackerInDb] = await withDbRetry(() => db.select().from(users).where(eq(users.id, uRegular.id)));

      const victimIntact = victimInDb && victimInDb.name === 'Victim User B' && victimInDb.role === 'user';
      const attackerNotElevated = attackerInDb && attackerInDb.role === 'user';

      recordTest(
        'IDOR Protection',
        'Parameter tampering in profile cannot hijack User B or elevate role',
        'Victim intact & Attacker user role',
        `Victim role=${victimInDb?.role}, Attacker role=${attackerInDb?.role}`,
        victimIntact && attackerNotElevated,
        res.status
      );
    }

  } finally {
    // Clean up temporary test users and test news
    console.log('\n🧹 Cleaning up temporary test records...');
    try {
      if (createdUserIds.length > 0) {
        await withDbRetry(() => db.delete(activityLogs).where(inArray(activityLogs.userId, createdUserIds)));
        const userIdsStr = createdUserIds.map(String);
        await withDbRetry(() => db.delete(activityLogs).where(inArray(activityLogs.entityId, userIdsStr)));
      }
      if (testUids.length > 0) {
        await withDbRetry(() => db.delete(users).where(inArray(users.uid, testUids)));
      }
      if (createdNewsId) {
        await withDbRetry(() => db.delete(news).where(eq(news.id, createdNewsId)));
      }
      await withDbRetry(() => db.delete(news).where(sql`title LIKE 'Scoped Admin News %'`));
      console.log('✨ Cleanup completed successfully with 0 residue.');
    } catch (cleanErr) {
      console.error('Warning: Cleanup encountered an error:', cleanErr);
    }
  }

  // Summary Report
  console.log('\n===============================================================');
  console.log('📊 TEST SUMMARY RESULTS');
  console.log('===============================================================');

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);

  if (failedTests > 0) {
    console.error('\n⚠️ The following tests failed:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- [${r.category}] ${r.testName}: expected ${r.expected}, got ${r.actual}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED FLAWLESSLY (100%)! System security & permissions verified.');
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test execution error:', e);
  process.exit(1);
});

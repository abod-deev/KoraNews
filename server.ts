import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { db, withDbRetry, initializeDatabaseSchema } from './src/db/index.ts';
import { users, news, categories, comments, emailVerifications, activityLogs, errorLogs, contestParticipants, predictionMatches } from './src/db/schema.ts';
import { eq, desc, sql, and, or, ilike, lt } from 'drizzle-orm';
import { checkUserHasPermission } from './src/constants/permissions.ts';
import {
  requireAuth,
  requirePermission,
  requireSuperAdmin,
  requireManager,
  requireOwner,
  isDbUserOwner,
  isDbUserManager,
  isDbUserAdmin,
  optionalAuth,
  AuthRequest,
  createServerSessionToken,
  verifyServerSessionToken,
  revokeSession,
  revokeAllUserSessions,
} from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { hashPassword, verifyPassword } from './server/security/passwords.ts';
import { toSafeUser, escapeHtml, sanitizeContent } from './server/security/sanitizer.ts';
import {
  generalLimiter,
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  commentsLimiter,
  matchSyncLimiter,
} from './server/security/rateLimiters.ts';
import {
  sendVerificationRequest,
  verifyEmailCode,
  resendVerificationRequest,
  clearVerificationSession,
} from './server/services/gmailVerification.ts';
import {
  startCronJobs,
} from './src/services/cronService.ts';
import {
  syncMatchesCycle,
  getStoredMatches,
  getStoredStandings,
} from './src/services/footballService.ts';
import {
  getPredictionMatches,
  getUserPredictionsHistory,
  getUserPredictionStats,
  saveUserPrediction,
  updateUserPredictionById,
  deleteUserPredictionById,
  getLeaderboard,
  getGoldenLeaderboard,
  getAdminPredictionMatches,
  addMatchToPredictions,
  addMultipleMatchesToPredictions,
  addCustomExternalMatchToPredictions,
  updatePredictionMatchPoints,
  togglePredictionMatchActive,
  removePredictionMatch,
  getContestSettings,
  updateContestSettings,
  getActiveContest,
  getContestById,
  getAllContests,
  createContest,
  completeContest,
  deleteContest,
  getUserParticipationStatus,
  requestContestParticipation,
  getAdminContestParticipants,
  updateParticipantStatus,
  removeParticipant,
  getAdminAvailableMatchesForSelection,
  confirmAndEvaluatePredictionMatch,
  getAdminPredictionStats,
  getExistingTeamsAndLeagues,
  updatePredictionMatchDetails,
  updatePredictionMatchResult,
  createAdminLeague,
  createAdminTeam,
  adminSaveUserPrediction,
  adminUpdateUserPrediction,
  adminDeleteUserPrediction,
} from './src/services/predictionService.ts';
import { seedSaudiAndNationalTeams } from './src/services/seedSaudiAndNationalTeams.ts';
import { runSystemCompatibilityAudit } from './src/services/systemCompatibilityService.ts';
import {
  validateScore,
  validatePointsPerMatch,
  validatePositiveId,
} from './server/security/validators.ts';

async function logActivity(
  userId: number,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any
) {
  try {
    await withDbRetry(() =>
      db.insert(activityLogs).values({
        userId,
        action,
        entityType,
        entityId: entityId || 'SYSTEM',
        details: details || null,
      })
    );
  } catch (e) {
    // Non-blocking log failure
  }
}

export async function logErrorToDb(data: {
  source?: string;
  severity?: 'fatal' | 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  endpoint?: string;
  statusCode?: number;
  userId?: number;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    await withDbRetry(() =>
      db.insert(errorLogs).values({
        source: data.source || 'server',
        severity: data.severity || 'error',
        message: String(data.message || 'Unknown error').slice(0, 3000),
        stack: data.stack ? String(data.stack).slice(0, 15000) : null,
        endpoint: data.endpoint ? String(data.endpoint).slice(0, 500) : null,
        statusCode: typeof data.statusCode === 'number' ? data.statusCode : null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        ipAddress: data.ipAddress ? String(data.ipAddress).slice(0, 100) : null,
        userAgent: data.userAgent ? String(data.userAgent).slice(0, 500) : null,
        metadata: data.metadata || null,
      })
    );
  } catch (e) {
    // Non-blocking log failure
    console.error('Failed to log error to DB:', e);
  }
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
  const configuredAllowedOrigins = rawAllowedOrigins
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter((o) => o.length > 0);

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Trust first proxy (Cloud Run / Nginx reverse proxy)
  app.set('trust proxy', 1);

  // Initialize DB Schema & Run Automatic Migrations
  try {
    await initializeDatabaseSchema();
    console.log('[Server Startup] Database schema initialized and synchronized successfully.');
  } catch (dbErr: any) {
    console.warn('[Server Startup Warning] Database schema initialization warning:', dbErr?.message || dbErr);
    console.log('[Server Startup] Continuing production server startup.');
  }

  // Security Headers via Helmet (configured to allow iframe & images & OAuth popups)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Allows embedding in AI Studio live preview
    })
  );

  // Secure Environment-Aware CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, curl, CLI, same-origin)
        if (!origin) {
          return callback(null, true);
        }

        const originLower = origin.toLowerCase().trim();

        // 1. Always allow configured allowed origins if specified
        if (configuredAllowedOrigins.length > 0 && configuredAllowedOrigins.includes(originLower)) {
          return callback(null, true);
        }

        // 2. Always allow standard localhost / loopback development & test origins
        if (
          originLower.startsWith('http://localhost') ||
          originLower.startsWith('https://localhost') ||
          originLower.startsWith('http://127.0.0.1') ||
          originLower.startsWith('https://127.0.0.1')
        ) {
          return callback(null, true);
        }

        // 3. Always allow Cloud Run and AI Studio domains (.run.app, .google.internal, .aistudio.google.com)
        if (
          originLower.endsWith('.run.app') ||
          originLower.endsWith('.google.internal') ||
          originLower.endsWith('.aistudio.google.com')
        ) {
          return callback(null, true);
        }

        if (isProduction) {
          // If in production and origin is not whitelisted, reject gracefully without throwing a 500 server crash.
          // Per CORS specification and cors package docs, callback(null, false) denies CORS without throwing an unhandled Express exception.
          return callback(null, false);
        } else {
          // In development, allow all origins for preview iframe and dev requests
          return callback(null, true);
        }
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-cron-secret'],
    })
  );

  // Large payload parser specifically for profile photo uploads (15MB)
  app.use('/api/user/profile', express.json({ limit: '15mb' }));
  app.use('/api/user/profile', express.urlencoded({ extended: true, limit: '15mb' }));

  // General body parser (500KB limit)
  app.use(express.json({ limit: '500kb' }));
  app.use(express.urlencoded({ extended: true, limit: '500kb' }));

  // General API Rate Limiting for all /api/ endpoints
  app.use('/api/', generalLimiter);

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KoraNews Backend',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  /**
   * POST /api/auth/logout
   * Revokes the active session token and clears session state.
   */
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]?.trim();
      if (token && token.startsWith('srv_')) {
        const payload = verifyServerSessionToken(token);
        if (payload?.jti) {
          revokeSession(payload.jti);
        }
        if (payload?.uid) {
          revokeAllUserSessions(payload.uid);
        }
      }
    }
    return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  });

  /**
   * POST /api/auth/login
   * Authenticates a user securely via email & password.
   * Uses crypto.scrypt password verification, constant-time error messages (anti-enumeration), and issues signed session tokens.
   */
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      const superAdminPass = process.env.SUPERADMIN_PASSWORD;

      // 1. Super Admin Authentication (Backed by Secrets)
      if (superAdminEmail && cleanEmail === superAdminEmail && superAdminPass) {
        if (password !== superAdminPass) {
          return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const ownerPermissions = [
          'news_add', 'news_edit', 'news_delete', 'news_publish', 'news_featured', 'news_breaking',
          'categories_manage', 'matches_manage', 'predictions_manage', 'contests_manage',
          'users_view', 'users_manage', 'logs_view', 'admins_manage', 'managers_manage', 'settings_manage'
        ];
        let dbUser = await getOrCreateUser(
          `superadmin_${cleanEmail}`,
          cleanEmail,
          'مالك النظام',
          undefined,
          superAdminPass
        );

        // Ensure owner role & full permissions
        await db.update(users)
          .set({ role: 'owner', isAdmin: true, isActive: true, permissions: ownerPermissions })
          .where(eq(users.id, dbUser.id));

        const sessionToken = createServerSessionToken({
          uid: dbUser.uid,
          email: dbUser.email,
          name: dbUser.name,
        });

        // Try creating custom Firebase token if configured
        let customToken: string | undefined;
        try {
          customToken = await adminAuth.createCustomToken(dbUser.uid);
        } catch (e) {
          // ignore if firebase credentials not provisioned
        }

        return res.json({
          sessionToken,
          customToken,
          user: toSafeUser({ ...dbUser, role: 'owner', isAdmin: true, isActive: true, permissions: ownerPermissions }),
        });
      }

      // 2. Standard User Authentication via Database
      const userRecords = await withDbRetry(() =>
        db.select().from(users).where(eq(users.email, cleanEmail)).limit(1)
      );

      if (userRecords.length === 0) {
        // Uniform error response to prevent user enumeration
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const dbUser = userRecords[0];

      if (!dbUser.isActive) {
        return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
      }

      // Check password using scrypt (or legacy plaintext with auto-migration)
      const storedHashOrPlain = dbUser.passwordHash || dbUser.password;
      if (!storedHashOrPlain) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const { isValid, needsMigration } = await verifyPassword(password, storedHashOrPlain);

      if (!isValid) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      // Automatic password migration to scrypt hash if needed
      if (needsMigration) {
        const newHash = await hashPassword(password);
        await withDbRetry(() =>
          db.update(users)
            .set({ passwordHash: newHash, password: null })
            .where(eq(users.id, dbUser.id))
        );
      }

      const sessionToken = createServerSessionToken({
        uid: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
      });

      let customToken: string | undefined;
      try {
        customToken = await adminAuth.createCustomToken(dbUser.uid);
      } catch (e) {
        // ignore
      }

      return res.json({
        sessionToken,
        customToken,
        user: toSafeUser(dbUser),
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً' });
    }
  });

  /**
   * POST /api/auth/send-verification
   * Step 1 of Registration: Validates input, hashes candidate password, and sends 6-digit OTP.
   */
  app.post('/api/auth/send-verification', otpSendLimiter, async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
      }

      if (typeof password !== 'string' || password.length < 8 || password.length > 16) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تكون بين 8 و 16 حرفاً' });
      }

      // Check if user already exists
      const existing = await withDbRetry(() =>
        db.select({ id: users.id }).from(users).where(eq(users.email, cleanEmail)).limit(1)
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' });
      }

      const displayName = typeof name === 'string' && name.trim() ? name.trim() : cleanEmail.split('@')[0];
      const result = await sendVerificationRequest(cleanEmail, displayName, password);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({
        success: true,
        message: result.message,
        email: cleanEmail,
      });
    } catch (error: any) {
      console.error('Verification send error:', error);
      return res.status(500).json({ error: 'فشل إرسال رمز التحقق، يرجى المحاولة لاحقاً' });
    }
  });

  /**
   * POST /api/auth/verify-code
   * Step 2 of Registration: Verifies 6-digit OTP, creates the account, and returns authenticated session.
   */
  app.post('/api/auth/verify-code', otpVerifyLimiter, async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const verification = await verifyEmailCode(cleanEmail, String(code));

      if (!verification.success || !verification.verified) {
        return res.status(400).json({ error: verification.message });
      }

      const payload = verification.payload;
      const userName = payload?.name || cleanEmail.split('@')[0];
      const passwordHash = payload?.passwordHash;

      // Ensure account created in Firebase Auth if available
      let firebaseUid = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      try {
        const existingFb = await adminAuth.getUserByEmail(cleanEmail).catch(() => null);
        if (existingFb) {
          firebaseUid = existingFb.uid;
        } else {
          const newFb = await adminAuth.createUser({
            email: cleanEmail,
            displayName: userName,
            emailVerified: true,
          });
          firebaseUid = newFb.uid;
        }
      } catch (e) {
        // ignore
      }

      // Save user to database with hashed password
      const dbUser = await getOrCreateUser(
        firebaseUid,
        cleanEmail,
        userName,
        '/default-avatar.svg',
        passwordHash
      );

      // Clear the temporary verification session
      await clearVerificationSession(cleanEmail);

      const sessionToken = createServerSessionToken({
        uid: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
      });

      let customToken: string | undefined;
      try {
        customToken = await adminAuth.createCustomToken(dbUser.uid);
      } catch (e) {
        // ignore
      }

      return res.json({
        success: true,
        sessionToken,
        customToken,
        user: toSafeUser(dbUser),
      });
    } catch (error: any) {
      console.error('Verification code error:', error);
      return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً' });
    }
  });

  /**
   * POST /api/auth/resend-code
   */
  app.post('/api/auth/resend-code', otpSendLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const result = await resendVerificationRequest(cleanEmail);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (error: any) {
      console.error('Resend code error:', error);
      return res.status(500).json({ error: 'فشل إعادة إرسال رمز التحقق' });
    }
  });

  /**
   * POST /api/auth/signup (Legacy endpoint - Enforces email verification)
   */
  app.post('/api/auth/signup', (req, res) => {
    return res.status(400).json({
      error: 'التسجيل المباشر غير متاح. يرجى استخدام تدفق التحقق عبر البريد الإلكتروني (send-verification).',
      requiresVerification: true,
    });
  });

  /**
   * POST /api/auth/sync
   * Synchronizes third-party (e.g. Google Sign-In) authenticated tokens with local database.
   * Cryptographically verifies tokens and creates/updates database records.
   */
  app.post('/api/auth/sync', async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
      }

      const token = authHeader.split('Bearer ')[1]?.trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Empty token' });
      }

      let decodedToken: { uid: string; email: string; name?: string; picture?: string } | null = null;

      if (token.startsWith('srv_')) {
        const payload = verifyServerSessionToken(token);
        if (payload) {
          decodedToken = {
            uid: payload.uid,
            email: payload.email,
            name: payload.name,
          };
        }
      } else {
        try {
          const fbDecoded = await adminAuth.verifyIdToken(token);
          if (fbDecoded && fbDecoded.uid) {
            decodedToken = {
              uid: fbDecoded.uid,
              email: fbDecoded.email || '',
              name: fbDecoded.name || (fbDecoded.email ? fbDecoded.email.split('@')[0] : 'مستخدم'),
              picture: fbDecoded.picture,
            };
          }
        } catch (err: any) {
          console.warn('[Auth Sync] adminAuth.verifyIdToken error:', err?.message || err);
          decodedToken = null;
        }
      }

      if (!decodedToken || !decodedToken.uid) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
      }

      const body = req.body || {};
      const candidateName = (typeof body.name === 'string' && body.name.trim()) ? body.name.trim() : (decodedToken.name || 'مستخدم');
      const candidatePicture = (typeof body.picture === 'string' && body.picture.trim()) ? body.picture.trim() : decodedToken.picture;

      const user = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        candidateName,
        candidatePicture
      );

      if (!user.isActive) {
        return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
      }

      const sessionToken = createServerSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.name,
      });

      return res.json({
        sessionToken,
        user: toSafeUser(user),
      });
    } catch (error: any) {
      console.error('Auth sync error:', error);
      return res.status(500).json({ error: 'فشل في مزامنة بيانات المستخدم' });
    }
  });

  // ==========================================
  // USER PROFILE & ACCOUNT MANAGEMENT
  // ==========================================

  app.get('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      const newsCount = await withDbRetry(() =>
        db.select({ count: sql`count(*)` }).from(news).where(eq(news.authorId, user.id))
      );
      const commentsCount = await withDbRetry(() =>
        db.select({ count: sql`count(*)` }).from(comments).where(eq(comments.userId, user.id))
      );

      const safe = toSafeUser(user);
      return res.json({
        ...safe,
        newsCount: Number(newsCount[0]?.count || 0),
        commentsCount: Number(commentsCount[0]?.count || 0),
      });
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'فشل في جلب بيانات الملف الشخصي' });
    }
  });

  app.put('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      const { name, avatar } = req.body;
      const cleanName = typeof name === 'string' && name.trim() ? escapeHtml(name.trim()) : user.name;
      const cleanAvatar =
        avatar !== undefined
          ? avatar && typeof avatar === 'string' && avatar.trim()
            ? avatar.trim()
            : null
          : user.avatar;

      const updated = await withDbRetry(() =>
        db
          .update(users)
          .set({
            name: cleanName,
            avatar: cleanAvatar,
          })
          .where(eq(users.id, user.id))
          .returning()
      );

      const updatedUser = updated[0];

      // Update in Firebase Auth if available
      try {
        await adminAuth.updateUser(user.uid, {
          displayName: cleanName,
          photoURL: cleanAvatar || undefined,
        });
      } catch (e) {
        // ignore
      }

      const sessionToken = createServerSessionToken({
        uid: updatedUser.uid,
        email: updatedUser.email,
        name: updatedUser.name,
      });

      return res.json({
        sessionToken,
        user: toSafeUser(updatedUser),
      });
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ error: 'فشل في تحديث بيانات الملف الشخصي' });
    }
  });

  /**
   * Permanently deletes a user record and cleans up associated references.
   */
  async function permanentlyDeleteUserRecord(user: { id: number; email?: string | null; uid?: string | null; role?: string | null }) {
    const cleanEmail = (user.email || '').trim().toLowerCase();

    // 1. Delete comments
    await withDbRetry(() => db.delete(comments).where(eq(comments.userId, user.id)));

    // 2. Delete activity logs
    await withDbRetry(() => db.delete(activityLogs).where(eq(activityLogs.userId, user.id)));

    // 3. Reassign news to system owner or delete
    const systemOwners = await withDbRetry(() =>
      db.select().from(users).where(sql`role IN ('superadmin', 'owner', 'system_owner')`).orderBy(users.id).limit(1)
    );

    if (systemOwners.length > 0 && systemOwners[0].id !== user.id) {
      await withDbRetry(() => db.update(news).set({ authorId: systemOwners[0].id }).where(eq(news.authorId, user.id)));
    } else {
      await withDbRetry(() => db.delete(news).where(eq(news.authorId, user.id)));
    }

    // 4. Delete verification records
    if (cleanEmail) {
      await withDbRetry(() => db.delete(emailVerifications).where(eq(emailVerifications.email, cleanEmail)));
      clearVerificationSession(cleanEmail);
    }

    // 5. Delete user from database
    await withDbRetry(() => db.delete(users).where(eq(users.id, user.id)));

    // 6. Delete from Firebase Auth
    if (user.uid) {
      try {
        await adminAuth.deleteUser(user.uid);
      } catch (e) {
        // ignore
      }
    }
    if (cleanEmail) {
      try {
        const fbUser = await adminAuth.getUserByEmail(cleanEmail);
        if (fbUser?.uid) {
          await adminAuth.deleteUser(fbUser.uid);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  app.delete('/api/user/account', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      const isSuperAdmin = user.role === 'superadmin' || (!!superAdminEmail && user.email?.toLowerCase().trim() === superAdminEmail);

      if (isSuperAdmin) {
        return res.status(400).json({ error: 'حساب مالك النظام الرئيسي والمدير العام محمي بالكامل ولا يمكن حذفه' });
      }

      // Invalidate all active sessions for this user
      if (user.uid) revokeAllUserSessions(user.uid);
      if (user.email) revokeAllUserSessions(user.email);

      await permanentlyDeleteUserRecord(user);
      return res.json({ success: true, message: 'تم حذف الحساب نهائياً بنجاح' });
    } catch (error: any) {
      console.error('Error deleting user account:', error);
      return res.status(500).json({ error: 'فشل في حذف الحساب' });
    }
  });

  // ==========================================
  // CATEGORIES ROUTES
  // ==========================================

  app.get('/api/categories', async (req, res) => {
    try {
      const allCategories = await withDbRetry(async () => {
        let cats = await db.select().from(categories).orderBy(categories.name);
        if (cats.length === 0) {
          const defaultCats = [
            { name: 'كرة قدم عالمية', slug: 'world-football' },
            { name: 'كرة قدم محلية', slug: 'local-football' },
            { name: 'الانتقالات والشائعات', slug: 'transfers' },
            { name: 'الدوريات الأوروبية', slug: 'european-leagues' },
            { name: 'دوري روشن السعودي', slug: 'saudi-pro-league' },
            { name: 'دوري أبطال أوروبا', slug: 'champions-league' },
            { name: 'تحليلات وتكتيك', slug: 'tactics-and-analysis' },
            { name: 'أخبار عاجلة', slug: 'breaking-news' },
          ];
          await db.insert(categories).values(defaultCats);
          cats = await db.select().from(categories).orderBy(categories.name);
        }
        return cats;
      });
      return res.json(allCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return res.status(500).json({ error: 'فشل في جلب الأقسام' });
    }
  });

  app.post('/api/categories', requirePermission('categories_add'), async (req: AuthRequest, res) => {
    try {
      const { name, slug } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'اسم القسم والاسم اللطيف مطلوبان' });
      }
      const cleanName = escapeHtml(String(name).trim());
      const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      const result = await withDbRetry(() =>
        db.insert(categories).values({ name: cleanName, slug: cleanSlug }).returning()
      );
      return res.status(201).json(result[0]);
    } catch (error: any) {
      return res.status(500).json({ error: 'فشل في إنشاء القسم' });
    }
  });

  // ==========================================
  // NEWS ROUTES
  // ==========================================

  app.get('/api/news', async (req, res) => {
    try {
      const formattedNews = await withDbRetry(async () => {
        const rows = await db
          .select({
            id: news.id,
            title: news.title,
            excerpt: news.excerpt,
            content: news.content,
            image: news.image,
            categoryId: news.categoryId,
            authorId: news.authorId,
            views: news.views,
            isFeatured: news.isFeatured,
            isBreaking: news.isBreaking,
            status: news.status,
            createdAt: news.createdAt,
            updatedAt: news.updatedAt,
            authorName: users.name,
            authorAvatar: users.avatar,
            categoryName: categories.name,
            categorySlug: categories.slug,
          })
          .from(news)
          .leftJoin(users, eq(news.authorId, users.id))
          .leftJoin(categories, eq(news.categoryId, categories.id))
          .where(eq(news.status, 'published'))
          .orderBy(desc(news.createdAt));

        return rows.map((item) => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          image: item.image,
          categoryId: item.categoryId,
          authorId: item.authorId,
          views: item.views,
          isFeatured: item.isFeatured,
          isBreaking: item.isBreaking,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          author: item.authorName ? { id: item.authorId, name: item.authorName, avatar: item.authorAvatar } : null,
          category: item.categoryName ? { id: item.categoryId, name: item.categoryName, slug: item.categorySlug } : null,
        }));
      });

      return res.json(formattedNews);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return res.status(500).json({ error: 'فشل في جلب الأخبار' });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'معرف الخبر غير صحيح' });

      const article = await withDbRetry(async () => {
        const rows = await db
          .select({
            id: news.id,
            title: news.title,
            excerpt: news.excerpt,
            content: news.content,
            image: news.image,
            categoryId: news.categoryId,
            authorId: news.authorId,
            views: news.views,
            isFeatured: news.isFeatured,
            isBreaking: news.isBreaking,
            status: news.status,
            createdAt: news.createdAt,
            updatedAt: news.updatedAt,
            authorName: users.name,
            authorAvatar: users.avatar,
            categoryName: categories.name,
            categorySlug: categories.slug,
          })
          .from(news)
          .leftJoin(users, eq(news.authorId, users.id))
          .leftJoin(categories, eq(news.categoryId, categories.id))
          .where(eq(news.id, id))
          .limit(1);

        if (rows.length === 0) return null;
        const row = rows[0];

        const articleComments = await db
          .select({
            id: comments.id,
            content: comments.content,
            newsId: comments.newsId,
            userId: comments.userId,
            createdAt: comments.createdAt,
            userName: users.name,
            userAvatar: users.avatar,
          })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(eq(comments.newsId, id))
          .orderBy(desc(comments.createdAt));

        return {
          id: row.id,
          title: row.title,
          excerpt: row.excerpt,
          content: row.content,
          image: row.image,
          categoryId: row.categoryId,
          authorId: row.authorId,
          views: row.views,
          isFeatured: row.isFeatured,
          isBreaking: row.isBreaking,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          author: row.authorName ? { id: row.authorId, name: row.authorName, avatar: row.authorAvatar } : null,
          category: row.categoryName ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug } : null,
          comments: articleComments.map((c) => ({
            id: c.id,
            content: c.content,
            newsId: c.newsId,
            userId: c.userId,
            createdAt: c.createdAt,
            user: c.userName ? { id: c.userId, name: c.userName, avatar: c.userAvatar } : null,
          })),
        };
      });

      if (!article) return res.status(404).json({ error: 'الخبر غير موجود' });

      // If draft, only author or admin can view
      if (article.status === 'draft') {
        const authHeader = req.headers.authorization;
        let isAuthorizedViewer = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split('Bearer ')[1]?.trim();
          const decoded = verifyServerSessionToken(token);
          if (decoded) {
            const requester = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);
            if (requester.length > 0) {
              const u = requester[0];
              if (isDbUserAdmin(u) || u.id === article.authorId) {
                isAuthorizedViewer = true;
              }
            }
          }
        }
        if (!isAuthorizedViewer) {
          return res.status(404).json({ error: 'الخبر غير متاح' });
        }
      }

      // Increment views count asynchronously
      withDbRetry(() =>
        db.update(news).set({ views: sql`${news.views} + 1` }).where(eq(news.id, id))
      ).catch(() => {});

      return res.json(article);
    } catch (error) {
      console.error('Failed to fetch news item:', error);
      return res.status(500).json({ error: 'فشل في جلب تفاصيل الخبر' });
    }
  });

  app.post('/api/news', requirePermission('news_add'), async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(403).json({ error: 'المستخدم غير متزامن' });

      const { title, content, image, isFeatured, isBreaking, status, categoryId } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'عنوان ومحتوى الخبر مطلوبان' });
      }

      let parsedCategoryId: number | null = null;
      if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        const parsed = parseInt(String(categoryId), 10);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'معرف التصنيف غير صحيح' });
        }
        const catExists = await withDbRetry(() =>
          db.select().from(categories).where(eq(categories.id, parsed)).limit(1)
        );
        if (catExists.length === 0) {
          return res.status(400).json({ error: 'التصنيف المختار غير موجود' });
        }
        parsedCategoryId = parsed;
      } else {
        return res.status(400).json({ error: 'يرجى اختيار تصنيف الخبر' });
      }

      const cleanTitle = escapeHtml(String(title).trim());
      const cleanContent = sanitizeContent(String(content).trim());
      const cleanImage = image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null;

      const result = await withDbRetry(() =>
        db
          .insert(news)
          .values({
            title: cleanTitle,
            excerpt: null,
            content: cleanContent,
            image: cleanImage,
            categoryId: parsedCategoryId,
            authorId: user.id,
            isFeatured: !!isFeatured,
            isBreaking: !!isBreaking,
            status: status === 'draft' ? 'draft' : 'published',
          })
          .returning()
      );

      let categoryObj: { id: number; name: string; slug: string } | null = null;
      if (parsedCategoryId) {
        const catRow = await withDbRetry(() =>
          db.select().from(categories).where(eq(categories.id, parsedCategoryId!)).limit(1)
        );
        if (catRow.length > 0) {
          categoryObj = { id: catRow[0].id, name: catRow[0].name, slug: catRow[0].slug };
        }
      }

      await logActivity(user.id, 'CREATE', 'NEWS', String(result[0].id), { title: cleanTitle });
      return res.status(201).json({
        ...result[0],
        category: categoryObj,
      });
    } catch (error: any) {
      console.error('Failed to create news:', error);
      return res.status(500).json({ error: 'فشل في إضافة الخبر' });
    }
  });

  app.put('/api/news/:id', requirePermission('news_edit'), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const { title, content, image, isFeatured, isBreaking, status, categoryId } = req.body;
      const cleanTitle = title ? escapeHtml(String(title).trim()) : undefined;
      const cleanContent = content ? sanitizeContent(String(content).trim()) : undefined;
      const cleanImage = image !== undefined ? (image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null) : undefined;

      let categoryIdToUpdate: number | null | undefined = undefined;
      if (categoryId !== undefined) {
        if (categoryId !== null && categoryId !== '') {
          const parsed = parseInt(String(categoryId), 10);
          if (isNaN(parsed) || parsed <= 0) {
            return res.status(400).json({ error: 'معرف التصنيف غير صحيح' });
          }
          const catExists = await withDbRetry(() =>
            db.select().from(categories).where(eq(categories.id, parsed)).limit(1)
          );
          if (catExists.length === 0) {
            return res.status(400).json({ error: 'التصنيف المختار غير موجود' });
          }
          categoryIdToUpdate = parsed;
        } else {
          categoryIdToUpdate = null;
        }
      }

      const result = await withDbRetry(() =>
        db
          .update(news)
          .set({
            ...(cleanTitle ? { title: cleanTitle } : {}),
            ...(cleanContent ? { content: cleanContent } : {}),
            ...(cleanImage !== undefined ? { image: cleanImage } : {}),
            ...(categoryIdToUpdate !== undefined ? { categoryId: categoryIdToUpdate } : {}),
            isFeatured: !!isFeatured,
            isBreaking: !!isBreaking,
            status: status === 'draft' ? 'draft' : 'published',
            updatedAt: new Date(),
          })
          .where(eq(news.id, id))
          .returning()
      );

      if (result.length === 0) return res.status(404).json({ error: 'الخبر غير موجود' });

      let categoryObj: { id: number; name: string; slug: string } | null = null;
      if (result[0].categoryId) {
        const catRow = await withDbRetry(() =>
          db.select().from(categories).where(eq(categories.id, result[0].categoryId!)).limit(1)
        );
        if (catRow.length > 0) {
          categoryObj = { id: catRow[0].id, name: catRow[0].name, slug: catRow[0].slug };
        }
      }

      await logActivity(req.dbUser.id, 'UPDATE', 'NEWS', String(id), { title: result[0].title });
      return res.json({
        ...result[0],
        category: categoryObj,
      });
    } catch (error: any) {
      console.error('Failed to update news:', error);
      return res.status(500).json({ error: 'فشل في تعديل الخبر' });
    }
  });

  app.delete('/api/news/:id', requirePermission('news_delete'), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'معرف غير صحيح' });

      await withDbRetry(() => db.delete(comments).where(eq(comments.newsId, id)));
      await withDbRetry(() => db.delete(news).where(eq(news.id, id)));

      await logActivity(req.dbUser.id, 'DELETE', 'NEWS', String(id));
      return res.status(204).send();
    } catch (error: any) {
      console.error('Failed to delete news:', error);
      return res.status(500).json({ error: 'فشل في حذف الخبر' });
    }
  });

  // ==========================================
  // COMMENTS ROUTES
  // ==========================================

  app.get('/api/news/:id/comments', async (req, res) => {
    try {
      const newsId = parseInt(req.params.id as string, 10);
      if (isNaN(newsId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const articleComments = await withDbRetry(() =>
        db.select().from(comments).where(eq(comments.newsId, newsId)).orderBy(desc(comments.createdAt))
      );
      return res.json(articleComments);
    } catch (error) {
      return res.status(500).json({ error: 'فشل في جلب التعليقات' });
    }
  });

  app.post('/api/news/:id/comments', commentsLimiter, requireAuth, async (req: AuthRequest, res) => {
    try {
      const newsId = parseInt(req.params.id as string, 10);
      if (isNaN(newsId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const user = req.dbUser;
      if (!user) return res.status(403).json({ error: 'المستخدم غير متزامن' });

      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length < 2 || content.trim().length > 1000) {
        return res.status(400).json({ error: 'التعليق يجب أن يكون بين حرفين و 1000 حرف' });
      }

      const cleanContent = escapeHtml(content.trim());

      const result = await withDbRetry(() =>
        db
          .insert(comments)
          .values({
            content: cleanContent,
            newsId,
            userId: user.id,
          })
          .returning()
      );

      return res.status(201).json(result[0]);
    } catch (error: any) {
      return res.status(500).json({ error: 'فشل في إضافة التعليق' });
    }
  });

  // ==========================================
  // LEAGUES, STANDINGS & MATCHES
  // ==========================================

  app.get('/api/leagues', async (req, res) => {
    try {
      const allFreeLeagues = [
        { id: 'all', name: 'جميع الدوريات', logo: '🌐', flag: '🌐' },
        { id: 'PL', name: 'الدوري الإنجليزي الممتاز', logo: 'https://crests.football-data.org/PL.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { id: 'PD', name: 'الدوري الإسباني', logo: 'https://crests.football-data.org/PD.png', flag: '🇪🇸' },
        { id: 'SA', name: 'الدوري الإيطالي', logo: 'https://crests.football-data.org/SA.png', flag: '🇮🇹' },
        { id: 'BL1', name: 'الدوري الألماني', logo: 'https://crests.football-data.org/BL1.png', flag: '🇩🇪' },
        { id: 'FL1', name: 'الدوري الفرنسي', logo: 'https://crests.football-data.org/FL1.png', flag: '🇫🇷' },
        { id: 'CL', name: 'دوري أبطال أوروبا', logo: 'https://crests.football-data.org/CL.png', flag: '🇪🇺' },
        { id: 'ELC', name: 'دوري البطولة الإنجليزية', logo: 'https://crests.football-data.org/ELC.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { id: 'DED', name: 'الدوري الهولندي', logo: 'https://crests.football-data.org/DED.png', flag: '🇳🇱' },
        { id: 'PPL', name: 'الدوري البرتغالي', logo: 'https://crests.football-data.org/PPL.png', flag: '🇵🇹' },
        { id: 'BSA', name: 'الدوري البرازيلي', logo: 'https://crests.football-data.org/BSA.png', flag: '🇧🇷' },
        { id: 'CLI', name: 'كأس ليبرتادوريس', logo: 'https://crests.football-data.org/CLI.png', flag: '🌎' },
        { id: 'EC', name: 'بطولة أمم أوروبا', logo: 'https://crests.football-data.org/EC.png', flag: '🏆' },
        { id: 'WC', name: 'كأس العالم', logo: 'https://crests.football-data.org/WC.png', flag: '🌍' },
      ];
      return res.json(allFreeLeagues);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return res.status(500).json({ error: 'فشل في جلب الدوريات' });
    }
  });

  app.get('/api/standings', async (req, res) => {
    try {
      const rawLeague = (req.query.league as string) || 'PD';
      const season = (req.query.season as string) || '2026';
      const standingsData = await getStoredStandings(String(rawLeague).toUpperCase(), season);
      return res.json(standingsData);
    } catch (error) {
      console.error('Error fetching standings:', error);
      return res.status(500).json({ error: 'فشل في جلب جدول الترتيب' });
    }
  });

  app.get('/api/standings/:leagueId', async (req, res) => {
    try {
      let rawLeague = req.params.leagueId || (req.query.league as string) || 'PD';
      if (rawLeague === 'all') rawLeague = 'PD';
      const season = (req.query.season as string) || '2026';
      const standingsData = await getStoredStandings(String(rawLeague).toUpperCase(), season);
      return res.json(standingsData);
    } catch (error) {
      console.error('Error fetching standings:', error);
      return res.status(500).json({ error: 'فشل في جلب جدول الترتيب' });
    }
  });

  app.get('/api/matches', async (req, res) => {
    try {
      const { status, date, leagueId, sortBy } = req.query;
      // Strictly enforce season 2026 on the backend
      const targetSeason = '2026';
      const targetLeague = (leagueId as string) || 'all';

      const formattedMatches = await getStoredMatches({
        status: status as string,
        date: date as string,
        leagueId: targetLeague,
        season: targetSeason,
        sortBy: sortBy as string,
      });

      return res.json(formattedMatches);
    } catch (error: any) {
      console.error('Error fetching matches from DB:', error);
      return res.status(500).json({ error: true, message: error.message || 'فشل في جلب المباريات من الخادم' });
    }
  });

  // Protected Match Sync Endpoint (Admin only or Cron Key, with concurrency lock)
  let isSyncInProgress = false;

  app.post('/api/sync-matches', matchSyncLimiter, optionalAuth, async (req: AuthRequest, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const reqSecret = req.headers['x-cron-secret'];

    let hasCronAuth = false;
    if (cronSecret && typeof cronSecret === 'string' && cronSecret.length >= 16 && typeof reqSecret === 'string') {
      const a = Buffer.from(reqSecret);
      const b = Buffer.from(cronSecret);
      hasCronAuth = a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    const isUserAdmin = isDbUserAdmin(req.dbUser);

    if (!hasCronAuth && !isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin authorization or valid Cron Secret required for match synchronization' });
    }

    if (isSyncInProgress) {
      return res.status(429).json({ error: 'عملية مزامنة المباريات قيد التشغيل حالياً، يرجى الانتظار.' });
    }

    try {
      isSyncInProgress = true;
      await syncMatchesCycle();
      return res.json({ status: 'ok', message: 'تمت مزامنة المباريات وتحديثها بنجاح' });
    } catch (error: any) {
      console.error('Error syncing matches:', error);
      return res.status(500).json({ error: error.message || 'فشل في مزامنة المباريات' });
    } finally {
      isSyncInProgress = false;
    }
  });

  // ==========================================
  // MATCH PREDICTIONS & CONTEST SYSTEM (مسابقة وتوقعات المباريات)
  // ==========================================

  /**
   * GET /api/predictions/contest/settings
   * Fetch contest configuration and public rules.
   */
  app.get('/api/predictions/contest/settings', optionalAuth, async (req, res) => {
    try {
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const settings = contestId && !isNaN(contestId)
        ? await getContestById(contestId)
        : await getContestSettings();
      return res.json(settings);
    } catch (error: any) {
      console.error('Error fetching contest settings:', error);
      return res.status(500).json({ error: 'فشل في جلب إعدادات المسابقة' });
    }
  });

  /**
   * GET /api/admin/predictions/active-contest
   * Admin: Get current active contest with participant count and matches count.
   */
  app.get('/api/admin/predictions/active-contest', requirePermission('predictions_view'), async (_req, res) => {
    try {
      const active = await getActiveContest();
      if (!active) {
        return res.json({ activeContest: null });
      }
      const [pCountRes, mCountRes] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(contestParticipants).where(eq(contestParticipants.contestId, active.id)),
        db.select({ count: sql<number>`count(*)` }).from(predictionMatches).where(eq(predictionMatches.contestId, active.id)),
      ]);
      return res.json({
        activeContest: {
          ...active,
          participantsCount: Number(pCountRes[0]?.count || 0),
          matchesCount: Number(mCountRes[0]?.count || 0),
        },
      });
    } catch (error: any) {
      console.error('Error fetching active contest:', error);
      return res.status(500).json({ error: 'فشل في جلب المسابقة النشطة' });
    }
  });

  /**
   * GET /api/predictions/contests
   * Public: List all contests (historical & active) for selection and archive.
   */
  app.get('/api/predictions/contests', optionalAuth, async (_req, res) => {
    try {
      const list = await getAllContests();
      return res.json(list);
    } catch (error: any) {
      console.error('Error fetching contests:', error);
      return res.status(500).json({ error: 'فشل في جلب قائمة المسابقات' });
    }
  });

  /**
   * GET /api/admin/predictions/contests
   * Admin: List all contests (historical & active).
   */
  app.get('/api/admin/predictions/contests', requirePermission('predictions_view'), async (_req, res) => {
    try {
      const list = await getAllContests();
      return res.json(list);
    } catch (error: any) {
      console.error('Error fetching contests:', error);
      return res.status(500).json({ error: 'فشل في جلب قائمة المسابقات' });
    }
  });

  /**
   * POST /api/admin/predictions/contests
   * Admin: Create a new contest manually.
   */
  app.post('/api/admin/predictions/contests', requirePermission('predictions_contest_create'), async (req: AuthRequest, res) => {
    try {
      const contest = await createContest(req.body);
      await logActivity(req.dbUser.id, 'CREATE', 'CONTEST_SETTINGS', String(contest.id), req.body);
      return res.status(201).json({ success: true, contest });
    } catch (error: any) {
      console.error('Error creating contest:', error);
      return res.status(400).json({ error: error.message || 'فشل في إنشاء المسابقة' });
    }
  });

  /**
   * POST /api/admin/predictions/contests/:id/complete
   * Admin: Mark a contest as completed.
   */
  app.post('/api/admin/predictions/contests/:id/complete', requirePermission('predictions_contest_end'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المسابقة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف المسابقة غير صالح' });
      }

      const completed = await completeContest(idCheck.value);
      await logActivity(req.dbUser.id, 'COMPLETE', 'CONTEST_SETTINGS', String(completed.id));
      return res.json({ success: true, contest: completed });
    } catch (error: any) {
      console.error('Error completing contest:', error);
      return res.status(400).json({ error: error.message || 'فشل في إنهاء المسابقة' });
    }
  });

  /**
   * DELETE /api/admin/predictions/contests/:id
   * Admin: Delete a completed contest and all associated prediction data.
   * Rejects if contest is active.
   */
  app.delete('/api/admin/predictions/contests/:id', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المسابقة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف المسابقة غير صالح' });
      }

      const result = await deleteContest(idCheck.value);
      await logActivity(req.dbUser.id, 'DELETE', 'CONTEST_SETTINGS', String(idCheck.value));
      return res.json(result);
    } catch (error: any) {
      console.error('Error deleting contest:', error);
      return res.status(400).json({ error: error.message || 'فشل في حذف المسابقة' });
    }
  });

  /**
   * PUT /api/admin/predictions/contest/settings
   * Admin: Update contest configuration.
   */
  app.put('/api/admin/predictions/contest/settings', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const updated = await updateContestSettings(req.body);
      await logActivity(req.dbUser.id, 'UPDATE', 'CONTEST_SETTINGS', String(updated.id), req.body);
      return res.json({ success: true, settings: updated });
    } catch (error: any) {
      console.error('Error updating contest settings:', error);
      return res.status(400).json({ error: error.message || 'فشل في تحديث إعدادات المسابقة' });
    }
  });

  /**
   * GET /api/predictions/contest/my-status
   * Fetch current user's registration status in the contest.
   */
  app.get('/api/predictions/contest/my-status', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const status = await getUserParticipationStatus(req.dbUser.id, isNaN(contestId as number) ? undefined : contestId);
      return res.json(status);
    } catch (error: any) {
      console.error('Error fetching participation status:', error);
      return res.status(500).json({ error: 'فشل في جلب حالة الاشتراك' });
    }
  });

  /**
   * POST /api/predictions/contest/apply
   * User: Submit pre-registration application for the contest.
   */
  app.post('/api/predictions/contest/apply', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
      const { notes, contestId } = req.body;
      const parsedContestId = contestId ? parseInt(String(contestId), 10) : undefined;
      const result = await requestContestParticipation(
        req.dbUser.id,
        notes,
        parsedContestId && !isNaN(parsedContestId) ? parsedContestId : undefined
      );
      await logActivity(req.dbUser.id, 'APPLY', 'CONTEST_PARTICIPANT', String(req.dbUser.id), { contestId: parsedContestId });
      return res.json(result);
    } catch (error: any) {
      console.error('Error requesting contest participation:', error);
      return res.status(400).json({ error: error.message || 'فشل في تقديم طلب الاشتراك' });
    }
  });

  /**
   * GET /api/admin/predictions/participants
   * Admin: List all contest participants with filters.
   */
  app.get('/api/admin/predictions/participants', requirePermission('predictions_participants_manage'), async (req: AuthRequest, res) => {
    try {
      const statusFilter = (req.query.status as string) || undefined;
      const search = (req.query.search as string) || undefined;
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const list = await getAdminContestParticipants(
        statusFilter,
        search,
        isNaN(contestId as number) ? undefined : contestId
      );
      return res.json(list);
    } catch (error: any) {
      console.error('Error fetching admin contest participants:', error);
      return res.status(500).json({ error: 'فشل في جلب قائمة المشتركين' });
    }
  });

  /**
   * PUT /api/admin/predictions/participants/:id/status
   * Admin: Approve, reject, block, or reset participant.
   */
  app.put('/api/admin/predictions/participants/:id/status', requirePermission('predictions_participants_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المشترك');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const { status, notes } = req.body;
      if (!['approved', 'rejected', 'blocked', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'حالة غير صالحة' });
      }

      const result = await updateParticipantStatus(idCheck.value, status, req.dbUser.id, notes);
      await logActivity(req.dbUser.id, 'UPDATE_STATUS', 'CONTEST_PARTICIPANT', String(idCheck.value), { status, notes });
      return res.json(result);
    } catch (error: any) {
      console.error('Error updating participant status:', error);
      return res.status(400).json({ error: error.message || 'فشل في تعديل حالة المشترك' });
    }
  });

  /**
   * DELETE /api/admin/predictions/participants/:id
   * Admin: Delete participant record.
   */
  app.delete('/api/admin/predictions/participants/:id', requirePermission('predictions_participants_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المشترك');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const result = await removeParticipant(idCheck.value);
      await logActivity(req.dbUser.id, 'DELETE', 'CONTEST_PARTICIPANT', String(idCheck.value));
      return res.json(result);
    } catch (error: any) {
      console.error('Error removing participant:', error);
      return res.status(500).json({ error: 'فشل في حذف طلب الاشتراك' });
    }
  });

  /**
   * GET /api/predictions
   * Fetch all active prediction matches (with user prediction if logged in).
   */
  app.get('/api/predictions', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser ? req.dbUser.id : null;
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const list = await getPredictionMatches(userId, isNaN(contestId as number) ? undefined : contestId);
      return res.json(list);
    } catch (error: any) {
      console.error('Error fetching prediction matches:', error);
      return res.status(500).json({ error: 'فشل في جلب مباريات التوقعات' });
    }
  });

  /**
   * GET /api/predictions/my
   * Fetch current user's prediction history.
   */
  app.get('/api/predictions/my', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const history = await getUserPredictionsHistory(req.dbUser.id, isNaN(contestId as number) ? undefined : contestId);
      return res.json(history);
    } catch (error: any) {
      console.error('Error fetching user prediction history:', error);
      return res.status(500).json({ error: 'فشل في جلب سجل التوقعات' });
    }
  });

  /**
   * GET /api/predictions/stats
   * Fetch current user's points balance and statistics.
   */
  app.get('/api/predictions/stats', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const stats = await getUserPredictionStats(req.dbUser.id, isNaN(contestId as number) ? undefined : contestId);
      return res.json(stats);
    } catch (error: any) {
      console.error('Error fetching user prediction stats:', error);
      return res.status(500).json({ error: 'فشل في جلب إحصائيات التوقعات' });
    }
  });

  /**
   * POST /api/predictions
   * Submit or update a match prediction. Strictly validated on backend.
   */
  app.post('/api/predictions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للمشاركة في التوقعات' });

      const { predictionMatchId, homeScore, awayScore } = req.body;

      const pIdCheck = validatePositiveId(predictionMatchId, 'معرف مباراة التوقع');
      if (!pIdCheck.valid || pIdCheck.value === undefined) {
        return res.status(400).json({ error: pIdCheck.error || 'معرف مباراة التوقع غير صالح' });
      }

      const hScoreCheck = validateScore(homeScore, 'أهداف الفريق الأول');
      if (!hScoreCheck.valid || hScoreCheck.value === undefined) {
        return res.status(400).json({ error: hScoreCheck.error || 'أهداف الفريق الأول غير صحيحة' });
      }

      const aScoreCheck = validateScore(awayScore, 'أهداف الفريق الثاني');
      if (!aScoreCheck.valid || aScoreCheck.value === undefined) {
        return res.status(400).json({ error: aScoreCheck.error || 'أهداف الفريق الثاني غير صحيحة' });
      }

      const result = await saveUserPrediction(req.dbUser.id, pIdCheck.value, hScoreCheck.value, aScoreCheck.value);
      return res.json(result);
    } catch (error: any) {
      console.error('Error saving prediction:', error);
      return res.status(400).json({ error: error.message || 'فشل في حفظ التوقع' });
    }
  });

  /**
   * PUT /api/predictions/:id
   * User: Update own prediction by ID within allowed 1-minute window.
   */
  app.put('/api/predictions/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });

      const idCheck = validatePositiveId(req.params.id, 'معرف التوقع');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف التوقع غير صالح' });
      }

      const { homeScore, awayScore } = req.body;
      const hScoreCheck = validateScore(homeScore, 'أهداف الفريق الأول');
      if (!hScoreCheck.valid || hScoreCheck.value === undefined) {
        return res.status(400).json({ error: hScoreCheck.error || 'أهداف الفريق الأول غير صحيحة' });
      }

      const aScoreCheck = validateScore(awayScore, 'أهداف الفريق الثاني');
      if (!aScoreCheck.valid || aScoreCheck.value === undefined) {
        return res.status(400).json({ error: aScoreCheck.error || 'أهداف الفريق الثاني غير صحيحة' });
      }

      const result = await updateUserPredictionById(req.dbUser.id, idCheck.value, hScoreCheck.value, aScoreCheck.value);
      return res.json(result);
    } catch (error: any) {
      console.error('Error updating prediction:', error);
      return res.status(400).json({ error: error.message || 'فشل في تعديل التوقع' });
    }
  });

  /**
   * DELETE /api/predictions/:id
   * User: Regular users cannot delete predictions per contest rules.
   */
  app.delete('/api/predictions/:id', requireAuth, async (req: AuthRequest, res) => {
    return res.status(403).json({ error: 'المستخدم العادي لا يستطيع حذف التوقعات' });
  });

  /**
   * GET /api/predictions/leaderboard
   * Get the global predictions leaderboard.
   */
  app.get('/api/predictions/leaderboard', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const currentUserId = req.dbUser ? req.dbUser.id : undefined;
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const data = await getLeaderboard(currentUserId, 100, isNaN(contestId as number) ? undefined : contestId);
      return res.json(data);
    } catch (error: any) {
      console.error('Error fetching predictions leaderboard:', error);
      return res.status(500).json({ error: 'فشل في جلب لائحة المتصدرين' });
    }
  });

  /**
   * GET /api/predictions/leaderboard/golden
   * Get the Golden predictions leaderboard.
   */
  app.get('/api/predictions/leaderboard/golden', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const currentUserId = req.dbUser ? req.dbUser.id : undefined;
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const data = await getGoldenLeaderboard(currentUserId, 100, isNaN(contestId as number) ? undefined : contestId);
      return res.json(data);
    } catch (error: any) {
      console.error('Error fetching golden leaderboard:', error);
      return res.status(500).json({ error: 'فشل في جلب لائحة التوقعات الذهبية' });
    }
  });

  // ==========================================
  // ADMIN PREDICTION MANAGEMENT ROUTES
  // ==========================================

  /**
   * GET /api/admin/predictions/stats
   * Admin: Fetch general stats for predictions contest dashboard.
   */
  app.get('/api/admin/predictions/stats', requirePermission('predictions_view'), async (req: AuthRequest, res) => {
    try {
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const stats = await getAdminPredictionStats(isNaN(contestId as number) ? undefined : contestId);
      return res.json(stats);
    } catch (error: any) {
      console.error('Error fetching admin prediction stats:', error);
      return res.status(500).json({ error: 'فشل في جلب إحصائيات التوقعات للإدارة' });
    }
  });

  /**
   * GET /api/admin/predictions/available-matches
   * Admin: Get matches for Today and Tomorrow for quick selection.
   */
  app.get('/api/admin/predictions/available-matches', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const dateFilter = (req.query.date as 'today' | 'tomorrow' | 'all') || 'today';
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const data = await getAdminAvailableMatchesForSelection(
        dateFilter,
        isNaN(contestId as number) ? undefined : contestId
      );
      return res.json(data);
    } catch (error: any) {
      console.error('Error fetching available matches for predictions:', error);
      return res.status(500).json({ error: 'فشل في جلب المباريات المتاحة' });
    }
  });

  /**
   * GET /api/admin/predictions/teams-and-leagues
   * Admin: Fetch all existing teams and leagues in the system for autocomplete / reuse.
   */
  app.get('/api/admin/predictions/teams-and-leagues', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const data = await getExistingTeamsAndLeagues();
      return res.json(data);
    } catch (error: any) {
      console.error('Error fetching existing teams and leagues:', error);
      return res.status(500).json({ error: 'فشل في جلب قائمة الفرق والبطولات' });
    }
  });

  /**
   * GET /api/admin/predictions
   * Fetch all prediction matches with admin meta and user participation.
   */
  app.get('/api/admin/predictions', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const contestId = req.query.contestId ? parseInt(req.query.contestId as string, 10) : undefined;
      const data = await getAdminPredictionMatches(isNaN(contestId as number) ? undefined : contestId);
      return res.json(data);
    } catch (error: any) {
      console.error('Error fetching admin prediction matches:', error);
      return res.status(500).json({ error: 'فشل في جلب مباريات التوقعات للإدارة' });
    }
  });

  /**
   * POST /api/admin/predictions
   * Add a system match (or multiple matches) to the prediction contest list with custom points per match.
   */
  app.post('/api/admin/predictions', requirePermission('predictions_match_add'), async (req: AuthRequest, res) => {
    try {
      const { matchId, matchIds, pointsPerMatch, contestId } = req.body;

      let pts = 2;
      if (pointsPerMatch !== undefined && pointsPerMatch !== null) {
        const ptsCheck = validatePointsPerMatch(pointsPerMatch, 'نقاط المباراة');
        if (!ptsCheck.valid || ptsCheck.value === undefined) {
          return res.status(400).json({ error: ptsCheck.error || 'نقاط المباراة غير صحيحة' });
        }
        pts = ptsCheck.value;
      }

      const parsedContestId = contestId ? parseInt(String(contestId), 10) : undefined;
      const validContestId = parsedContestId && !isNaN(parsedContestId) ? parsedContestId : undefined;

      // Handle batch addition if matchIds array is provided
      if (Array.isArray(matchIds)) {
        const filteredIds = matchIds.map((id) => String(id).trim()).filter(Boolean);
        if (filteredIds.length === 0) {
          return res.status(400).json({ error: 'يرجى تحديد مباراة واحدة على الأقل' });
        }

        const result = await addMultipleMatchesToPredictions(filteredIds, pts, validContestId);
        await logActivity(req.dbUser.id, 'CREATE_BATCH', 'PREDICTION_MATCH', filteredIds.join(','), {
          matchIds: filteredIds,
          pointsPerMatch: pts,
          contestId: validContestId,
          totalProcessed: result.totalProcessed,
        });
        return res.status(201).json(result);
      }

      // Handle single match addition
      if (!matchId || typeof matchId !== 'string' || !matchId.trim()) {
        return res.status(400).json({ error: 'معرف المباراة مطلوب' });
      }

      const result = await addMatchToPredictions(
        matchId.trim(),
        pts,
        validContestId
      );
      await logActivity(req.dbUser.id, 'CREATE', 'PREDICTION_MATCH', matchId, {
        matchId,
        pointsPerMatch: pts,
        contestId: validContestId,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error adding match to predictions:', error);
      return res.status(400).json({ error: error.message || 'فشل في إضافة المباراة للتوقعات' });
    }
  });

  /**
   * POST /api/admin/predictions/custom-match
   * Admin: Add a match from an external league not in KoraNews with custom points.
   */
  app.post('/api/admin/predictions/custom-match', requirePermission('predictions_match_add'), async (req: AuthRequest, res) => {
    try {
      const {
        leagueName,
        leagueLogo,
        homeTeamName,
        homeTeamLogo,
        awayTeamName,
        awayTeamLogo,
        matchDate,
        pointsPerMatch,
        contestId,
      } = req.body;

      let pts = 2;
      if (pointsPerMatch !== undefined && pointsPerMatch !== null) {
        const ptsCheck = validatePointsPerMatch(pointsPerMatch, 'نقاط المباراة');
        if (!ptsCheck.valid || ptsCheck.value === undefined) {
          return res.status(400).json({ error: ptsCheck.error || 'نقاط المباراة غير صحيحة' });
        }
        pts = ptsCheck.value;
      }

      const parsedContestId = contestId ? parseInt(String(contestId), 10) : undefined;
      const result = await addCustomExternalMatchToPredictions({
        leagueName,
        leagueLogo,
        homeTeamName,
        homeTeamLogo,
        awayTeamName,
        awayTeamLogo,
        matchDate,
        pointsPerMatch: pts,
        contestId: parsedContestId && !isNaN(parsedContestId) ? parsedContestId : undefined,
      });
      await logActivity(req.dbUser.id, 'CREATE_CUSTOM', 'PREDICTION_MATCH', String(result.id), {
        leagueName,
        homeTeamName,
        awayTeamName,
        pointsPerMatch: pts,
        contestId: parsedContestId,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error adding custom prediction match:', error);
      return res.status(400).json({ error: error.message || 'فشل في إضافة المباراة الخارجية' });
    }
  });

  /**
   * PUT /api/admin/predictions/:id/points
   * Admin: Update points for a prediction match.
   */
  app.put('/api/admin/predictions/:id/points', requirePermission('predictions_points_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const { pointsPerMatch } = req.body;
      const ptsCheck = validatePointsPerMatch(pointsPerMatch, 'نقاط المباراة');
      if (!ptsCheck.valid || ptsCheck.value === undefined) {
        return res.status(400).json({ error: ptsCheck.error || 'قيمة النقاط غير صحيحة' });
      }

      const result = await updatePredictionMatchPoints(idCheck.value, ptsCheck.value);
      await logActivity(req.dbUser.id, 'UPDATE_POINTS', 'PREDICTION_MATCH', String(idCheck.value), { pointsPerMatch: ptsCheck.value });
      return res.json(result);
    } catch (error: any) {
      console.error('Error updating prediction match points:', error);
      return res.status(400).json({ error: error.message || 'فشل في تحديث نقاط المباراة' });
    }
  });

  /**
   * POST /api/admin/predictions/:id/confirm-result
   * Admin: Manually confirm match final score, award points (+2) and display winners.
   */
  app.post('/api/admin/predictions/:id/confirm-result', requirePermission('predictions_results_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const { homeScore, awayScore } = req.body;
      let parsedHome: number | undefined;
      let parsedAway: number | undefined;

      if (homeScore !== undefined && homeScore !== null) {
        const hCheck = validateScore(homeScore, 'أهداف الفريق الأول');
        if (!hCheck.valid || hCheck.value === undefined) {
          return res.status(400).json({ error: hCheck.error || 'أهداف الفريق الأول غير صحيحة' });
        }
        parsedHome = hCheck.value;
      }

      if (awayScore !== undefined && awayScore !== null) {
        const aCheck = validateScore(awayScore, 'أهداف الفريق الثاني');
        if (!aCheck.valid || aCheck.value === undefined) {
          return res.status(400).json({ error: aCheck.error || 'أهداف الفريق الثاني غير صحيحة' });
        }
        parsedAway = aCheck.value;
      }

      const result = await confirmAndEvaluatePredictionMatch(idCheck.value, req.dbUser.id, parsedHome, parsedAway);
      await logActivity(req.dbUser.id, 'CONFIRM_RESULT', 'PREDICTION_MATCH', String(idCheck.value), {
        finalScore: result.finalScore,
        evaluatedCount: result.evaluatedCount,
        pointsAwarded: result.pointsAwarded,
      });

      return res.json({
        success: true,
        message: `تم اعتماد النتيجة بنجاح واحتساب نقاط ${result.correctPredictorsCount} فائز وتحديث الترتيب.`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error confirming match prediction result:', error);
      return res.status(400).json({ error: error.message || 'فشل في اعتماد نتيجة المباراة' });
    }
  });

  /**
   * PUT /api/admin/predictions/:id/result
   * Admin: Edit match result (homeScore, awayScore, status) and safely recalculate points without duplicates.
   */
  app.put('/api/admin/predictions/:id/result', requirePermission('predictions_results_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const { homeScore, awayScore, status } = req.body;
      const hCheck = validateScore(homeScore, 'أهداف الفريق الأول');
      if (!hCheck.valid || hCheck.value === undefined) {
        return res.status(400).json({ error: hCheck.error || 'أهداف الفريق الأول غير صحيحة' });
      }
      const aCheck = validateScore(awayScore, 'أهداف الفريق الثاني');
      if (!aCheck.valid || aCheck.value === undefined) {
        return res.status(400).json({ error: aCheck.error || 'أهداف الفريق الثاني غير صحيحة' });
      }

      const result = await updatePredictionMatchResult(idCheck.value, req.dbUser.id, {
        homeScore: hCheck.value,
        awayScore: aCheck.value,
        status: status || 'FINISHED',
      });

      await logActivity(req.dbUser.id, 'UPDATE_RESULT', 'PREDICTION_MATCH', String(idCheck.value), {
        homeScore: hCheck.value,
        awayScore: aCheck.value,
        status: status || 'FINISHED',
      });

      return res.json({
        success: true,
        message: 'تم تحديث نتيجة المباراة وإعادة احتساب النقاط بنجاح دون أي تكرار',
        data: result,
      });
    } catch (error: any) {
      console.error('Error updating prediction match result:', error);
      return res.status(400).json({ error: error.message || 'فشل في تعديل نتيجة المباراة' });
    }
  });

  /**
   * PUT /api/admin/predictions/:id
   * Admin: Edit match details (teams, time, league, points, status, score, isActive).
   */
  app.put('/api/admin/predictions/:id', requirePermission('predictions_match_edit'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const {
        homeTeamName,
        homeTeamLogo,
        awayTeamName,
        awayTeamLogo,
        leagueName,
        leagueLogo,
        matchDate,
        pointsPerMatch,
        homeScore,
        awayScore,
        status,
        isActive,
      } = req.body;

      if (pointsPerMatch !== undefined && pointsPerMatch !== null) {
        const ptsCheck = validatePointsPerMatch(pointsPerMatch, 'نقاط المباراة');
        if (!ptsCheck.valid) {
          return res.status(400).json({ error: ptsCheck.error || 'قيمة النقاط غير صحيحة' });
        }
      }

      const result = await updatePredictionMatchDetails(idCheck.value, req.dbUser.id, {
        homeTeamName,
        homeTeamLogo,
        awayTeamName,
        awayTeamLogo,
        leagueName,
        leagueLogo,
        matchDate,
        pointsPerMatch,
        homeScore,
        awayScore,
        status,
        isActive,
      });

      await logActivity(req.dbUser.id, 'UPDATE_MATCH_DETAILS', 'PREDICTION_MATCH', String(idCheck.value), {
        homeTeamName,
        awayTeamName,
        leagueName,
        pointsPerMatch,
        status,
        homeScore,
        awayScore,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error updating prediction match details:', error);
      return res.status(400).json({ error: error.message || 'فشل في تعديل بيانات التوقع' });
    }
  });

  /**
   * PUT /api/admin/predictions/:id/toggle
   * Toggle activation status of a prediction match.
   */
  app.put('/api/admin/predictions/:id/toggle', requirePermission('predictions_match_edit'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const { isActive } = req.body;
      const result = await togglePredictionMatchActive(idCheck.value, !!isActive);
      await logActivity(req.dbUser.id, 'UPDATE', 'PREDICTION_MATCH', String(idCheck.value), { isActive: !!isActive });
      return res.json(result);
    } catch (error: any) {
      console.error('Error toggling prediction match:', error);
      return res.status(500).json({ error: 'فشل في تغيير حالة التوقع' });
    }
  });

  /**
   * DELETE /api/admin/predictions/:id
   * Remove match from prediction contest.
   */
  app.delete('/api/admin/predictions/:id', requirePermission('predictions_match_delete'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف المباراة');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف غير صحيح' });
      }

      const result = await removePredictionMatch(idCheck.value);
      await logActivity(req.dbUser.id, 'DELETE', 'PREDICTION_MATCH', String(idCheck.value));
      return res.json(result);
    } catch (error: any) {
      console.error('Error removing prediction match:', error);
      return res.status(500).json({ error: 'فشل في حذف المباراة من التوقعات' });
    }
  });

  /**
   * POST /api/admin/predictions/leagues
   * Admin: Add a new league or tournament explicitly.
   */
  app.post('/api/admin/predictions/leagues', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const { name, logo } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'اسم الدوري أو البطولة مطلوب' });
      }
      const newLeague = await createAdminLeague(name.trim(), logo?.trim() || null);
      await logActivity(req.dbUser.id, 'CREATE', 'LEAGUE', newLeague.id, { name: newLeague.name });
      return res.json({ success: true, league: newLeague });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'فشل في إضافة الدوري' });
    }
  });

  /**
   * POST /api/admin/predictions/teams
   * Admin: Add a new team or national team explicitly.
   */
  app.post('/api/admin/predictions/teams', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const { name, logo } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'اسم الفريق أو المنتخب مطلوب' });
      }
      const newTeam = await createAdminTeam(name.trim(), logo?.trim() || null);
      await logActivity(req.dbUser.id, 'CREATE', 'TEAM', newTeam.id, { name: newTeam.name });
      return res.json({ success: true, team: newTeam });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'فشل في إضافة الفريق' });
    }
  });

  /**
   * POST /api/admin/predictions/user-prediction
   * Admin: Add or save a prediction for a participant on a match.
   */
  app.post('/api/admin/predictions/user-prediction', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const { userId, predictionMatchId, homeScore, awayScore } = req.body;

      const uidCheck = validatePositiveId(userId, 'معرف المستخدم');
      if (!uidCheck.valid || uidCheck.value === undefined) {
        return res.status(400).json({ error: uidCheck.error || 'معرف المستخدم غير صالح' });
      }

      const pmidCheck = validatePositiveId(predictionMatchId, 'معرف مباراة التوقع');
      if (!pmidCheck.valid || pmidCheck.value === undefined) {
        return res.status(400).json({ error: pmidCheck.error || 'معرف مباراة التوقع غير صالح' });
      }

      const hScoreVal = validateScore(homeScore, 'أهداف الفريق المضيف');
      if (!hScoreVal.valid || hScoreVal.value === undefined) {
        return res.status(400).json({ error: hScoreVal.error });
      }

      const aScoreVal = validateScore(awayScore, 'أهداف الفريق الضيف');
      if (!aScoreVal.valid || aScoreVal.value === undefined) {
        return res.status(400).json({ error: aScoreVal.error });
      }

      const result = await adminSaveUserPrediction(
        req.dbUser.id,
        uidCheck.value,
        pmidCheck.value,
        hScoreVal.value,
        aScoreVal.value
      );

      await logActivity(req.dbUser.id, 'ADMIN_SAVE', 'PREDICTION', String(pmidCheck.value), {
        userId: uidCheck.value,
        homeScore: hScoreVal.value,
        awayScore: aScoreVal.value,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error in admin save user prediction:', error);
      return res.status(400).json({ error: error.message || 'فشل في حفظ توقع المشارك' });
    }
  });

  /**
   * PUT /api/admin/predictions/user-prediction/:id
   * Admin: Edit an existing prediction score directly.
   */
  app.put('/api/admin/predictions/user-prediction/:id', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف التوقع');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف التوقع غير صالح' });
      }

      const { homeScore, awayScore } = req.body;
      const hScoreVal = validateScore(homeScore, 'أهداف الفريق المضيف');
      if (!hScoreVal.valid || hScoreVal.value === undefined) {
        return res.status(400).json({ error: hScoreVal.error });
      }

      const aScoreVal = validateScore(awayScore, 'أهداف الفريق الضيف');
      if (!aScoreVal.valid || aScoreVal.value === undefined) {
        return res.status(400).json({ error: aScoreVal.error });
      }

      const result = await adminUpdateUserPrediction(
        req.dbUser.id,
        idCheck.value,
        hScoreVal.value,
        aScoreVal.value
      );

      await logActivity(req.dbUser.id, 'ADMIN_UPDATE', 'PREDICTION', String(idCheck.value), {
        homeScore: hScoreVal.value,
        awayScore: aScoreVal.value,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error in admin update user prediction:', error);
      return res.status(400).json({ error: error.message || 'فشل في تعديل التوقع' });
    }
  });

  /**
   * DELETE /api/admin/predictions/user-prediction/:id
   * Admin: Delete any user prediction with complete points cleanup.
   */
  app.delete('/api/admin/predictions/user-prediction/:id', requirePermission('predictions_manage'), async (req: AuthRequest, res) => {
    try {
      const idCheck = validatePositiveId(req.params.id, 'معرف التوقع');
      if (!idCheck.valid || idCheck.value === undefined) {
        return res.status(400).json({ error: idCheck.error || 'معرف التوقع غير صالح' });
      }

      const result = await adminDeleteUserPrediction(req.dbUser.id, idCheck.value);

      await logActivity(req.dbUser.id, 'ADMIN_DELETE', 'PREDICTION', String(idCheck.value));

      return res.json(result);
    } catch (error: any) {
      console.error('Error in admin delete user prediction:', error);
      return res.status(400).json({ error: error.message || 'فشل في حذف التوقع' });
    }
  });

  // ==========================================
  // ADMIN DASHBOARD ROUTES
  // ==========================================

  app.get('/api/admin/stats', requirePermission(), async (req: AuthRequest, res) => {
    try {
      const statsData = await withDbRetry(async () => {
        const newsCount = await db.select({ count: sql`count(*)` }).from(news);
        const publishedCount = await db.select({ count: sql`count(*)` }).from(news).where(eq(news.status, 'published'));
        const draftsCount = await db.select({ count: sql`count(*)` }).from(news).where(eq(news.status, 'draft'));
        const usersCount = await db.select({ count: sql`count(*)` }).from(users);
        const adminsCount = await db.select({ count: sql`count(*)` }).from(users).where(sql`role IN ('admin', 'superadmin', 'manager', 'system_manager', 'owner', 'system_owner') OR is_admin = true`);

        const latestNewsRows = await db
          .select({
            id: news.id,
            title: news.title,
            status: news.status,
            isFeatured: news.isFeatured,
            isBreaking: news.isBreaking,
            createdAt: news.createdAt,
            authorName: users.name,
            categoryName: categories.name,
          })
          .from(news)
          .leftJoin(users, eq(news.authorId, users.id))
          .leftJoin(categories, eq(news.categoryId, categories.id))
          .orderBy(desc(news.createdAt))
          .limit(5);

        const latestNews = latestNewsRows.map((n) => ({
          id: n.id,
          title: n.title,
          status: n.status,
          isFeatured: n.isFeatured,
          isBreaking: n.isBreaking,
          createdAt: n.createdAt,
          author: n.authorName ? { name: n.authorName } : null,
          category: n.categoryName ? { name: n.categoryName } : null,
        }));

        const recentActivityRows = await db
          .select({
            id: activityLogs.id,
            userId: activityLogs.userId,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt,
            userName: users.name,
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .orderBy(desc(activityLogs.createdAt))
          .limit(10);

        const recentActivity = recentActivityRows.map((a) => ({
          id: a.id,
          userId: a.userId,
          action: a.action,
          targetType: a.entityType,
          targetId: a.entityId,
          details: a.details,
          createdAt: a.createdAt,
          user: a.userName ? { name: a.userName } : null,
        }));

        return {
          newsCount: Number(newsCount[0]?.count || 0),
          publishedCount: Number(publishedCount[0]?.count || 0),
          draftsCount: Number(draftsCount[0]?.count || 0),
          usersCount: Number(usersCount[0]?.count || 0),
          adminsCount: Number(adminsCount[0]?.count || 0),
          latestNews,
          recentActivity,
        };
      });

      return res.json(statsData);
    } catch (e) {
      console.error('Admin stats error:', e);
      return res.status(500).json({ error: true });
    }
  });

  app.get('/api/admin/system/compatibility-audit', requireOwner, async (req: AuthRequest, res) => {
    try {
      const report = await runSystemCompatibilityAudit();
      return res.json({ success: true, report });
    } catch (e: any) {
      console.error('Compatibility audit error:', e);
      return res.status(500).json({ error: 'فشل فحص توافق قاعدة البيانات' });
    }
  });

  /**
   * GET /api/admin/logs
   * Fetches paginated activity audit logs with search and category filtering.
   */
  app.get('/api/admin/logs', requirePermission('activity_logs_view'), async (req: AuthRequest, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const offset = (page - 1) * limit;

      const actionFilter = typeof req.query.action === 'string' && req.query.action.trim() && req.query.action !== 'ALL'
        ? req.query.action.trim()
        : null;
      const entityFilter = typeof req.query.entityType === 'string' && req.query.entityType.trim() && req.query.entityType !== 'ALL'
        ? req.query.entityType.trim()
        : null;
      const search = typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim()
        : null;

      const conditions = [];

      if (actionFilter) {
        conditions.push(eq(activityLogs.action, actionFilter));
      }

      if (entityFilter) {
        conditions.push(eq(activityLogs.entityType, entityFilter));
      }

      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            ilike(activityLogs.action, searchPattern),
            ilike(activityLogs.entityType, searchPattern),
            ilike(activityLogs.entityId, searchPattern),
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern),
            sql`CAST(${activityLogs.details} AS TEXT) ILIKE ${searchPattern}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countRes] = await withDbRetry(() =>
        db
          .select({ count: sql<number>`count(*)` })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .where(whereClause)
      );
      const total = Number(countRes?.count || 0);

      const rows = await withDbRetry(() =>
        db
          .select({
            id: activityLogs.id,
            userId: activityLogs.userId,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt,
            userName: users.name,
            userEmail: users.email,
            userAvatar: users.avatar,
            userRole: users.role,
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .where(whereClause)
          .orderBy(desc(activityLogs.createdAt))
          .limit(limit)
          .offset(offset)
      );

      const formattedLogs = rows.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt,
        timestamp: log.createdAt,
        user: log.userName || log.userEmail || `مشرف #${log.userId}`,
        userName: log.userName,
        userEmail: log.userEmail,
        userAvatar: log.userAvatar,
        userRole: log.userRole,
      }));

      // If flat array format requested
      if (req.query.flat === 'true') {
        return res.json(formattedLogs);
      }

      return res.json({
        logs: formattedLogs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (error: any) {
      console.error('Error fetching admin logs:', error);
      return res.status(500).json({ error: 'فشل في جلب سجل العمليات' });
    }
  });

  /**
   * DELETE /api/admin/logs
   * Purges or clears activity logs. System Owner only for security.
   */
  app.delete('/api/admin/logs', requireOwner, async (req: AuthRequest, res) => {
    try {
      const daysOld = parseInt(req.query.daysOld as string, 10);
      let deletedCount = 0;
      if (!isNaN(daysOld) && daysOld > 0) {
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const delRes = await withDbRetry(() =>
          db.delete(activityLogs).where(lt(activityLogs.createdAt, cutoff))
        );
        deletedCount = delRes.rowCount || 0;
      } else {
        const delRes = await withDbRetry(() => db.delete(activityLogs));
        deletedCount = delRes.rowCount || 0;
      }

      if (req.dbUser) {
        await logActivity(req.dbUser.id, 'PURGE', 'ACTIVITY_LOGS', 'ALL', {
          daysOld: isNaN(daysOld) ? 'ALL' : daysOld,
          deletedCount,
        });
      }

      return res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error('Error clearing activity logs:', error);
      return res.status(500).json({ error: 'فشل في مسح سجل العمليات' });
    }
  });

  /**
   * POST /api/errors/report
   * Report an error from client/frontend or external services
   */
  app.post('/api/errors/report', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { message, stack, source, severity, metadata, endpoint, statusCode } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'حقل رسالة الخطأ مطلوب' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';

      await logErrorToDb({
        source: typeof source === 'string' && source ? source : 'client',
        severity: (['fatal', 'error', 'warning', 'info'].includes(severity) ? severity : 'error') as any,
        message: message.trim(),
        stack: typeof stack === 'string' ? stack : undefined,
        endpoint: typeof endpoint === 'string' ? endpoint : (req.headers['referer'] as string || undefined),
        statusCode: typeof statusCode === 'number' ? statusCode : 500,
        userId: req.dbUser?.id,
        userEmail: req.dbUser?.email,
        ipAddress: clientIp,
        userAgent,
        metadata: metadata || null,
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error reporting client error:', err);
      return res.status(500).json({ error: 'فشل في تسجيل الخطأ' });
    }
  });

  /**
   * GET /api/admin/errors
   * Paginated error logs with search, severity and source filters, and stats summary
   * Restricted to System Manager & System Owner only
   */
  app.get('/api/admin/errors', requireManager, async (req: AuthRequest, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const offset = (page - 1) * limit;

      const severityFilter = typeof req.query.severity === 'string' && req.query.severity.trim() && req.query.severity !== 'ALL'
        ? req.query.severity.trim()
        : null;
      const sourceFilter = typeof req.query.source === 'string' && req.query.source.trim() && req.query.source !== 'ALL'
        ? req.query.source.trim()
        : null;
      const resolvedFilter = typeof req.query.resolved === 'string' && req.query.resolved.trim() && req.query.resolved !== 'ALL'
        ? req.query.resolved.trim() === 'true'
        : null;
      const search = typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim()
        : null;

      const conditions = [];
      if (severityFilter) {
        conditions.push(eq(errorLogs.severity, severityFilter));
      }
      if (sourceFilter) {
        conditions.push(eq(errorLogs.source, sourceFilter));
      }
      if (resolvedFilter !== null) {
        conditions.push(eq(errorLogs.resolved, resolvedFilter));
      }
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            ilike(errorLogs.message, searchPattern),
            ilike(errorLogs.endpoint, searchPattern),
            ilike(errorLogs.userEmail, searchPattern),
            ilike(errorLogs.stack, searchPattern)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await withDbRetry(() =>
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(errorLogs)
          .where(whereClause)
      );
      const total = countResult?.count || 0;

      // Stats counters
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [statsResult] = await withDbRetry(() =>
        db
          .select({
            total: sql<number>`count(*)::int`,
            fatal: sql<number>`count(case when ${errorLogs.severity} = 'fatal' then 1 end)::int`,
            error: sql<number>`count(case when ${errorLogs.severity} = 'error' then 1 end)::int`,
            warning: sql<number>`count(case when ${errorLogs.severity} = 'warning' then 1 end)::int`,
            unresolved: sql<number>`count(case when ${errorLogs.resolved} = false then 1 end)::int`,
            today: sql<number>`count(case when ${errorLogs.createdAt} >= ${todayStart} then 1 end)::int`,
          })
          .from(errorLogs)
      );

      const rows = await withDbRetry(() =>
        db
          .select({
            id: errorLogs.id,
            source: errorLogs.source,
            severity: errorLogs.severity,
            message: errorLogs.message,
            stack: errorLogs.stack,
            endpoint: errorLogs.endpoint,
            statusCode: errorLogs.statusCode,
            userId: errorLogs.userId,
            userEmail: errorLogs.userEmail,
            ipAddress: errorLogs.ipAddress,
            userAgent: errorLogs.userAgent,
            metadata: errorLogs.metadata,
            resolved: errorLogs.resolved,
            resolvedAt: errorLogs.resolvedAt,
            resolvedBy: errorLogs.resolvedBy,
            createdAt: errorLogs.createdAt,
            resolverName: users.name,
            resolverEmail: users.email,
          })
          .from(errorLogs)
          .leftJoin(users, eq(errorLogs.resolvedBy, users.id))
          .where(whereClause)
          .orderBy(desc(errorLogs.createdAt))
          .limit(limit)
          .offset(offset)
      );

      const formattedErrors = rows.map((r) => ({
        id: r.id,
        source: r.source,
        severity: r.severity,
        message: r.message,
        stack: r.stack,
        endpoint: r.endpoint,
        statusCode: r.statusCode,
        userId: r.userId,
        userEmail: r.userEmail,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        metadata: r.metadata,
        resolved: r.resolved,
        resolvedAt: r.resolvedAt,
        resolvedBy: r.resolvedBy,
        resolvedByName: r.resolverName || r.resolverEmail || null,
        createdAt: r.createdAt,
      }));

      return res.json({
        errors: formattedErrors,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        stats: statsResult || {
          total: 0,
          fatal: 0,
          error: 0,
          warning: 0,
          unresolved: 0,
          today: 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching error logs:', error);
      return res.status(500).json({ error: 'فشل في جلب سجل الأخطاء' });
    }
  });

  /**
   * GET /api/admin/errors/export
   * Export error logs as CSV or TXT format file
   * Restricted to System Manager & System Owner only
   */
  app.get('/api/admin/errors/export', requireManager, async (req: AuthRequest, res) => {
    try {
      const format = (req.query.format as string)?.toLowerCase() === 'txt' ? 'txt' : 'csv';
      const severityFilter = typeof req.query.severity === 'string' && req.query.severity.trim() && req.query.severity !== 'ALL'
        ? req.query.severity.trim()
        : null;
      const sourceFilter = typeof req.query.source === 'string' && req.query.source.trim() && req.query.source !== 'ALL'
        ? req.query.source.trim()
        : null;
      const resolvedFilter = typeof req.query.resolved === 'string' && req.query.resolved.trim() && req.query.resolved !== 'ALL'
        ? req.query.resolved.trim() === 'true'
        : null;
      const search = typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim()
        : null;

      const conditions = [];
      if (severityFilter) conditions.push(eq(errorLogs.severity, severityFilter));
      if (sourceFilter) conditions.push(eq(errorLogs.source, sourceFilter));
      if (resolvedFilter !== null) conditions.push(eq(errorLogs.resolved, resolvedFilter));
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            ilike(errorLogs.message, searchPattern),
            ilike(errorLogs.endpoint, searchPattern),
            ilike(errorLogs.userEmail, searchPattern),
            ilike(errorLogs.stack, searchPattern)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await withDbRetry(() =>
        db
          .select({
            id: errorLogs.id,
            source: errorLogs.source,
            severity: errorLogs.severity,
            message: errorLogs.message,
            stack: errorLogs.stack,
            endpoint: errorLogs.endpoint,
            statusCode: errorLogs.statusCode,
            userId: errorLogs.userId,
            userEmail: errorLogs.userEmail,
            ipAddress: errorLogs.ipAddress,
            userAgent: errorLogs.userAgent,
            metadata: errorLogs.metadata,
            resolved: errorLogs.resolved,
            resolvedAt: errorLogs.resolvedAt,
            createdAt: errorLogs.createdAt,
            resolverName: users.name,
          })
          .from(errorLogs)
          .leftJoin(users, eq(errorLogs.resolvedBy, users.id))
          .where(whereClause)
          .orderBy(desc(errorLogs.createdAt))
          .limit(5000)
      );

      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'csv') {
        const escapeCsv = (str: any) => {
          if (str === null || str === undefined) return '""';
          const s = String(str).replace(/"/g, '""');
          return `"${s}"`;
        };

        const headers = [
          'المعرف (ID)',
          'المستوى (Severity)',
          'المصدر (Source)',
          'رمز الحالة (Status Code)',
          'المسار / الرابط (Endpoint)',
          'رسالة الخطأ (Message)',
          'البريد الإلكتروني (User Email)',
          'معرف المستخدم (User ID)',
          'عنوان IP (IP Address)',
          'تم الحل (Resolved)',
          'تاريخ الحدوث (Created At)',
          'تاريخ المعالجة (Resolved At)',
          'عولج بواسطة (Resolved By)',
          'تتبع الخطأ (Stack Trace)',
        ].map(escapeCsv).join(',');

        const csvLines = rows.map((r) => {
          return [
            escapeCsv(r.id),
            escapeCsv(r.severity),
            escapeCsv(r.source),
            escapeCsv(r.statusCode || ''),
            escapeCsv(r.endpoint || ''),
            escapeCsv(r.message || ''),
            escapeCsv(r.userEmail || ''),
            escapeCsv(r.userId || ''),
            escapeCsv(r.ipAddress || ''),
            escapeCsv(r.resolved ? 'نعم' : 'لا'),
            escapeCsv(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
            escapeCsv(r.resolvedAt ? new Date(r.resolvedAt).toISOString() : ''),
            escapeCsv(r.resolverName || ''),
            escapeCsv(r.stack || ''),
          ].join(',');
        });

        // Add UTF-8 BOM for Arabic Excel compatibility
        const csvContent = '\uFEFF' + [headers, ...csvLines].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="kora-errors-${timestampStr}.csv"`);
        return res.send(csvContent);
      } else {
        // Format: TXT
        let txtContent = `================================================================================\r\n`;
        txtContent += `تقرير سجل الأخطاء - KORANEWS ERROR LOGS REPORT\r\n`;
        txtContent += `تاريخ التصدير: ${new Date().toISOString()}\r\n`;
        txtContent += `إجمالي السجلات: ${rows.length}\r\n`;
        txtContent += `تم الاستخراج بواسطة: ${req.dbUser?.email || 'Admin'} (ID: ${req.dbUser?.id})\r\n`;
        txtContent += `================================================================================\r\n\r\n`;

        rows.forEach((r) => {
          const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : 'N/A';
          txtContent += `[#${r.id}] [${r.severity.toUpperCase()}] [${r.source.toUpperCase()}] - ${dateStr}\r\n`;
          txtContent += `المسار (Endpoint): ${r.endpoint || 'N/A'} | رمز الحالة: ${r.statusCode || 'N/A'}\r\n`;
          txtContent += `المستخدم: ${r.userEmail ? `${r.userEmail} (ID: ${r.userId})` : 'غير مسجل (Guest)'} | IP: ${r.ipAddress || 'N/A'}\r\n`;
          txtContent += `حالة الحل: ${r.resolved ? `تم الحل (${r.resolverName || 'مشرف'} - ${r.resolvedAt ? new Date(r.resolvedAt).toISOString() : ''})` : 'قيد الانتظار (لم يتم الحل)'}\r\n`;
          if (r.userAgent) {
            txtContent += `المتصفح: ${r.userAgent}\r\n`;
          }
          txtContent += `الرسالة:\r\n  ${r.message}\r\n`;
          if (r.stack) {
            txtContent += `تتبع المكدس (Stack Trace):\r\n  ${r.stack.replace(/\n/g, '\r\n  ')}\r\n`;
          }
          if (r.metadata) {
            try {
              txtContent += `بيانات إضافية (Metadata):\r\n  ${JSON.stringify(r.metadata, null, 2).replace(/\n/g, '\r\n  ')}\r\n`;
            } catch (e) {}
          }
          txtContent += `--------------------------------------------------------------------------------\r\n\r\n`;
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="kora-errors-${timestampStr}.txt"`);
        return res.send(txtContent);
      }
    } catch (error: any) {
      console.error('Error exporting error logs:', error);
      return res.status(500).json({ error: 'فشل في تصدير سجل الأخطاء' });
    }
  });

  /**
   * PATCH /api/admin/errors/:id/resolve
   * Mark error as resolved or unresolved
   * Restricted to System Manager & System Owner only
   */
  app.patch('/api/admin/errors/:id/resolve', requireManager, async (req: AuthRequest, res) => {
    try {
      const errorId = parseInt(req.params.id as string, 10);
      if (isNaN(errorId)) return res.status(400).json({ error: 'معرف خطأ غير صحيح' });

      const resolved = req.body.resolved !== false;
      const now = new Date();

      const [updated] = await withDbRetry(() =>
        db
          .update(errorLogs)
          .set({
            resolved,
            resolvedAt: resolved ? now : null,
            resolvedBy: resolved ? (req.dbUser?.id || null) : null,
          })
          .where(eq(errorLogs.id, errorId))
          .returning()
      );

      if (!updated) {
        return res.status(404).json({ error: 'سجل الخطأ غير موجود' });
      }

      if (req.dbUser) {
        await logActivity(req.dbUser.id, resolved ? 'RESOLVE_ERROR' : 'UNRESOLVE_ERROR', 'ERROR_LOG', String(errorId), {
          message: updated.message?.slice(0, 100),
          resolved,
        });
      }

      return res.json({ success: true, error: updated });
    } catch (error: any) {
      console.error('Error updating error resolution status:', error);
      return res.status(500).json({ error: 'فشل في تحديث حالة الخطأ' });
    }
  });

  /**
   * DELETE /api/admin/errors/:id
   * Delete single error log (Manager or Owner)
   */
  app.delete('/api/admin/errors/:id', requireManager, async (req: AuthRequest, res) => {
    try {
      const errorId = parseInt(req.params.id as string, 10);
      if (isNaN(errorId)) return res.status(400).json({ error: 'معرف خطأ غير صحيح' });

      await withDbRetry(() => db.delete(errorLogs).where(eq(errorLogs.id, errorId)));

      if (req.dbUser) {
        await logActivity(req.dbUser.id, 'DELETE_ERROR', 'ERROR_LOG', String(errorId));
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting error log:', error);
      return res.status(500).json({ error: 'فشل في حذف سجل الخطأ' });
    }
  });

  /**
   * DELETE /api/admin/errors
   * Purge error logs (System Owner only)
   */
  app.delete('/api/admin/errors', requireOwner, async (req: AuthRequest, res) => {
    try {
      const daysOld = parseInt(req.query.daysOld as string, 10);
      const onlyResolved = req.query.onlyResolved === 'true';
      let deletedCount = 0;

      const conditions = [];
      if (!isNaN(daysOld) && daysOld > 0) {
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        conditions.push(lt(errorLogs.createdAt, cutoff));
      }
      if (onlyResolved) {
        conditions.push(eq(errorLogs.resolved, true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const delRes = await withDbRetry(() => db.delete(errorLogs).where(whereClause));
      deletedCount = delRes.rowCount || 0;

      if (req.dbUser) {
        await logActivity(req.dbUser.id, 'PURGE_ERROR_LOGS', 'ERROR_LOG', 'ALL', {
          daysOld: isNaN(daysOld) ? 'ALL' : daysOld,
          onlyResolved,
          deletedCount,
        });
      }

      return res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error('Error purging error logs:', error);
      return res.status(500).json({ error: 'فشل في تفريغ سجل الأخطاء' });
    }
  });

  app.get('/api/admin/users', requirePermission('users_view'), async (req: AuthRequest, res) => {
    try {
      const allUsers = await withDbRetry(() => db.select().from(users).orderBy(desc(users.createdAt)));
      const safeUsers = allUsers.map(toSafeUser);
      return res.json(safeUsers);
    } catch (e) {
      console.error('Admin users error:', e);
      return res.status(500).json({ error: true });
    }
  });

  app.put('/api/admin/users/:id', requirePermission('users_manage'), async (req: AuthRequest, res) => {
    try {
      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const { role, permissions, isActive } = req.body;

      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      const callerIsOwner = isDbUserOwner(req.dbUser);
      const callerIsManager = isDbUserManager(req.dbUser);
      
      const callerHasUsersManage = req.dbUser && checkUserHasPermission(req.dbUser, 'users_manage');
      const callerHasAdminsManage = req.dbUser && checkUserHasPermission(req.dbUser, 'admins_manage');

      if (!callerIsManager && !callerIsOwner && !callerHasUsersManage && !callerHasAdminsManage) {
        return res.status(403).json({ error: 'ليس لديك صلاحية إدارة المستخدمين' });
      }

      const targetIsOwner = isDbUserOwner(targetUser);
      const targetIsManager = isDbUserManager(targetUser) && !targetIsOwner;
      const targetIsAdmin = targetUser.role === 'admin' || targetUser.isAdmin;

      // Rule 1: System Owner account can ONLY be modified by a System Owner
      if (targetIsOwner && !callerIsOwner) {
        return res.status(403).json({ error: 'لا يمكن تعديل حساب مالك النظام إلا من قِبل مالك النظام' });
      }

      // Rule 2: Primary env owner cannot be demoted or deactivated
      const isTargetPrimaryOwner = !!superAdminEmail && targetUser.email?.toLowerCase().trim() === superAdminEmail;
      if (isTargetPrimaryOwner && (role === 'user' || role === 'admin' || role === 'manager' || isActive === false)) {
        return res.status(400).json({ error: 'حساب مالك النظام الأساسي محمي ولا يمكن خفض رتبته أو تعطيله' });
      }

      // Prevent the ONLY System Owner from demoting or deactivating themselves
      if (targetIsOwner && (role === 'user' || role === 'admin' || role === 'manager' || isActive === false)) {
        const ownerCountList = await withDbRetry(() => db.execute(sql`SELECT count(*) as count FROM ${users} WHERE role IN ('owner', 'system_owner', 'superadmin')`));
        const ownerCount = Number(ownerCountList[0]?.count || 0);
        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'لا يمكنك خفض رتبتك أو تعطيل حسابك لأنك المالك الوحيد للنظام' });
        }
      }

      // Rule 3: System Manager can ONLY be modified or demoted by a System Owner
      if (targetIsManager && !callerIsOwner) {
        return res.status(403).json({ error: 'فقط مالك النظام يمكنه تعديل أو خفض رتبة مدير النظام' });
      }

      // Rule 3b: Admin can ONLY be modified by Manager or Owner or Admin with admins_manage
      if (targetIsAdmin && !callerIsOwner && !callerIsManager && !callerHasAdminsManage) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لتعديل حساب مشرف آخر' });
      }

      // Rule 4: Elevating to System Owner requires System Owner caller
      if ((role === 'owner' || role === 'system_owner' || role === 'superadmin') && !callerIsOwner) {
        return res.status(403).json({ error: 'فقط مالك النظام يمكنه تعيين مالك نظام جديد' });
      }

      // Rule 5: Elevating to System Manager requires System Owner caller
      if ((role === 'manager' || role === 'system_manager') && !callerIsOwner) {
        return res.status(403).json({ error: 'فقط مالك النظام يمكنه ترقية مستخدم إلى مدير نظام' });
      }

      // Rule 6: Elevating to Admin requires Manager/Owner or admins_manage
      if (role === 'admin' && !callerIsOwner && !callerIsManager && !callerHasAdminsManage) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لتعيين مشرف جديد' });
      }

      // Determine standardized new role
      let newRole = role || targetUser.role || 'user';
      if (newRole === 'system_owner' || newRole === 'superadmin') newRole = 'owner';
      if (newRole === 'system_manager') newRole = 'manager';

      const newIsAdmin = newRole === 'admin' || newRole === 'manager' || newRole === 'owner';

      // Set permissions based on new dynamic system - we respect what's passed in from the frontend
      // Admin users define their permissions array. Manager/Owner permissions array is irrelevant now because checkUserHasPermission handles them.
      let finalPermissions: string[] = [];
      if (newRole === 'admin') {
        let rawPerms: string[] = [];
        if (Array.isArray(permissions)) {
          rawPerms = permissions;
        } else if (Array.isArray(targetUser.permissions)) {
          rawPerms = targetUser.permissions;
        }

        // Normalize old permissions to new ones
        const normalizedPerms = new Set(rawPerms);
        if (normalizedPerms.has('news_manage')) {
          normalizedPerms.add('news_add').add('news_edit').add('news_delete').add('news_publish');
        }
        if (normalizedPerms.has('matches_manage')) {
          normalizedPerms.add('matches_view').add('matches_edit').add('matches_sync');
        }
        if (normalizedPerms.has('contests_manage')) {
          normalizedPerms.add('predictions_manage');
        }
        if (normalizedPerms.has('admin_manage') || normalizedPerms.has('admins_manage')) {
          normalizedPerms.add('admins_view').add('admins_add').add('admins_edit').add('admins_remove').add('admins_permissions_manage');
        }
        if (normalizedPerms.has('users_view')) {
          // If they just had view, they keep view.
        }

        finalPermissions = Array.from(normalizedPerms);
      }

      await withDbRetry(() =>
        db
          .update(users)
          .set({
            role: newRole,
            isAdmin: newIsAdmin,
            permissions: finalPermissions,
            isActive: isActive !== undefined ? isActive : targetUser.isActive,
          })
          .where(eq(users.id, targetUserId))
      );

      // Invalidate active sessions if user is deactivated or permissions/role modified
      if (isActive === false || role !== undefined || permissions !== undefined) {
        if (targetUser.uid) revokeAllUserSessions(targetUser.uid);
        if (targetUser.email) revokeAllUserSessions(targetUser.email);
      }

      await logActivity(req.dbUser.id, 'UPDATE', 'USER', String(targetUserId), {
        role: newRole,
        permissions: finalPermissions,
        isActive,
      });

      return res.json({ success: true, message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' });
    } catch (e) {
      console.error('Admin user update error:', e);
      return res.status(500).json({ error: true });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: 'غير مصرح' });

      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      const callerIsOwner = isDbUserOwner(req.dbUser);
      const callerIsManager = isDbUserManager(req.dbUser);
      
      const callerHasUsersManage = checkUserHasPermission(req.dbUser, 'users_manage');
      const callerHasAdminsManage = checkUserHasPermission(req.dbUser, 'admins_manage');

      if (!callerIsManager && !callerIsOwner && !callerHasUsersManage && !callerHasAdminsManage) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لحذف المستخدمين' });
      }

      const isTargetPrimaryOwner = !!superAdminEmail && targetUser.email?.toLowerCase().trim() === superAdminEmail;
      if (isTargetPrimaryOwner) {
        return res.status(400).json({ error: 'حساب مالك النظام الأساسي محمي ولا يمكن حذفه' });
      }

      const targetIsOwner = isDbUserOwner(targetUser);
      const targetIsManager = isDbUserManager(targetUser) && !targetIsOwner;
      const targetIsAdmin = targetUser.role === 'admin' || targetUser.isAdmin;

      if (targetIsOwner) {
        if (!callerIsOwner) {
          return res.status(403).json({ error: 'لا يمكن حذف حساب مالك النظام إلا من قِبل مالك النظام' });
        }
        const ownerCountList = await withDbRetry(() => db.execute(sql`SELECT count(*) as count FROM ${users} WHERE role IN ('owner', 'system_owner', 'superadmin')`));
        const ownerCount = Number(ownerCountList[0]?.count || 0);
        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'لا يمكنك حذف هذا الحساب لأنه المالك الوحيد المتبقي للنظام' });
        }
      }

      if (targetIsManager && !callerIsOwner) {
        return res.status(403).json({ error: 'فقط مالك النظام يمكنه حذف مدير نظام' });
      }

      if (targetIsAdmin && !callerIsOwner && !callerIsManager && !callerHasAdminsManage) {
        return res.status(403).json({ error: 'ليس لديك صلاحية لحذف حساب مشرف آخر' });
      }

      // Invalidate all active sessions for target user
      if (targetUser.uid) revokeAllUserSessions(targetUser.uid);
      if (targetUser.email) revokeAllUserSessions(targetUser.email);

      await permanentlyDeleteUserRecord(targetUser);
      await logActivity(req.dbUser.id, 'DELETE', 'USER', String(targetUserId), { email: targetUser.email, name: targetUser.name });
      return res.json({ success: true, message: 'تم حذف المستخدم نهائياً بنجاح' });
    } catch (e) {
      console.error('Admin user delete error:', e);
      return res.status(500).json({ error: true });
    }
  });

  // Start Cron Jobs (Background sync for matches & standings)
  if (process.env.NODE_ENV !== 'test') {
    startCronJobs();
  }

  // Vite middleware for development & SPA serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  // Global API error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    const authReq = req as AuthRequest;
    const statusCode = err.status || err.statusCode || 500;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';

    logErrorToDb({
      source: 'api',
      severity: statusCode >= 500 ? 'fatal' : 'error',
      message: err.message || 'Internal Server Error',
      stack: err.stack,
      endpoint: `${req.method} ${req.originalUrl || req.url}`,
      statusCode,
      userId: authReq.dbUser?.id,
      userEmail: authReq.dbUser?.email,
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] as string,
    }).catch(() => {});

    if (res.headersSent) {
      return next(err);
    }
    return res.status(statusCode).json({ error: true, message: 'حدث خطأ في الخادم' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KoraNews Server] Running smoothly on http://0.0.0.0:${PORT}`);
    seedSaudiAndNationalTeams().catch((err) => console.error('Error seeding Saudi & National teams:', err));
    runSystemCompatibilityAudit().catch((err) => console.error('Error running system compatibility audit:', err));
  });
}

startServer();

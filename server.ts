import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { db, withDbRetry, initializeDatabaseSchema } from './src/db/index.ts';
import { users, news, categories, comments, emailVerifications, activityLogs, contestParticipants, predictionMatches } from './src/db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import {
  requireAuth,
  requirePermission,
  requireSuperAdmin,
  optionalAuth,
  AuthRequest,
  createServerSessionToken,
  verifyServerSessionToken,
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
        entityId: entityId || null,
        details: details || null,
      })
    );
  } catch (e) {
    // Non-blocking log failure
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
  const PORT = 3000;

  // Trust first proxy (Cloud Run / Nginx reverse proxy)
  app.set('trust proxy', 1);

  // Initialize DB Schema & Run Automatic Migrations
  try {
    await initializeDatabaseSchema();
    console.log('[Server Startup] Database schema initialized successfully.');
  } catch (dbErr: any) {
    console.warn('[Server Startup] Database initialization warning:', dbErr?.message || dbErr);
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

        // Always allow localhost, Cloud Run (.run.app), and AI Studio domains
        if (
          originLower.startsWith('http://localhost:') ||
          originLower.startsWith('http://127.0.0.1:') ||
          originLower.endsWith('.run.app') ||
          originLower.endsWith('.google.internal') ||
          originLower.endsWith('.aistudio.google.com')
        ) {
          return callback(null, true);
        }

        // If specific ALLOWED_ORIGINS are configured, check them
        if (configuredAllowedOrigins.length > 0) {
          if (configuredAllowedOrigins.includes(originLower)) {
            return callback(null, true);
          }
          console.warn(`[CORS] Blocked unconfigured origin: ${origin}`);
          return callback(new Error(`CORS Error: Origin ${origin} is not allowed`));
        }

        // Default: allow origin in production/development if not explicitly restricted
        return callback(null, true);
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
   * POST /api/auth/login
   * Authenticates a user securely via email & password.
   * Uses crypto.scrypt password verification and issues cryptographically signed session tokens.
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
          return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
        }

        const superAdminPermissions = ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage'];
        let dbUser = await getOrCreateUser(
          `superadmin_${cleanEmail}`,
          cleanEmail,
          'مدير النظام',
          undefined,
          superAdminPass
        );

        // Ensure superadmin role & permissions
        await db.update(users)
          .set({ role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions })
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
          user: toSafeUser({ ...dbUser, role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions }),
        });
      }

      // 2. Standard User Authentication via Database
      const userRecords = await withDbRetry(() =>
        db.select().from(users).where(eq(users.email, cleanEmail)).limit(1)
      );

      if (userRecords.length === 0) {
        return res.status(404).json({ error: 'الحساب غير موجود. يمكنك إنشاء حساب جديد.' });
      }

      const dbUser = userRecords[0];

      if (!dbUser.isActive) {
        return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
      }

      // Check password using scrypt (or legacy plaintext with auto-migration)
      const storedHashOrPlain = dbUser.passwordHash || dbUser.password;
      if (!storedHashOrPlain) {
        return res.status(401).json({ error: 'يرجى تسجيل الدخول بواسطة جوجل أو إعادة تعيين كلمة المرور' });
      }

      const { isValid, needsMigration } = await verifyPassword(password, storedHashOrPlain);

      if (!isValid) {
        return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
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
      clearVerificationSession(cleanEmail);

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
   */
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const decodedToken = req.user!;
      const body = req.body || {};
      const candidateName = (typeof body.name === 'string' && body.name.trim()) ? body.name.trim() : (decodedToken.name || 'مستخدم');
      const candidatePicture = (typeof body.picture === 'string' && body.picture.trim()) ? body.picture.trim() : decodedToken.picture;

      const user = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        candidateName,
        candidatePicture
      );

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

    // 3. Reassign news to superadmin or delete
    const superAdmins = await withDbRetry(() =>
      db.select().from(users).where(eq(users.role, 'superadmin')).limit(1)
    );

    if (superAdmins.length > 0 && superAdmins[0].id !== user.id) {
      await withDbRetry(() => db.update(news).set({ authorId: superAdmins[0].id }).where(eq(news.authorId, user.id)));
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

  app.post('/api/categories', requirePermission('news_add'), async (req: AuthRequest, res) => {
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
              if (u.role === 'admin' || u.role === 'superadmin' || u.id === article.authorId) {
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

    const hasCronAuth = !!cronSecret && reqSecret === cronSecret;
    const isUserAdmin = req.dbUser && (req.dbUser.role === 'admin' || req.dbUser.role === 'superadmin');

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
  app.get('/api/admin/predictions/active-contest', requirePermission('matches_manage'), async (_req, res) => {
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
  app.get('/api/admin/predictions/contests', requirePermission('matches_manage'), async (_req, res) => {
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
  app.post('/api/admin/predictions/contests', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.post('/api/admin/predictions/contests/:id/complete', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.delete('/api/admin/predictions/contests/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/contest/settings', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.get('/api/admin/predictions/participants', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/participants/:id/status', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.delete('/api/admin/predictions/participants/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.get('/api/admin/predictions/stats', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.get('/api/admin/predictions/available-matches', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.get('/api/admin/predictions/teams-and-leagues', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.get('/api/admin/predictions', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
   * Add a system match to the prediction contest list with custom points per match.
   */
  app.post('/api/admin/predictions', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
    try {
      const { matchId, pointsPerMatch, contestId } = req.body;
      if (!matchId || typeof matchId !== 'string' || !matchId.trim()) {
        return res.status(400).json({ error: 'معرف المباراة مطلوب' });
      }

      let pts = 2;
      if (pointsPerMatch !== undefined && pointsPerMatch !== null) {
        const ptsCheck = validatePointsPerMatch(pointsPerMatch, 'نقاط المباراة');
        if (!ptsCheck.valid || ptsCheck.value === undefined) {
          return res.status(400).json({ error: ptsCheck.error || 'نقاط المباراة غير صحيحة' });
        }
        pts = ptsCheck.value;
      }

      const parsedContestId = contestId ? parseInt(String(contestId), 10) : undefined;
      const result = await addMatchToPredictions(
        matchId.trim(),
        pts,
        parsedContestId && !isNaN(parsedContestId) ? parsedContestId : undefined
      );
      await logActivity(req.dbUser.id, 'CREATE', 'PREDICTION_MATCH', matchId, {
        matchId,
        pointsPerMatch: pts,
        contestId: parsedContestId,
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
  app.post('/api/admin/predictions/custom-match', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/:id/points', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.post('/api/admin/predictions/:id/confirm-result', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/:id/result', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/:id/toggle', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.delete('/api/admin/predictions/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.post('/api/admin/predictions/leagues', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.post('/api/admin/predictions/teams', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.post('/api/admin/predictions/user-prediction', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.put('/api/admin/predictions/user-prediction/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
  app.delete('/api/admin/predictions/user-prediction/:id', requirePermission('matches_manage'), async (req: AuthRequest, res) => {
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
        const adminsCount = await db.select({ count: sql`count(*)` }).from(users).where(sql`role IN ('admin', 'superadmin')`);

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

  app.get('/api/admin/users', requirePermission('admin_manage'), async (req: AuthRequest, res) => {
    try {
      const allUsers = await withDbRetry(() => db.select().from(users).orderBy(desc(users.createdAt)));
      const safeUsers = allUsers.map(toSafeUser);
      return res.json(safeUsers);
    } catch (e) {
      console.error('Admin users error:', e);
      return res.status(500).json({ error: true });
    }
  });

  app.put('/api/admin/users/:id', requirePermission('admin_manage'), async (req: AuthRequest, res) => {
    try {
      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const { role, permissions, isActive } = req.body;

      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      const isTargetSuperAdmin = targetUser.role === 'superadmin' || (!!superAdminEmail && targetUser.email?.toLowerCase().trim() === superAdminEmail);

      // Only superadmin can modify a superadmin or elevate anyone to superadmin
      const isRequesterSuperAdmin = req.dbUser.role === 'superadmin' || (!!superAdminEmail && req.dbUser.email?.toLowerCase().trim() === superAdminEmail);

      if (isTargetSuperAdmin && !isRequesterSuperAdmin) {
        return res.status(403).json({ error: 'لا يمكن تعديل حساب المدير العام الرئيسي إلا من خلاله' });
      }

      if (role === 'superadmin' && !isRequesterSuperAdmin) {
        return res.status(403).json({ error: 'فقط المدير العام يمكنه تعيين مدراء عامين' });
      }

      const newRole = role || targetUser.role;
      const newIsAdmin = newRole === 'admin' || newRole === 'superadmin';

      await withDbRetry(() =>
        db
          .update(users)
          .set({
            role: newRole,
            isAdmin: newIsAdmin,
            permissions: permissions || targetUser.permissions,
            isActive: isActive !== undefined ? isActive : targetUser.isActive,
          })
          .where(eq(users.id, targetUserId))
      );

      await logActivity(req.dbUser.id, 'UPDATE', 'USER', String(targetUserId), { role: newRole, permissions, isActive });
      return res.json({ success: true });
    } catch (e) {
      console.error('Admin user update error:', e);
      return res.status(500).json({ error: true });
    }
  });

  app.delete('/api/admin/users/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const targetUserId = parseInt(req.params.id as string, 10);
      if (isNaN(targetUserId)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];

      const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
      if (targetUser.role === 'superadmin' || (!!superAdminEmail && targetUser.email?.toLowerCase().trim() === superAdminEmail)) {
        return res.status(400).json({ error: 'حساب مالك النظام والمدير العام الرئيسي محمي بالكامل ولا يمكن حذفه' });
      }

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
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({ error: true, message: 'حدث خطأ في الخادم' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KoraNews Server] Running smoothly on http://0.0.0.0:${PORT}`);
    seedSaudiAndNationalTeams().catch((err) => console.error('Error seeding Saudi & National teams:', err));
  });
}

startServer();

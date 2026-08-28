import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { db, withDbRetry, initializeDatabaseSchema } from './src/db/index.ts';
import { users, news, categories, comments, emailVerifications, activityLogs } from './src/db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import {
  requireAuth,
  requirePermission,
  requireSuperAdmin,
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
  const app = express();
  const PORT = 3000;

  // Initialize DB Schema & Run Automatic Migrations (e.g. Scrypt password migration)
  await initializeDatabaseSchema();

  // Security Headers via Helmet (configured to allow iframe & images)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Allows embedding in AI Studio live preview
    })
  );

  // Secure CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, curl) or any origin in dev/preview
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
      const user = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || 'مستخدم',
        decodedToken.picture
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

      const { title, content, image, isFeatured, isBreaking, status } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'عنوان ومحتوى الخبر مطلوبان' });
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
            categoryId: null,
            authorId: user.id,
            isFeatured: !!isFeatured,
            isBreaking: !!isBreaking,
            status: status === 'draft' ? 'draft' : 'published',
          })
          .returning()
      );

      await logActivity(user.id, 'CREATE', 'NEWS', String(result[0].id), { title: cleanTitle });
      return res.status(201).json(result[0]);
    } catch (error: any) {
      console.error('Failed to create news:', error);
      return res.status(500).json({ error: 'فشل في إضافة الخبر' });
    }
  });

  app.put('/api/news/:id', requirePermission('news_edit'), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'معرف غير صحيح' });

      const { title, content, image, isFeatured, isBreaking, status } = req.body;
      const cleanTitle = title ? escapeHtml(String(title).trim()) : undefined;
      const cleanContent = content ? sanitizeContent(String(content).trim()) : undefined;
      const cleanImage = image !== undefined ? (image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null) : undefined;

      const result = await withDbRetry(() =>
        db
          .update(news)
          .set({
            ...(cleanTitle ? { title: cleanTitle } : {}),
            ...(cleanContent ? { content: cleanContent } : {}),
            ...(cleanImage !== undefined ? { image: cleanImage } : {}),
            isFeatured: !!isFeatured,
            isBreaking: !!isBreaking,
            status: status === 'draft' ? 'draft' : 'published',
            updatedAt: new Date(),
          })
          .where(eq(news.id, id))
          .returning()
      );

      if (result.length === 0) return res.status(404).json({ error: 'الخبر غير موجود' });
      await logActivity(req.dbUser.id, 'UPDATE', 'NEWS', String(id), { title: result[0].title });
      return res.json(result[0]);
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
      const { status, date, leagueId, season, sortBy } = req.query;
      const targetSeason = (season as string) || '2026';
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

  app.post('/api/sync-matches', matchSyncLimiter, async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const reqSecret = req.headers['x-cron-secret'];

    const hasCronAuth = !!cronSecret && reqSecret === cronSecret;
    if (!hasCronAuth) {
      // Require Admin session
      let isAdmin = false;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1]?.trim();
        const decoded = verifyServerSessionToken(token);
        if (decoded) {
          const userRec = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);
          if (userRec.length > 0 && (userRec[0].role === 'admin' || userRec[0].role === 'superadmin')) {
            isAdmin = true;
          }
        }
      }
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin authorization required for match synchronization' });
      }
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
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
  });
}

startServer();

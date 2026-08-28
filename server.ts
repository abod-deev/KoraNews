import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { requireAuth, requirePermission, AuthRequest, createServerSessionToken } from "./src/middleware/auth.ts";
import { adminAuth } from "./src/lib/firebase-admin.ts";
import { logActivity } from "./src/lib/logger.ts";
import { db, withDbRetry } from "./src/db/index.ts";
import { news, categories, comments, users, leagues, teams, emailVerifications } from "./src/db/schema.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { eq, desc, and, sql } from "drizzle-orm";
import { matches, activityLogs } from "./src/db/schema.ts";
import { startCronJobs } from "./src/services/cronService.ts";
import { getStoredMatches, getStoredStandings, syncMatchesCycle, LEAGUE_AR_NAMES, translateTeamName } from "./src/services/footballService.ts";
import {
  sendVerificationRequest,
  verifyEmailCode,
  resendVerificationRequest,
  clearVerificationSession,
} from "./server/services/gmailVerification.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for Cloud Run & Nginx reverse proxies
  app.set("trust proxy", 1);

  // Security Middlewares
  app.use(compression()); // Compress responses for better Core Web Vitals
  
  // Rate limiting ONLY for /api/ routes to prevent blocking Vite SPA asset loading in browsers
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: "Too many requests from this IP, please try again after 15 minutes" }
  });
  app.use("/api/", limiter);

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));


  // === Authentication Routes ===
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const isSuperAdmin = cleanEmail === 'abod46071@gmail.com';

      if (isSuperAdmin) {
        if (password !== 'abod1234') {
          return res.status(400).json({ error: "كلمة المرور غير صحيحة لحساب المسؤول" });
        }
      }

      let uid = isSuperAdmin ? 'superadmin_abod46071' : '';
      let customToken = '';
      let displayName = isSuperAdmin ? 'عبدالله الراعي' : cleanEmail.split('@')[0];

      // Try Firebase Admin if possible
      try {
        let userRecord: any;
        try {
          userRecord = await adminAuth.getUserByEmail(cleanEmail);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            if (isSuperAdmin) {
              userRecord = await adminAuth.createUser({
                email: cleanEmail,
                password: 'abod1234',
                displayName: 'عبدالله الراعي',
                emailVerified: true
              });
            }
          }
        }

        if (userRecord) {
          uid = userRecord.uid;
          displayName = userRecord.displayName || displayName;
          if (isSuperAdmin) {
            try {
              await adminAuth.updateUser(userRecord.uid, { password: 'abod1234', emailVerified: true });
            } catch (e) {
              // ignore
            }
          }
          try {
            customToken = await adminAuth.createCustomToken(userRecord.uid);
          } catch (e) {
            // ignore
          }
        }
      } catch (fbErr: any) {
        // Firebase Auth API may be unconfigured or disabled; system operates smoothly on DB fallback
        console.log("[Auth] Operating on DB auth engine (Firebase Auth API bypassed)");
      }

      // If not superadmin, check DB user and verify password
      if (!isSuperAdmin) {
        const existingInDb = await withDbRetry(() => db.select().from(users).where(eq(users.email, cleanEmail)));
        if (existingInDb.length === 0) {
          return res.status(404).json({ error: "الحساب غير موجود. يمكنك إنشاء حساب جديد." });
        }
        const dbRecord = existingInDb[0];
        if (dbRecord.password && dbRecord.password !== password) {
          return res.status(400).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }
        uid = dbRecord.uid;
        displayName = dbRecord.name || displayName;
      }

      const dbUser = await getOrCreateUser(
        uid,
        cleanEmail,
        displayName,
        undefined,
        password
      );

      if (!dbUser.isActive) {
        return res.status(403).json({ error: "الحساب معطل" });
      }

      const sessionToken = createServerSessionToken({
        uid: dbUser.uid,
        email: cleanEmail,
        name: dbUser.name
      });

      return res.json({
        customToken,
        sessionToken,
        user: {
          uid: dbUser.uid,
          email: cleanEmail,
          displayName: dbUser.name,
          name: dbUser.name,
          avatar: dbUser.avatar,
          role: dbUser.role,
          isAdmin: dbUser.isAdmin
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      const isDbErr = String(error?.message || error).includes('Failed query') || String(error?.message || error).includes('Connection terminated');
      return res.status(500).json({ error: isDbErr ? "تعذر الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى." : (error.message || "حدث خطأ أثناء تسجيل الدخول") });
    }
  });

  // ========================================================
  // === Dedicated Email Verification API (Gmail SMTP Engine) ===
  // ========================================================

  /**
   * POST /api/verification/send
   * Generates a 6-digit code, hashes it, and sends via Gmail SMTP (smtp.gmail.com:465)
   */
  app.post("/api/verification/send", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني" });
      }

      const result = await sendVerificationRequest(email);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      });
    } catch (error: any) {
      console.error("[API Verification Send Error]:", error?.message || error);
      return res.status(500).json({ success: false, message: "حدث خطأ أثناء إرسال رمز التحقق" });
    }
  });

  /**
   * POST /api/verification/verify
   * Validates the 6-digit code against the stored hash
   */
  app.post("/api/verification/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "يرجى إدخال البريد الإلكتروني ورمز التحقق",
        });
      }

      const result = await verifyEmailCode(String(email), String(code));
      return res.json({
        success: result.success,
        verified: result.verified,
        message: result.message,
      });
    } catch (error: any) {
      console.error("[API Verification Verify Error]:", error?.message || error);
      return res.status(500).json({
        success: false,
        verified: false,
        message: "حدث خطأ أثناء التحقق من الرمز",
      });
    }
  });

  /**
   * POST /api/verification/resend
   * Generates a fresh 6-digit code, revokes the previous one, and sends via Gmail SMTP
   */
  app.post("/api/verification/resend", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني" });
      }

      const result = await resendVerificationRequest(email);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
      });
    } catch (error: any) {
      console.error("[API Verification Resend Error]:", error?.message || error);
      return res.status(500).json({ success: false, message: "حدث خطأ أثناء إعادة إرسال رمز التحقق" });
    }
  });

  // ========================================================
  // === Auth Sign-Up Flow Connected to Gmail Verification Service ===
  // ========================================================

  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
      }

      const cleanEmail = email.trim().toLowerCase();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "يرجى إدخال بريد إلكتروني صحيح يحتوي على @" });
      }

      if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تتكون من 8 إلى 16 حرفاً" });
      }

      const displayName = name?.trim() || cleanEmail.split('@')[0];

      // Check if user exists in DB first
      const existingInDb = await withDbRetry(() => db.select().from(users).where(eq(users.email, cleanEmail)));
      if (existingInDb.length > 0) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة." });
      }

      // Check Firebase Admin
      try {
        let existingUser: any;
        try {
          existingUser = await adminAuth.getUserByEmail(cleanEmail);
        } catch (e) {
          // expect not found
        }
        if (existingUser) {
          return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة." });
        }
      } catch (e) {
        // ignore
      }

      // Send verification code using SendPulse Verification Service
      const result = await sendVerificationRequest(cleanEmail, displayName, password);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.",
        email: cleanEmail,
      });
    } catch (error: any) {
      console.error("Send verification error:", error);
      return res.status(500).json({ error: error.message || "حدث خطأ أثناء إرسال رمز التحقق" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني ورمز التحقق" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.toString().trim();

      const verifyResult = await verifyEmailCode(cleanEmail, cleanCode);
      if (!verifyResult.verified) {
        return res.status(400).json({ error: verifyResult.message });
      }

      const { payload } = verifyResult;
      const name = payload?.name || cleanEmail.split('@')[0];
      const password = payload?.password || '';

      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let customToken = '';

      try {
        const userRecord = await adminAuth.createUser({
          email: cleanEmail,
          password: password || undefined,
          displayName: name,
          emailVerified: true,
        });
        uid = userRecord.uid;
        try {
          customToken = await adminAuth.createCustomToken(userRecord.uid);
        } catch (e) {
          // ignore
        }
      } catch (fbErr: any) {
        // If user already existed in Firebase Auth (e.g. from previously deleted local account), clean it up and recreate
        try {
          const oldFbUser = await adminAuth.getUserByEmail(cleanEmail);
          if (oldFbUser) {
            await adminAuth.deleteUser(oldFbUser.uid);
            const freshUserRecord = await adminAuth.createUser({
              email: cleanEmail,
              password: password || undefined,
              displayName: name,
              emailVerified: true,
            });
            uid = freshUserRecord.uid;
            try {
              customToken = await adminAuth.createCustomToken(freshUserRecord.uid);
            } catch (e) {}
          }
        } catch (innerErr) {
          // DB Auth engine fallback
        }
      }

      const dbUser = await getOrCreateUser(
        uid,
        cleanEmail,
        name,
        undefined,
        password
      );

      // Clear the temporary verification session
      clearVerificationSession(cleanEmail);

      const sessionToken = createServerSessionToken({
        uid: dbUser.uid,
        email: cleanEmail,
        name: dbUser.name,
      });

      return res.json({
        customToken,
        sessionToken,
        user: {
          uid: dbUser.uid,
          email: cleanEmail,
          displayName: dbUser.name,
          name: dbUser.name,
          avatar: dbUser.avatar,
          role: dbUser.role,
          isAdmin: dbUser.isAdmin,
        },
      });
    } catch (error: any) {
      console.error("Verify code error:", error);
      return res.status(500).json({ error: error.message || "حدث خطأ أثناء التأكد من رمز التحقق" });
    }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const result = await resendVerificationRequest(cleanEmail);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({
        success: true,
        message: "تم إعادة إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني.",
      });
    } catch (error: any) {
      console.error("Resend code error:", error);
      return res.status(500).json({ error: error.message || "حدث خطأ أثناء إعادة إرسال الرمز" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
      }
      if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تتكون من 8 إلى 16 حرفاً" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const displayName = name || cleanEmail.split('@')[0];

      // Check if user exists in DB first
      const existingInDb = await withDbRetry(() => db.select().from(users).where(eq(users.email, cleanEmail)));
      if (existingInDb.length > 0) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة." });
      }

      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let customToken = '';

      // Try Firebase Admin
      try {
        let existingUser: any;
        try {
          existingUser = await adminAuth.getUserByEmail(cleanEmail);
        } catch (e) {
          // expect not found
        }

        if (existingUser) {
          return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة." });
        }

        const userRecord = await adminAuth.createUser({
          email: cleanEmail,
          password: password,
          displayName: displayName,
          emailVerified: true
        });

        uid = userRecord.uid;
        try {
          customToken = await adminAuth.createCustomToken(userRecord.uid);
        } catch (e) {
          // ignore
        }
      } catch (fbErr: any) {
        // Fallback to database user creation
        console.log("[Auth] User account created via DB auth engine");
      }

      const dbUser = await getOrCreateUser(
        uid,
        cleanEmail,
        displayName,
        undefined,
        password
      );

      const sessionToken = createServerSessionToken({
        uid: dbUser.uid,
        email: cleanEmail,
        name: dbUser.name
      });

      return res.json({
        customToken,
        sessionToken,
        user: {
          uid: dbUser.uid,
          email: cleanEmail,
          displayName: dbUser.name,
          name: dbUser.name,
          avatar: dbUser.avatar,
          role: dbUser.role,
          isAdmin: dbUser.isAdmin
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      const isDbErr = String(error?.message || error).includes('Failed query') || String(error?.message || error).includes('Connection terminated');
      return res.status(500).json({ error: isDbErr ? "تعذر الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى." : (error.message || "حدث خطأ أثناء إنشاء الحساب") });
    }
  });

  // === Authentication Sync ===
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const decodedToken = req.user!;
      const user = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || "",
        decodedToken.name || "Unknown User",
        decodedToken.picture
      );
      const sessionToken = createServerSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.name
      });
      res.json({
        sessionToken,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          displayName: user.name,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isAdmin: user.isAdmin,
          isActive: user.isActive,
          permissions: user.permissions
        }
      });
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // === User Profile & Account Management ===
  app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      const newsCount = await withDbRetry(() => db.select({ count: sql`count(*)` }).from(news).where(eq(news.authorId, user.id)));
      const commentsCount = await withDbRetry(() => db.select({ count: sql`count(*)` }).from(comments).where(eq(comments.userId, user.id)));

      res.json({
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        newsCount: Number(newsCount[0]?.count || 0),
        commentsCount: Number(commentsCount[0]?.count || 0)
      });
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الملف الشخصي" });
    }
  });

  app.put("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      const { name, avatar } = req.body;
      const cleanName = (typeof name === 'string' && name.trim() !== '') ? name.trim() : user.name;
      const cleanAvatar = (avatar !== undefined) ? (avatar && typeof avatar === 'string' && avatar.trim() !== '' ? avatar.trim() : null) : user.avatar;

      const updated = await withDbRetry(() => db.update(users).set({
        name: cleanName,
        avatar: cleanAvatar
      }).where(eq(users.id, user.id)).returning());

      const updatedUser = updated[0];

      // Try updating in Firebase Auth as well
      try {
        await adminAuth.updateUser(user.uid, {
          displayName: cleanName,
          photoURL: cleanAvatar || undefined
        });
      } catch (e) {
        // ignore
      }

      const sessionToken = createServerSessionToken({
        uid: updatedUser.uid,
        email: updatedUser.email,
        name: updatedUser.name
      });

      res.json({
        sessionToken,
        user: {
          id: updatedUser.id,
          uid: updatedUser.uid,
          email: updatedUser.email,
          displayName: updatedUser.name,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          role: updatedUser.role,
          isAdmin: updatedUser.isAdmin,
          isActive: updatedUser.isActive,
          permissions: updatedUser.permissions
        }
      });
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "فشل في تحديث بيانات الملف الشخصي" });
    }
  });

  /**
   * Permanently deletes a user from PostgreSQL, associated comments, activity logs,
   * verification tokens, and Firebase Authentication.
   */
  async function permanentlyDeleteUserRecord(user: { id: number; email?: string | null; uid?: string | null; role?: string | null }) {
    const cleanEmail = (user.email || '').trim().toLowerCase();

    // 1. Delete comments made by user
    await withDbRetry(() => db.delete(comments).where(eq(comments.userId, user.id)));

    // 2. Delete activity logs
    await withDbRetry(() => db.delete(activityLogs).where(eq(activityLogs.userId, user.id)));

    // 3. Reassign news to superadmin or delete
    const superAdmins = await withDbRetry(() => db.select().from(users).where(eq(users.role, 'superadmin')).limit(1));
    if (superAdmins.length > 0 && superAdmins[0].id !== user.id) {
      await withDbRetry(() => db.update(news).set({ authorId: superAdmins[0].id }).where(eq(news.authorId, user.id)));
    } else {
      await withDbRetry(() => db.delete(news).where(eq(news.authorId, user.id)));
    }

    // 4. Delete verification records and sessions for this email
    if (cleanEmail) {
      await withDbRetry(() => db.delete(emailVerifications).where(eq(emailVerifications.email, cleanEmail)));
      clearVerificationSession(cleanEmail);
    }

    // 5. Delete user record from PostgreSQL
    await withDbRetry(() => db.delete(users).where(eq(users.id, user.id)));
    if (cleanEmail) {
      await withDbRetry(() => db.delete(users).where(eq(users.email, cleanEmail)));
    }
    if (user.uid) {
      await withDbRetry(() => db.delete(users).where(eq(users.uid, user.uid!)));
    }

    // 6. Delete from Firebase Auth if exists (by UID and by Email)
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
        if (fbUser && fbUser.uid) {
          await adminAuth.deleteUser(fbUser.uid);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  app.delete("/api/user/account", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (user.email === 'abod46071@gmail.com' || user.role === 'superadmin') {
        return res.status(400).json({ error: "حساب مالك النظام الرئيسي والمدير العام محمي بالكامل ولا يمكن حذفه" });
      }

      await permanentlyDeleteUserRecord(user);

      res.json({ success: true, message: "تم حذف الحساب نهائياً من قاعدة البيانات بنجاح" });
    } catch (error: any) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: error.message || "فشل في حذف الحساب" });
    }
  });

  // === Categories ===
  app.get("/api/categories", async (req, res) => {
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
            { name: 'أخبار عاجلة', slug: 'breaking-news' }
          ];
          await db.insert(categories).values(defaultCats);
          cats = await db.select().from(categories).orderBy(categories.name);
        }
        return cats;
      });
      res.json(allCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requirePermission("news_add"), async (req: AuthRequest, res) => {
    try {
      const { name, slug } = req.body;
      const result = await withDbRetry(() => db.insert(categories).values({ name, slug }).returning());
      res.status(201).json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // === News ===
  app.get("/api/news", async (req, res) => {
    try {
      const formattedNews = await withDbRetry(async () => {
        const rows = await db.select({
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
          categorySlug: categories.slug
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
          category: item.categoryName ? { id: item.categoryId, name: item.categoryName, slug: item.categorySlug } : null
        }));
      });

      res.json(formattedNews);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid news ID" });

      const article = await withDbRetry(async () => {
        const rows = await db.select({
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
          categorySlug: categories.slug
        })
        .from(news)
        .leftJoin(users, eq(news.authorId, users.id))
        .leftJoin(categories, eq(news.categoryId, categories.id))
        .where(eq(news.id, id))
        .limit(1);

        if (rows.length === 0) return null;
        const row = rows[0];

        const articleComments = await db.select({
          id: comments.id,
          content: comments.content,
          newsId: comments.newsId,
          userId: comments.userId,
          createdAt: comments.createdAt,
          userName: users.name,
          userAvatar: users.avatar
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
          comments: articleComments.map(c => ({
            id: c.id,
            content: c.content,
            newsId: c.newsId,
            userId: c.userId,
            createdAt: c.createdAt,
            user: c.userName ? { id: c.userId, name: c.userName, avatar: c.userAvatar } : null
          }))
        };
      });

      if (!article) return res.status(404).json({ error: "News not found" });

      // Increment views count asynchronously
      withDbRetry(() => db.update(news).set({ views: sql`${news.views} + 1` }).where(eq(news.id, id))).catch(console.error);

      return res.json(article);
    } catch (error) {
      console.error("Failed to fetch news item:", error);
      res.status(500).json({ error: "Failed to fetch news item" });
    }
  });

  app.post("/api/news", requirePermission("news_add"), async (req: AuthRequest, res) => {
    try {
      const user = await withDbRetry(() => db.select().from(users).where(eq(users.uid, req.user!.uid)));
      if (user.length === 0) return res.status(403).json({ error: "User not synced" });

      const { title, content, image, isFeatured, isBreaking, status } = req.body;
      const cleanImage = image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null;

      const result = await withDbRetry(() => db.insert(news)
        .values({
          title,
          excerpt: null,
          content,
          image: cleanImage,
          categoryId: null,
          authorId: user[0].id,
          isFeatured: !!isFeatured,
          isBreaking: !!isBreaking,
          status: status || 'published'
        })
        .returning()
      );
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Failed to create news:", error);
      res.status(500).json({ error: "Failed to create news" });
    }
  });

  app.put("/api/news/:id", requirePermission("news_edit"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { title, content, image, isFeatured, isBreaking, status } = req.body;
      const cleanImage = image && typeof image === 'string' && image.trim() !== '' ? image.trim() : null;

      const result = await withDbRetry(() => db.update(news)
        .set({
          title,
          excerpt: null,
          content,
          image: cleanImage,
          categoryId: null,
          isFeatured: !!isFeatured,
          isBreaking: !!isBreaking,
          status: status || 'published'
        })
        .where(eq(news.id, id))
        .returning()
      );
      if (result.length === 0) return res.status(404).json({ error: "News not found" });
      res.json(result[0]);
    } catch (error) {
      console.error("Failed to update news:", error);
      res.status(500).json({ error: "Failed to update news" });
    }
  });

  app.delete("/api/news/:id", requirePermission("news_delete"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await withDbRetry(() => db.delete(news).where(eq(news.id, id)));
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete news:", error);
      res.status(500).json({ error: "Failed to delete news" });
    }
  });

  // === Comments ===
  app.get("/api/news/:id/comments", async (req, res) => {
    try {
      const newsId = parseInt(req.params.id as string);
      const articleComments = await withDbRetry(() => db.select().from(comments).where(eq(comments.newsId, newsId)).orderBy(desc(comments.createdAt)));
      res.json(articleComments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/news/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const newsId = parseInt(req.params.id as string);
      const user = await withDbRetry(() => db.select().from(users).where(eq(users.uid, req.user!.uid)));
      if (user.length === 0) return res.status(403).json({ error: "User not synced" });

      const { content } = req.body;
      const result = await withDbRetry(() => db.insert(comments)
        .values({
          content,
          newsId,
          userId: user[0].id,
        })
        .returning()
      );
      res.status(201).json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  
  // === Leagues ===
  app.get("/api/leagues", async (req, res) => {
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
      res.json(allFreeLeagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // === Standings ===
  app.get("/api/standings", async (req, res) => {
    try {
      const rawLeague = (req.query.league as string) || 'PD';
      const season = (req.query.season as string) || '2026';
      const standingsData = await getStoredStandings(String(rawLeague).toUpperCase(), season);
      res.json(standingsData);
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  app.get("/api/standings/:leagueId", async (req, res) => {
    try {
      let rawLeague = req.params.leagueId || (req.query.league as string) || 'PD';
      if (rawLeague === 'all') rawLeague = 'PD';
      const season = (req.query.season as string) || '2026';
      const standingsData = await getStoredStandings(String(rawLeague).toUpperCase(), season);
      res.json(standingsData);
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // === Sync Matches Endpoint ===
  app.post("/api/sync-matches", async (req, res) => {
    try {
      await syncMatchesCycle();
      res.json({ status: "ok", message: "Matches synced successfully and stored in DB" });
    } catch (error: any) {
      console.error("Error syncing matches:", error);
      res.status(500).json({ error: error.message || "Failed to sync matches" });
    }
  });

  // Helper: Match Importance Score for sorting top matches first
  const TOP_TEAMS_KEYWORDS = [
    'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'أرسنال', 'بايرن',
    'باريس', 'أتلتيكو', 'إنتر', 'ميلان', 'يوفنتوس', 'تشيلسي', 'مانشستر يونايتد',
    'دورتموند', 'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool',
    'Arsenal', 'Bayern', 'Paris', 'Atletico', 'Inter', 'Milan', 'Juventus', 'Chelsea', 'Manchester United'
  ];

  const LEAGUE_WEIGHTS: Record<string, number> = {
    'CL': 40, '2001': 40,
    'PL': 35, '2021': 35,
    'PD': 30, '2014': 30,
    'SA': 25, '2019': 25,
    'BL1': 25, '2002': 25,
    'FL1': 20, '2015': 20,
  };

  function calculateMatchImportance(m: any): number {
    let score = 0;
    if (m.status === 'LIVE' || m.status === 'IN_PLAY') score += 100;
    const code = m.leagueId || m.competition?.code || '';
    score += LEAGUE_WEIGHTS[code] || 10;
    const homeName = m.homeTeam?.name || '';
    const awayName = m.awayTeam?.name || '';
    const isHomeTop = TOP_TEAMS_KEYWORDS.some(k => homeName.includes(k));
    const isAwayTop = TOP_TEAMS_KEYWORDS.some(k => awayName.includes(k));
    if (isHomeTop && isAwayTop) score += 60;
    else if (isHomeTop || isAwayTop) score += 30;
    return score;
  }

  // === Matches ===

  // Admin Dashboard Routes
  app.get("/api/admin/stats", requirePermission(), async (req: AuthRequest, res) => {
    try {
      const statsData = await withDbRetry(async () => {
        const newsCount = await db.select({ count: sql`count(*)` }).from(news);
        const publishedCount = await db.select({ count: sql`count(*)` }).from(news).where(eq(news.status, 'published'));
        const draftsCount = await db.select({ count: sql`count(*)` }).from(news).where(eq(news.status, 'draft'));
        const usersCount = await db.select({ count: sql`count(*)` }).from(users);
        const adminsCount = await db.select({ count: sql`count(*)` }).from(users).where(sql`role IN ('admin', 'superadmin')`);
        
        const latestNewsRows = await db.select({
          id: news.id,
          title: news.title,
          status: news.status,
          isFeatured: news.isFeatured,
          isBreaking: news.isBreaking,
          createdAt: news.createdAt,
          authorName: users.name,
          categoryName: categories.name
        })
        .from(news)
        .leftJoin(users, eq(news.authorId, users.id))
        .leftJoin(categories, eq(news.categoryId, categories.id))
        .orderBy(desc(news.createdAt))
        .limit(5);

        const latestNews = latestNewsRows.map(n => ({
          id: n.id,
          title: n.title,
          status: n.status,
          isFeatured: n.isFeatured,
          isBreaking: n.isBreaking,
          createdAt: n.createdAt,
          author: n.authorName ? { name: n.authorName } : null,
          category: n.categoryName ? { name: n.categoryName } : null
        }));
        
        const recentActivityRows = await db.select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          action: activityLogs.action,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          details: activityLogs.details,
          createdAt: activityLogs.createdAt,
          userName: users.name
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .orderBy(desc(activityLogs.createdAt))
        .limit(10);

        const recentActivity = recentActivityRows.map(a => ({
          id: a.id,
          userId: a.userId,
          action: a.action,
          targetType: a.entityType,
          targetId: a.entityId,
          details: a.details,
          createdAt: a.createdAt,
          user: a.userName ? { name: a.userName } : null
        }));

        return {
          newsCount: Number(newsCount[0]?.count || 0),
          publishedCount: Number(publishedCount[0]?.count || 0),
          draftsCount: Number(draftsCount[0]?.count || 0),
          usersCount: Number(usersCount[0]?.count || 0),
          adminsCount: Number(adminsCount[0]?.count || 0),
          latestNews,
          recentActivity
        };
      });
      
      res.json(statsData);
    } catch (e) {
      console.error("Admin stats error:", e);
      res.status(500).json({ error: true });
    }
  });
  
  app.get("/api/admin/users", requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== "superadmin") return res.status(403).json({ error: "Superadmin only" });
    try {
      const allUsers = await withDbRetry(() => db.select().from(users).orderBy(desc(users.createdAt)));
      res.json(allUsers);
    } catch (e) {
      console.error("Admin users error:", e);
      res.status(500).json({ error: true });
    }
  });
  
  app.put("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== "superadmin") return res.status(403).json({ error: "Superadmin only" });
    try {
      const targetUserId = parseInt(req.params.id as string);
      const { role, permissions, isActive } = req.body;
      
      // Prevent changing superadmin / owner
      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];
      
      if (targetUser.email === 'abod46071@gmail.com' || targetUser.role === 'superadmin') {
        return res.status(400).json({ error: 'حساب مالك النظام والمدير العام الرئيسي محمي بالكامل ولا يمكن تعديل رتبته أو تعطيله' });
      }
      
      const newRole = role || targetUser.role;
      const newIsAdmin = newRole === 'admin' || newRole === 'superadmin';
      
      await withDbRetry(() => db.update(users).set({
        role: newRole,
        isAdmin: newIsAdmin,
        permissions: permissions || targetUser.permissions,
        isActive: isActive !== undefined ? isActive : targetUser.isActive
      }).where(eq(users.id, targetUserId)));
      
      await logActivity(req.dbUser.id, 'UPDATE', 'USER', String(targetUserId), { role: newRole, permissions, isActive });
      res.json({ success: true });
    } catch (e) {
      console.error("Admin user update error:", e);
      res.status(500).json({ error: true });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser?.role !== "superadmin") return res.status(403).json({ error: "Superadmin only" });
    try {
      const targetUserId = parseInt(req.params.id as string);
      const targetUserList = await withDbRetry(() => db.select().from(users).where(eq(users.id, targetUserId)));
      if (!targetUserList.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const targetUser = targetUserList[0];

      if (targetUser.email === 'abod46071@gmail.com' || targetUser.role === 'superadmin') {
        return res.status(400).json({ error: 'حساب مالك النظام والمدير العام الرئيسي محمي بالكامل ولا يمكن حذفه' });
      }

      await permanentlyDeleteUserRecord(targetUser);
      await logActivity(req.dbUser.id, 'DELETE', 'USER', String(targetUserId), { email: targetUser.email, name: targetUser.name });
      res.json({ success: true, message: 'تم حذف المستخدم نهائياً بنجاح' });
    } catch (e) {
      console.error("Admin user delete error:", e);
      res.status(500).json({ error: true });
    }
  });


  app.get("/api/matches", async (req, res) => {
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

      res.json(formattedMatches);
    } catch (error: any) {
      console.error("Error fetching matches from DB:", error);
      res.status(500).json({ error: true, message: error.message || "فشل في جلب المباريات من الخادم" });
    }
  });

  // Ensure SuperAdmin user exists and password is set
  async function ensureSuperAdminUser() {
    const adminEmail = 'abod46071@gmail.com';
    const adminPass = 'abod1234';
    let adminUid = 'superadmin_abod46071';
    try {
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(adminEmail);
        await adminAuth.updateUser(userRecord.uid, { password: adminPass, displayName: 'عبدالله الراعي', emailVerified: true });
        adminUid = userRecord.uid;
        console.log(`[SuperAdmin] Password & profile updated for ${adminEmail}`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          try {
            userRecord = await adminAuth.createUser({
              email: adminEmail,
              password: adminPass,
              displayName: 'عبدالله الراعي',
              emailVerified: true
            });
            if (userRecord?.uid) adminUid = userRecord.uid;
            console.log(`[SuperAdmin] Account created in Firebase for ${adminEmail}`);
          } catch (createErr) {
            console.log('[SuperAdmin] SuperAdmin account ensured via DB engine');
          }
        } else {
          console.log('[SuperAdmin] SuperAdmin account verified via DB engine');
        }
      }

      const superAdminPermissions = ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage'];
      const dbUser = await getOrCreateUser(
        adminUid,
        adminEmail,
        'عبدالله الراعي',
        undefined,
        adminPass
      );
      await db.update(users)
        .set({ name: 'عبدالله الراعي', role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions, password: adminPass })
        .where(eq(users.id, dbUser.id));
      console.log(`[SuperAdmin] Superadmin user synchronized in DB for ${adminEmail}.`);
    } catch (err) {
      console.error(`[SuperAdmin] Failed to setup superadmin user for ${adminEmail}:`, err);
    }
  }

  ensureSuperAdminUser().catch(console.error);

  // Start Cron Jobs
  if (process.env.NODE_ENV !== "test") {
     startCronJobs();
  }

  // Vite middleware for development

  console.log("NODE_ENV IS:", process.env.NODE_ENV); if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    console.error("Unhandled API error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: true, message: err?.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

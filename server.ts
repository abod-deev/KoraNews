import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { news, categories, comments, users, leagues, teams } from "./src/db/schema.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { eq, desc, and } from "drizzle-orm";
import { matches } from "./src/db/schema.ts";
import { startCronJobs } from "./src/services/cronService.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Vite requires inline scripts in dev, and often simpler to disable in this template
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression()); // Compress responses for better Core Web Vitals
  
  // Rate limiting to prevent brute force & DoS
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes"
  });
  app.use(limiter);

  app.use(cors());
  app.use(express.json());


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
      res.json(user);
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // === Categories ===
  app.get("/api/categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(categories).orderBy(categories.name);
      res.json(allCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, slug } = req.body;
      const result = await db.insert(categories).values({ name, slug }).returning();
      res.status(201).json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // === News ===
  app.get("/api/news", async (req, res) => {
    try {
      const allNews = await db.query.news.findMany({ orderBy: [desc(news.createdAt)], with: { author: true, category: true } });
      res.json(allNews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const article = await db.query.news.findFirst({ where: eq(news.id, id), with: { author: true, category: true, comments: { with: { user: true }, orderBy: [desc(comments.createdAt)] } } });
      if (!article) return res.status(404).json({ error: "News not found" });
      return res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news item" });
    }
  });

  app.post("/api/news", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (user.length === 0) return res.status(403).json({ error: "User not synced" });

      const { title, excerpt, content, image, categoryId, isFeatured } = req.body;
      const result = await db.insert(news)
        .values({
          title,
          excerpt,
          content,
          image,
          categoryId,
          authorId: user[0].id,
          isFeatured,
        })
        .returning();
      res.status(201).json(result[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create news" });
    }
  });

  app.put("/api/news/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { title, excerpt, content, image, categoryId, isFeatured } = req.body;
      const result = await db.update(news)
        .set({ title, excerpt, content, image, categoryId, isFeatured })
        .where(eq(news.id, id))
        .returning();
      if (result.length === 0) return res.status(404).json({ error: "News not found" });
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update news" });
    }
  });

  app.delete("/api/news/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await db.delete(news).where(eq(news.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete news" });
    }
  });

  // === Comments ===
  app.get("/api/news/:id/comments", async (req, res) => {
    try {
      const newsId = parseInt(req.params.id as string);
      const articleComments = await db.select().from(comments).where(eq(comments.newsId, newsId)).orderBy(desc(comments.createdAt));
      res.json(articleComments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/news/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const newsId = parseInt(req.params.id as string);
      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (user.length === 0) return res.status(403).json({ error: "User not synced" });

      const { content } = req.body;
      const result = await db.insert(comments)
        .values({
          content,
          newsId,
          userId: user[0].id,
        })
        .returning();
      res.status(201).json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  
  // === Leagues ===
  app.get("/api/leagues", async (req, res) => {
    try {
      const allLeagues = await db.select().from(leagues).orderBy(leagues.name);
      res.json(allLeagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // === Matches ===
  app.get("/api/matches", async (req, res) => {
    try {
      const { status, date, leagueId } = req.query;
      let query = db.query.matches.findMany({
        with: {
          league: true,
          homeTeam: true,
          awayTeam: true
        },
        orderBy: [desc(matches.matchDate)]
      });
      let result = await query;
      
      if (status) {
        result = result.filter(m => m.status === status);
      }
      if (date) {
        const d = new Date(date as string).toDateString();
        result = result.filter(m => new Date(m.matchDate).toDateString() === d);
      }
      if (leagueId) {
        result = result.filter(m => m.leagueId === leagueId);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Start Cron Jobs
  if (process.env.NODE_ENV !== "test") {
     startCronJobs();
  }

  // Vite middleware for development

  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

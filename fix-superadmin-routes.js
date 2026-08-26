import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

// Replace requirePermission('admin_manage') with a custom middleware inline or just requireAuth and check inside.
// Wait, I can just write a specific middleware or check inside the route.
content = content.replace(
  'app.get("/api/admin/users", requirePermission(\'admin_manage\'), async (req: AuthRequest, res) => {',
  'app.get("/api/admin/users", requireAuth, async (req: AuthRequest, res) => {\n    if (req.dbUser?.role !== "superadmin") return res.status(403).json({ error: "Superadmin only" });'
);

content = content.replace(
  'app.put("/api/admin/users/:id", requirePermission(\'admin_manage\'), async (req: AuthRequest, res) => {',
  'app.put("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {\n    if (req.dbUser?.role !== "superadmin") return res.status(403).json({ error: "Superadmin only" });'
);

fs.writeFileSync('server.ts', content);

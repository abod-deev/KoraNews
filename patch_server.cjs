const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const matchesEndpoints = `
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
        const d = new Date(date).toDateString();
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
`;

code = code.replace('// Vite middleware for development', matchesEndpoints);
fs.writeFileSync('server.ts', code);

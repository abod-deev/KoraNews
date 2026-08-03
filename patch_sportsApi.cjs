const fs = require('fs');
let code = fs.readFileSync('src/services/sportsApi.ts', 'utf8');

const replacement = `
export const getMatches = async (date?: string, status?: string, leagueId?: string): Promise<Match[]> => {
  let url = \`\${API_URL}/api/matches?\`;
  if (date) url += \`date=\${date}&\`;
  if (status) url += \`status=\${status}&\`;
  if (leagueId) url += \`leagueId=\${leagueId}&\`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch matches');
  const data = await res.json();
  return data.map((m: any) => ({
    ...m,
    leagueName: m.league?.name || 'Unknown League'
  }));
};
`;

code = code.replace(/export const getMatches = async [\s\S]*?return res.json\(\);\n};/, replacement.trim());
fs.writeFileSync('src/services/sportsApi.ts', code);

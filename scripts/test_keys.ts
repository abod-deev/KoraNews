async function testApiFootballKeys() {
  const key = process.env.FOOTBALL_API_KEY || '';

  const endpoints = [
    { url: 'https://v3.football.api-sports.io/teams?search=Ittihad', headers: { 'x-apisports-key': key } },
    { url: 'https://v3.football.api-sports.io/teams?search=Ittihad', headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'v3.football.api-sports.io' } },
    { url: 'https://api-football-v1.p.rapidapi.com/v3/teams?search=Ittihad', headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' } },
  ];

  for (const ep of endpoints) {
    try {
      console.log('Fetching:', ep.url, JSON.stringify(ep.headers));
      const res = await fetch(ep.url, { headers: ep.headers });
      console.log('Status:', res.status);
      const data = await res.json();
      console.log('Body:', JSON.stringify(data).slice(0, 300), '\n');
    } catch (e: any) {
      console.log('Error:', e.message, '\n');
    }
  }
}

testApiFootballKeys();

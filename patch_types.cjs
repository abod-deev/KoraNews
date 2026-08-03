const fs = require('fs');
let code = fs.readFileSync('src/services/sportsApi.ts', 'utf8');
code = code.replace("import { Match, Standing, Team, Player, League } from './api_types.ts';", "");
fs.writeFileSync('src/services/sportsApi.ts', code);

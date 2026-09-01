const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("    })\n      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-cron-secret'],\n    })\n  );", "      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-cron-secret'],\n    })\n  );");

fs.writeFileSync('server.ts', code);

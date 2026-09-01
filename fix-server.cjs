const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Production CORS Check at Startup
const corsStartupCheck = `
  const isProduction = process.env.NODE_ENV === 'production';
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
  const configuredAllowedOrigins = rawAllowedOrigins
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter((o) => o.length > 0);

  if (isProduction && configuredAllowedOrigins.length === 0) {
    console.error('CRITICAL CONFIGURATION ERROR: ALLOWED_ORIGINS must be explicitly defined in production.');
    process.exit(1);
  }
`;

code = code.replace(
  "const isProduction = process.env.NODE_ENV === 'production';\n  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';\n  const configuredAllowedOrigins = rawAllowedOrigins\n    .split(',')\n    .map((o) => o.trim().toLowerCase())\n    .filter((o) => o.length > 0);",
  corsStartupCheck
);

// 2. Remove the fallback for `.run.app` in production
code = code.replace(
  "        // If in production without explicit ALLOWED_ORIGINS, permit current Cloud Run host domain\n        if (isProduction) {\n          if (originLower.endsWith('.run.app')) {\n            return callback(null, true);\n          }\n          return callback(new Error(`CORS Error: Origin ${origin} is not allowed`));\n        }",
  "        // No fallback for production. Must match ALLOWED_ORIGINS.\n        if (isProduction) {\n          return callback(new Error(`CORS Error: Origin ${origin} is not allowed`));\n        }"
);

// 3. Fix DB Migration error handling
const oldDbInit = `  // Initialize DB Schema & Run Automatic Migrations (e.g. Scrypt password migration)
  try {
    await initializeDatabaseSchema();
  } catch (dbErr: any) {
    console.warn('[Server Startup] Non-fatal DB initialization warning:', dbErr?.message || dbErr);
  }`;

const newDbInit = `  // Initialize DB Schema & Run Automatic Migrations
  try {
    await initializeDatabaseSchema();
  } catch (dbErr: any) {
    console.error('[Server Startup] CRITICAL DB initialization error:', dbErr?.message || dbErr);
    if (isProduction) {
      console.error('Shutting down server due to critical database initialization failure in production.');
      process.exit(1);
    }
  }`;

code = code.replace(oldDbInit, newDbInit);

fs.writeFileSync('server.ts', code);

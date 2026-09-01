const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Remove isProduction from where it is
const toRemove = `
  const isProduction = process.env.NODE_ENV === 'production';
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
  const configuredAllowedOrigins = rawAllowedOrigins
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter((o) => o.length > 0);

  if (isProduction && configuredAllowedOrigins.length === 0) {
    console.error('CRITICAL CONFIGURATION ERROR: ALLOWED_ORIGINS must be explicitly defined in production.');
    process.exit(1);
  }`;

code = code.replace(toRemove, "");

// Add it to the top of startServer
const startStr = "async function startServer() {\n  const app = express();";
const replacementStr = `async function startServer() {
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

  const app = express();`;

code = code.replace(startStr, replacementStr);
fs.writeFileSync('server.ts', code);

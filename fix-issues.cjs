const fs = require('fs');

// 1. Fix server.ts CORS
let serverCode = fs.readFileSync('server.ts', 'utf8');
const oldCorsStrict = `        // In Production, strictly check configured ALLOWED_ORIGINS
        if (isProduction) {
          if (configuredAllowedOrigins.includes(originLower)) {
            return callback(null, true);
          }
          
          // Strict Wildcard checking: Ensure it's a subdomain, not just ending with the base string
          const isWildcardMatch = configuredAllowedOrigins.some((allowed) => {
            if (allowed.startsWith('*.')) {
              const base = allowed.slice(2);
              try {
                const originUrl = new URL(originLower);
                return originUrl.hostname.endsWith('.' + base) || originUrl.hostname === base;
              } catch (e) {
                return false;
              }
            }
            return false;
          });

          if (isWildcardMatch) {
            return callback(null, true);
          }

          return callback(new Error(\`CORS Error: Origin \${origin} is not allowed\`));
        }`;

const newCorsStrict = `        // In Production, strictly check configured ALLOWED_ORIGINS
        if (isProduction) {
          if (configuredAllowedOrigins.includes(originLower)) {
            return callback(null, true);
          }
          
          return callback(new Error(\`CORS Error: Origin \${origin} is not allowed\`));
        }`;

if (serverCode.includes(oldCorsStrict)) {
  serverCode = serverCode.replace(oldCorsStrict, newCorsStrict);
  fs.writeFileSync('server.ts', serverCode);
  console.log("server.ts updated");
} else {
  console.log("Could not find old CORS logic in server.ts");
}

// 2. Fix Auth Helpers
const authHelpersPath = 'src/utils/authHelpers.ts';
let authHelpersCode = fs.readFileSync(authHelpersPath, 'utf8');

// Just export checkIsAdmin using a generic type if User is not found, or any for now until we grep
console.log("authHelpersCode:");
console.log(authHelpersCode);

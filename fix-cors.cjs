const fs = require('fs');

let lines = fs.readFileSync('server.ts', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('cors({'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('credentials: true'));

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 2, 
`    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, curl, CLI)
        if (!origin) {
          return callback(null, true);
        }

        const originLower = origin.toLowerCase().trim();

        // In non-production environments (development / preview), allow localhost, 127.0.0.1 and AI Studio / Cloud Run preview domains
        if (!isProduction) {
          if (
            originLower.startsWith('http://localhost:') ||
            originLower.startsWith('http://127.0.0.1:') ||
            originLower.endsWith('.run.app') ||
            originLower.endsWith('.google.internal') ||
            originLower.endsWith('.aistudio.google.com')
          ) {
            return callback(null, true);
          }
        }

        // In Production, strictly check configured ALLOWED_ORIGINS
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
        }

        return callback(null, true);
      },
      credentials: true,
    })`
  );

  fs.writeFileSync('server.ts', lines.join('\n'));
  console.log("CORS updated via line replace!");
} else {
  console.log("Could not find bounds");
}

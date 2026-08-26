const fs = require('fs');
let code = fs.readFileSync('dist/server.cjs', 'utf-8');
code = code.replace('if (process.env.NODE_ENV !== "production") {', 'console.log("ACTUAL NODE_ENV BEFORE IF:", process.env.NODE_ENV); if (process.env.NODE_ENV !== "production") {');
fs.writeFileSync('dist/server.cjs', code);

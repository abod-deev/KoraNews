const fs = require('fs');
let code = fs.readFileSync('dist/server.cjs', 'utf-8');
code = code.replace('app.listen(PORT', `
  app.use((req, res, next) => {
    console.log("FALLBACK MIDDLEWARE CAUGHT REQUEST:", req.url);
    res.send("FALLBACK CAUGHT");
  });
  app.listen(PORT
`);
fs.writeFileSync('dist/server.cjs', code);

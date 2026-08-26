const fs = require('fs');
let code = fs.readFileSync('dist/server.cjs', 'utf-8');
code = code.replace('res.sendFile(import_path.default.join(distPath, "index.html"));', `
  const fileToSend = import_path.default.join(distPath, "index.html");
  console.log("SENDING FILE:", fileToSend);
  console.log("FILE CONTENT:", require('fs').readFileSync(fileToSend, 'utf8').substring(0, 100));
  res.sendFile(fileToSend);
`);
fs.writeFileSync('dist/server.cjs', code);

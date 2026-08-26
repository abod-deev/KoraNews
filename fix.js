import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  'const targetUserId = parseInt(req.params.id);',
  'const targetUserId = parseInt(req.params.id as string);'
);
fs.writeFileSync('server.ts', content);

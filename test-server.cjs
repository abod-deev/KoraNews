const express = require('express');
const path = require('path');
const app = express();
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*all', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/assets/index-CYopNpZq.js`)
    .then(r => console.log('assets status:', r.status))
    .then(() => fetch(`http://localhost:${port}/`))
    .then(r => r.text())
    .then(t => console.log('root html:', t.substring(0, 50)))
    .then(() => server.close());
});

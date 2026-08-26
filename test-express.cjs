const express = require('express');
const app = express();
app.get('/*all', (req, res) => res.json({ route: '/*all', params: req.params }));
app.get('*all', (req, res) => res.json({ route: '*all', params: req.params }));

const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/something/else`).then(r => r.json()).then(console.log).then(() => server.close());
});

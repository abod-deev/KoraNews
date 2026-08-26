const express = require('express');
const app = express();
app.get('*all', (req, res) => res.send('matched *all'));
const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/`).then(r => r.text()).then(console.log)
  .then(() => fetch(`http://localhost:${port}/something`)).then(r => r.text()).then(console.log)
  .then(() => server.close());
});

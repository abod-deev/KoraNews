const http = require('http');
http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("DATA LENGTH:", data.length, "DATA:", data.substring(0, 300)));
});

const express = require('express');
const path = require('path');

const PORT = Number(process.env.PULSE_SHOWCASE_PORT) || 8101;
const app = express();

app.use(express.static(path.join(__dirname)));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Pulse showcase (both channels): http://127.0.0.1:${PORT}`);
});

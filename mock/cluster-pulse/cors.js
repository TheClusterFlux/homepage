/** Allow showcase (8101) to fetch pulse APIs from 8099 / 8100. */
function pulseCors(_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

module.exports = { pulseCors };

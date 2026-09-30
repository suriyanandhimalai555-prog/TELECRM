// Fallback entry for platforms that default to `node server.js` (e.g. a Railway
// service with a dashboard start command). Runs the bundled backend from `npm run build`.
require('./backend/dist/server.cjs');

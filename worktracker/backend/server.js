// Fallback entry for platforms that default to `node server.js` (e.g. a Railway
// service rooted at /backend). Runs the bundle produced by `npm run build`.
import './dist/server.cjs';

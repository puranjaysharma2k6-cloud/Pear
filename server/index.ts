import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Pear' });
});

// ── Serve React build in production ────────────────────────────────────────
// Signaling is handled entirely by the Cloudflare Worker (see cloudflare-worker.js).
// This Express server only serves the static React bundle.
const clientBuild = path.join(__dirname, '../../client/dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuild));
  // SPA fallback — all unknown routes return index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send(
      'Pear API server running in development mode.\n' +
      'Run the React client separately: npm run client:dev\n' +
      'Signaling is via Cloudflare Worker — set VITE_CF_WORKER_URL in client/.env'
    );
  });
}

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 8000;
server.listen(PORT, () => {
  console.log(`[Pear] Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`[Pear] Serving React app from ${clientBuild}`);
  }
  console.log('[Pear] Signaling: Cloudflare Worker (see cloudflare-worker.js)');
});

# Pear 🍐

Direct peer-to-peer file sharing using WebRTC. No file size limits, no cloud uploads — files go browser-to-browser.

**Stack:** Express (static file server) + React + Vite (client) + Cloudflare Workers + Durable Objects (signaling)

## Architecture

```
Browser A ──WebSocket──► Cloudflare Worker (Durable Object)
                         Relays SDP + ICE ◄──WebSocket── Browser B
                                │
             Once P2P negotiated, Worker is no longer involved
                                │
Browser A ◄═══════ RTCDataChannel (direct P2P) ══════════► Browser B
```

The **Express server** only serves the React static bundle. It has no WebSocket logic.
All signaling (peer discovery, SDP offer/answer, ICE candidates) goes through the **Cloudflare Worker**.

## Project Structure

```
pear/
├── cloudflare-worker.js   Signaling server (Cloudflare Worker + Durable Objects)
├── wrangler.toml          Wrangler config for worker deployment
├── .dev.vars              Cloudflare dev secrets (gitignored)
├── server/
│   └── index.ts           Express server — serves static React build
├── client/
│   ├── .env               VITE_CF_WORKER_URL (gitignored, copy from .env.example)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── contexts/      WebRTCContext
│       └── lib/           webRTCManager (connects to CF Worker)
└── package.json
```

## Setup

### 1. Install dependencies

```bash
npm install
npm install --prefix client
```

### 2. Configure the client env

```bash
cp client/.env.example client/.env
# Edit client/.env and set your Cloudflare Worker URL:
# VITE_CF_WORKER_URL="wss://your-worker.your-subdomain.workers.dev"
```

### 3. Deploy the Cloudflare Worker (first time)

```bash
npm run worker:deploy
# or for local testing:
npm run worker:dev
```

## Development

```bash
npm run dev
```

- React client: **http://localhost:3000** (Vite dev server)
- Express server: **http://localhost:8000** (static serving, dev mode only shows info)
- Signaling: **Cloudflare Worker** (set `VITE_CF_WORKER_URL` in `client/.env`)

## Production Build & Deploy

```bash
# Build the React client
npm run build

# Build the Express server
npm run build:server

# Run in production (Express serves the React bundle)
NODE_ENV=production PORT=8000 npm start
```

The Express server will serve the built `client/dist` at `/` and handle SPA routing fallback.

## Environment Variables

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_CF_WORKER_URL` | ✅ Yes | Cloudflare Worker WebSocket URL (`wss://...`) |

### Server (`.env` or process env)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Express server port |
| `NODE_ENV` | `development` | Environment |

---

Made with ❤️ by Puranjay Sharma

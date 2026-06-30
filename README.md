# Pear 🍐
**try it out!** [PEAR](https://pear-384.pages.dev/settings)
**Pear** is a modern, serverless peer-to-peer (P2P) file sharing app that lets users transfer files directly between browsers — no uploads to a central server, no accounts, no limits.

It uses **WebRTC** for direct P2P communication and a **Cloudflare Worker** (Durable Objects) for signaling, ensuring fast, private, and secure file transfers.

---

## Features

- **Direct P2P Transfers** — Files go straight from sender to receiver. No server ever touches your data.
- **No File Size Limits** — Since there's no server upload, share files of any size.
- **Real-time Peer Discovery** — Instantly see who's online and available to connect.
- **Secure & Private** — WebRTC's encrypted data channels keep transfers private.
- **Modern UI/UX** — Built with React, shadcn/ui, and Framer Motion for a clean, animated experience.
- **Dark Mode** — Theme-aware interface that respects your system preferences.

---

## Technologies Used

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Tailwind CSS, Framer Motion |
| P2P Communication | WebRTC (RTCPeerConnection + RTCDataChannel) |
| Signaling | Cloudflare Workers + Durable Objects (WebSocket) |
| Deployment | Cloudflare Pages (frontend) + Cloudflare Workers (signaling) |

---

## Architecture

```
Browser A ──WebSocket──► Cloudflare Worker (Durable Object)
                         Relays SDP + ICE ◄──WebSocket── Browser B
                                │
          Once P2P is established, Worker is no longer involved
                                │
Browser A ◄═══ RTCDataChannel (direct P2P) ═══► Browser B
               (files never touch any server)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm
- A Cloudflare account (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/puranjaysharma2k6-cloud/Pear.git
cd Pear
```

### 2. Install Dependencies

```bash
# Server dependencies
npm install

# Client dependencies
npm install --prefix client
```

### 3. Deploy the Cloudflare Worker (Signaling Server)

The signaling server runs on a Cloudflare Worker with Durable Objects. Deploy it with:

```bash
# Login to Cloudflare (one time)
npx wrangler login

# Deploy the worker
npm run worker:deploy
```

After deployment you'll get a URL like:
```
https://pear.your-account.workers.dev
```

### 4. Configure Environment Variables

#### For local development — create `client/.env`:
```bash
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_CF_WORKER_URL="wss://pear.your-account.workers.dev"
```

#### For Cloudflare Pages production — set it in the dashboard:
**Workers & Pages → your Pages project → Settings → Environment variables**

| Key | Value |
|---|---|
| `VITE_CF_WORKER_URL` | `wss://pear.your-account.workers.dev` |

### 5. Run the Development Server

```bash
npm run client:dev
```

Open **http://localhost:3000** in two different browser tabs or on two different devices to test the P2P connection.

---

## Deployment

### Frontend — Cloudflare Pages

Connect your GitHub repo to Cloudflare Pages with these settings:

| Setting | Value |
|---|---|
| Root directory | *(blank)* |
| Build command | `npm install --prefix client && npm run build` |
| Build output directory | `client/dist` |
| Environment variable | `VITE_CF_WORKER_URL` = `wss://your-worker.workers.dev` |

Every push to `main` automatically redeploys.

### Signaling Worker

```bash
npm run worker:deploy
```

---

## Project Structure

```
pear/
├── cloudflare-worker.js   Signaling server (Cloudflare Worker + Durable Objects)
├── wrangler.toml          Wrangler deploy config
├── server/                Express server (serves static build in production)
└── client/
    ├── public/
    │   └── _redirects     SPA routing for Cloudflare Pages
    ├── src/
    │   ├── pages/         Route pages (Home, Share, Receive, Peers, Settings)
    │   ├── components/    UI components (shadcn/ui + custom)
    │   ├── contexts/      WebRTCContext — global state & event bridge
    │   └── lib/           webRTCManager (core WebRTC + signaling logic)
    └── .env.example       Environment variable template
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run client:dev` | Start React dev server on :3000 |
| `npm run build` | Build React client to `client/dist` |
| `npm run worker:deploy` | Deploy Cloudflare Worker |
| `npm run worker:dev` | Run Worker locally with Wrangler |

---

Made with ❤️ by [Puranjay Sharma](https://linkedin.com/in/puranjay-sharma-332554320/)

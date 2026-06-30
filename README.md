# Pear 🍐

Direct peer-to-peer file sharing using WebRTC. No file size limits, no cloud uploads — just browser-to-browser transfers.

Built with **Express** (signaling server) + **React + Vite** (client).

## Project Structure

```
easy-share-v2/
├── server/          Express WebSocket signaling server
│   └── index.ts
├── client/          React + Vite frontend
│   ├── src/
│   │   ├── pages/       Route pages
│   │   ├── components/  UI components
│   │   ├── contexts/    WebRTCContext
│   │   ├── lib/         WebRTC manager + utils
│   │   └── hooks/       use-toast
│   └── ...
└── package.json     Root: runs both server & client
```

## Development

```bash
# Install root dependencies (server)
npm install

# Install client dependencies
npm install --prefix client

# Run both server + client in dev mode
npm run dev
```

- Client runs on **http://localhost:3000**
- Server runs on **http://localhost:8000**
- Vite proxies `/api/signaling` WebSocket to the Express server

## Production Build

```bash
# Build client
npm run build

# Build server
npm run build:server

# Start production server (serves built client + WebSocket)
NODE_ENV=production npm start
```

## Deployment

This app runs as a single Node.js process in production:
1. The Express server serves the built React app as static files
2. The same server handles WebSocket signaling at `/api/signaling`

### Render / Railway / Fly.io
Set `NODE_ENV=production`, run `npm run build:all` then `npm start`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Server port |
| `NODE_ENV` | `development` | Environment |

Client-side (in `client/.env`):

| Variable | Default | Description |
|---|---|---|
| `VITE_SIGNALING_URL` | auto-detected | Override signaling WS URL |

## How It Works

1. Peers connect to the Express WebSocket server for signaling
2. The server relays WebRTC offer/answer/ICE messages between peers
3. Once a P2P connection is established, file transfer happens **directly** between browsers
4. The server is **never involved** in actual file data transfer

---

Made with ❤️ by Puranjay Sharma

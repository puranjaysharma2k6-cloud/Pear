import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

const app = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── WebSocket Signaling Server ──────────────────────────────────────────────
interface Peer {
  id: string;
  name: string;
}

const peers = new Map<string, Peer>();
const sockets = new Map<string, WebSocket>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getPeerList(excludeId: string): Peer[] {
  return Array.from(peers.values()).filter((p) => p.id !== excludeId);
}

function broadcast(message: object, excludeId: string): void {
  const str = JSON.stringify(message);
  sockets.forEach((ws, peerId) => {
    if (peerId !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  });
}

const wss = new WebSocketServer({ server, path: '/api/signaling' });

wss.on('connection', (ws: WebSocket, req) => {
  // Parse the name from query string
  const urlStr = `http://localhost${req.url ?? '/'}`;
  const url = new URL(urlStr);
  const peerId = generateId();
  const rawName = url.searchParams.get('name') ?? `Peer-${peerId.substring(0, 4)}`;
  const peerName = rawName.substring(0, 50); // clamp to 50 chars

  const peer: Peer = { id: peerId, name: peerName };
  peers.set(peerId, peer);
  sockets.set(peerId, ws);

  console.log(`[Signaling] Peer connected: ${peerName} (${peerId})`);

  // Send registration message
  ws.send(
    JSON.stringify({
      type: 'registered',
      peerId,
      yourName: peer.name,
      peers: getPeerList(peerId),
    })
  );

  // Notify others about the new peer
  broadcast({ type: 'new-peer', peer: { id: peer.id, name: peer.name } }, peerId);

  ws.on('message', (data) => {
    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      return;
    }

    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const target = sockets.get(message.to);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ ...message, from: peerId, name: peer.name }));
        } else {
          ws.send(
            JSON.stringify({ type: 'error', message: `Peer ${message.to} not available.` })
          );
        }
        break;
      }

      case 'get-peers': {
        ws.send(JSON.stringify({ type: 'peer-list', peers: getPeerList(peerId) }));
        break;
      }

      case 'update-name': {
        if (typeof message.name === 'string' && message.name.trim().length > 0) {
          peer.name = message.name.substring(0, 50);
          peers.set(peerId, peer);
          console.log(`[Signaling] Name updated: ${peer.name} (${peerId})`);
          broadcast({ type: 'peer-name-updated', peerId, name: peer.name }, peerId);
          ws.send(JSON.stringify({ type: 'name-updated-ack', name: peer.name }));
        }
        break;
      }

      default:
        console.warn(`[Signaling] Unknown message type from ${peerId}:`, message.type);
    }
  });

  const cleanup = () => {
    if (peers.has(peerId)) {
      console.log(`[Signaling] Peer disconnected: ${peer.name} (${peerId})`);
      peers.delete(peerId);
      sockets.delete(peerId);
      broadcast({ type: 'peer-disconnected', peerId }, peerId);
    }
  };

  ws.on('close', cleanup);
  ws.on('error', (err) => {
    console.error(`[Signaling] WebSocket error for ${peerId}:`, err.message);
    cleanup();
  });
});

// ── Serve React Build in Production ────────────────────────────────────────
const clientBuild = path.join(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('EasyShare API — run the React client with: npm run client:dev');
  });
}

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 8000;
server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket signaling available at ws://localhost:${PORT}/api/signaling`);
});

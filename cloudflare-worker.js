// Cloudflare Worker for WebSocket signaling
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, env);
    }

    // Handle regular HTTP requests
    return new Response("EasyShare Signaling Server - WebSocket Only", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};

// Durable Object for managing WebSocket connections
export class SignalingServer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.peers = new Map();
    this.websockets = new Map();
    this.storage = state.storage;
  }

  // Generate a random peer ID
  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // Get list of peers excluding the specified ID
  getPeerList(excludeId) {
    return Array.from(this.peers.values())
      .filter((p) => p.id !== excludeId)
      .map((p) => ({ id: p.id, name: p.name }));
  }

  // Broadcast message to all peers except one
  broadcast(message, excludeId) {
    const messageString = JSON.stringify(message);
    this.websockets.forEach((ws, peerId) => {
      if (peerId !== excludeId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  }

  // Handle fetch requests (including WebSocket upgrades)
  async fetch(request) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    // Handle regular HTTP requests
    return new Response("EasyShare Signaling Durable Object", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Handle WebSocket upgrade
  async handleWebSocketUpgrade(request) {
    try {
      // Create a WebSocket pair
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Accept the WebSocket connection
      server.accept();

      // Get connection details
      const url = new URL(request.url);
      const peerId = this.generateId();
      const peerName =
        url.searchParams.get("name") || `Peer-${peerId.substring(0, 4)}`;

      console.log(`Peer connected: ${peerName} (ID: ${peerId})`);

      const newPeer = { id: peerId, name: peerName };
      this.peers.set(peerId, newPeer);
      this.websockets.set(peerId, server);

      // Send registration message to the new peer
      server.send(
        JSON.stringify({
          type: "registered",
          peerId,
          yourName: newPeer.name,
          peers: this.getPeerList(peerId),
        }),
      );

      // Notify other peers about the new peer
      this.broadcast(
        {
          type: "new-peer",
          peer: {
            id: newPeer.id,
            name: newPeer.name,
          },
        },
        peerId,
      );

      // Handle messages from this peer
      server.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(peerId, newPeer, message);
        } catch (error) {
          console.error(`Failed to parse message from ${peerId}:`, error);
          server.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format.",
            }),
          );
        }
      });

      // Handle disconnection
      server.addEventListener("close", () => {
        console.log(`Peer disconnected: ${newPeer.name} (ID: ${peerId})`);
        this.peers.delete(peerId);
        this.websockets.delete(peerId);
        this.broadcast(
          {
            type: "peer-disconnected",
            peerId,
          },
          peerId,
        );
      });

      // Handle errors
      server.addEventListener("error", (error) => {
        console.error(`WebSocket error for peer ${peerId}:`, error);
        if (this.peers.has(peerId)) {
          this.peers.delete(peerId);
          this.websockets.delete(peerId);
          this.broadcast(
            {
              type: "peer-disconnected",
              peerId,
            },
            peerId,
          );
        }
      });

      // Return the WebSocket response
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
  }

  // Handle incoming messages
  handleMessage(peerId, senderPeer, message) {
    switch (message.type) {
      case "offer":
      case "answer":
      case "ice-candidate":
        // Relay WebRTC signaling messages
        const targetPeer = this.websockets.get(message.to);
        if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
          targetPeer.send(
            JSON.stringify({
              ...message,
              from: peerId,
              name: senderPeer.name,
            }),
          );
        } else {
          this.websockets.get(peerId).send(
            JSON.stringify({
              type: "error",
              message: `Peer ${message.to} not available.`,
            }),
          );
        }
        break;

      case "get-peers":
        this.websockets.get(peerId).send(
          JSON.stringify({
            type: "peer-list",
            peers: this.getPeerList(peerId),
          }),
        );
        break;

      case "update-name":
        if (message.name) {
          senderPeer.name = message.name;
          this.peers.set(peerId, senderPeer);
          console.log(`Peer name updated: ${senderPeer.name} (ID: ${peerId})`);
          this.broadcast(
            {
              type: "peer-name-updated",
              peerId,
              name: senderPeer.name,
            },
            peerId,
          );
          this.websockets.get(peerId).send(
            JSON.stringify({
              type: "name-updated-ack",
              name: senderPeer.name,
            }),
          );
        }
        break;

      default:
        console.warn(`Unknown message type from ${peerId}: ${message.type}`);
    }
  }
}

// Handle WebSocket upgrade
async function handleWebSocket(request, env) {
  try {
    // Get the Durable Object instance
    const durableObjectId = env.SIGNALING_SERVER.idFromName("global");
    const durableObjectStub = env.SIGNALING_SERVER.get(durableObjectId);

    // Forward the request to the Durable Object
    return durableObjectStub.fetch(request);
  } catch (error) {
    console.error("WebSocket upgrade error:", error);
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
}
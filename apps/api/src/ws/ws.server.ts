import { WebSocketServer, WebSocket } from "ws";
import type { Server }                from "http";
import type { VaelWebhookEvent }      from "../services/webhook.service";

// ─── Client registry ──────────────────────────────────────────────────────────

interface VaelClient {
  ws:          WebSocket;
  wallets:     Set<string>;   // subscribed wallet addresses
  agentIds:    Set<string>;   // subscribed agent IDs
  eventTypes:  Set<string>;   // subscribed event types ("*" = all)
  connectedAt: number;
}

const clients = new Map<string, VaelClient>();
let clientIdCounter = 0;

// ─── Initialise WebSocket server ──────────────────────────────────────────────

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const clientId = `client-${++clientIdCounter}`;
    const client: VaelClient = {
      ws,
      wallets:    new Set(),
      agentIds:   new Set(),
      eventTypes: new Set(["*"]),   // default: all events
      connectedAt: Date.now(),
    };
    clients.set(clientId, client);

    // Send welcome message
    send(ws, {
      type:     "connected",
      clientId,
      message:  "Connected to Vael live feed",
      timestamp: Date.now(),
    });

    // Handle incoming messages (subscription management)
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(clientId, client, msg);
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
      }
    });

    ws.on("close",  () => clients.delete(clientId));
    ws.on("error",  () => clients.delete(clientId));

    // Ping every 30s to keep connection alive
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(ping);
        clients.delete(clientId);
      }
    }, 30_000);
  });

  console.log("  WebSocket      →  ws://localhost:[port]/ws");
  return wss;
}

// ─── Handle subscription messages from client ─────────────────────────────────

function handleClientMessage(clientId: string, client: VaelClient, msg: any) {
  switch (msg.type) {

    // Subscribe to events for specific agents
    case "subscribe:agent":
      if (Array.isArray(msg.agentIds)) {
        msg.agentIds.forEach((id: string) => client.agentIds.add(id.toLowerCase()));
        send(client.ws, { type: "subscribed", agentIds: [...client.agentIds] });
      }
      break;

    // Subscribe to events for specific wallet owners
    case "subscribe:wallet":
      if (Array.isArray(msg.wallets)) {
        msg.wallets.forEach((w: string) => client.wallets.add(w.toLowerCase()));
        send(client.ws, { type: "subscribed", wallets: [...client.wallets] });
      }
      break;

    // Filter to specific event types
    case "subscribe:events":
      if (Array.isArray(msg.events)) {
        client.eventTypes = new Set(msg.events);
        send(client.ws, { type: "subscribed", eventTypes: [...client.eventTypes] });
      }
      break;

    // Subscribe to all events (global feed)
    case "subscribe:all":
      client.agentIds.clear();
      client.wallets.clear();
      client.eventTypes = new Set(["*"]);
      send(client.ws, { type: "subscribed", mode: "all" });
      break;

    // Unsubscribe
    case "unsubscribe:agent":
      if (Array.isArray(msg.agentIds)) {
        msg.agentIds.forEach((id: string) => client.agentIds.delete(id.toLowerCase()));
      }
      break;

    // Ping from client
    case "ping":
      send(client.ws, { type: "pong", timestamp: Date.now() });
      break;

    default:
      send(client.ws, { type: "error", message: `Unknown message type: ${msg.type}` });
  }
}

// ─── Broadcast event to matching clients ─────────────────────────────────────

export function broadcastEvent(event: VaelWebhookEvent): void {
  const payload = JSON.stringify({ type: "event", event });

  for (const [, client] of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;

    const wantsAllEvents = client.eventTypes.has("*");
    const wantsThisEvent = wantsAllEvents || client.eventTypes.has(event.type);
    if (!wantsThisEvent) continue;

    // If client has filters — check agent or wallet match
    const hasFilters = client.agentIds.size > 0 || client.wallets.size > 0;

    if (!hasFilters) {
      // No filters = global feed subscriber
      client.ws.send(payload);
      continue;
    }

    // Match by agentId
    if (event.agentId && client.agentIds.has(event.agentId.toLowerCase())) {
      client.ws.send(payload);
      continue;
    }

    // Match by owner wallet (from event data)
    const ownerWallet = (event.data?.owner as string)?.toLowerCase();
    if (ownerWallet && client.wallets.has(ownerWallet)) {
      client.ws.send(payload);
    }
  }
}

// ─── Broadcast registry stats update (for live feed UI) ──────────────────────

export function broadcastStats(stats: {
  totalAgents:     number;
  totalActivities: number;
  totalPassports:  number;
}): void {
  const payload = JSON.stringify({ type: "stats", data: stats, timestamp: Date.now() });
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

// ─── Connection info ──────────────────────────────────────────────────────────

export function getConnectionCount(): number {
  return clients.size;
}

export function getConnectedClients() {
  return Array.from(clients.values()).map(c => ({
    connectedAt:   c.connectedAt,
    subscriptions: {
      agents:     [...c.agentIds],
      wallets:    [...c.wallets],
      eventTypes: [...c.eventTypes],
    },
  }));
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { VaelWebhookEvent } from "@/lib/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketOptions {
  /** Agent IDs to subscribe to. Empty = global feed */
  agentIds?:   string[];
  /** Wallet addresses to subscribe to */
  wallets?:    string[];
  /** Event types to receive. Default: all */
  eventTypes?: string[];
  /** Auto-reconnect on disconnect. Default: true */
  autoReconnect?: boolean;
}

interface UseWebSocketReturn {
  status:    ConnectionStatus;
  events:    VaelWebhookEvent[];
  lastEvent: VaelWebhookEvent | null;
  stats:     { totalAgents: number; totalActivities: number; totalPassports: number } | null;
  connect:   () => void;
  disconnect:() => void;
  clearEvents:() => void;
}

const WS_URL     = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";
const MAX_EVENTS = 50; // keep last 50 events in memory

export function useWebSocket({
  agentIds    = [],
  wallets     = [],
  eventTypes  = [],
  autoReconnect = true,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [status,    setStatus]    = useState<ConnectionStatus>("disconnected");
  const [events,    setEvents]    = useState<VaelWebhookEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<VaelWebhookEvent | null>(null);
  const [stats,     setStats]     = useState<any>(null);

  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");

      // Send subscriptions
      if (agentIds.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe:agent", agentIds }));
      }
      if (wallets.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe:wallet", wallets }));
      }
      if (eventTypes.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe:events", events: eventTypes }));
      }
      if (agentIds.length === 0 && wallets.length === 0) {
        ws.send(JSON.stringify({ type: "subscribe:all" }));
      }
    };

    ws.onmessage = (msg) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "event" && data.event) {
          const event = data.event as VaelWebhookEvent;
          setLastEvent(event);
          setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));
        }

        if (data.type === "stats") {
          setStats(data.data);
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      if (autoReconnect) {
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
    };
  }, [agentIds.join(), wallets.join(), eventTypes.join(), autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect]);

  return { status, events, lastEvent, stats, connect, disconnect, clearEvents };
}

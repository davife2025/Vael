export interface VaelWebhookEvent {
  id:        string;
  type:      string;
  timestamp: number;
  agentId?:  string;
  data:      Record<string, unknown>;
}

export const EVENT_ICONS: Record<string, string> = {
  "agent.registered":    "🤖",
  "agent.deactivated":   "💤",
  "agent.reactivated":   "⚡",
  "activity.logged":     "📝",
  "passport.issued":     "🪪",
  "reputation.updated":  "⭐",
  "stake.placed":        "💎",
  "stake.withdrawn":     "↩️",
  "task.posted":         "📋",
  "task.assigned":       "🤝",
  "task.completed":      "✅",
  "task.settled":        "💰",
  "task.disputed":       "⚖️",
  "condition.triggered": "⚡",
  "memory.set":          "🧠",
};

export const EVENT_COLORS: Record<string, string> = {
  "agent.registered":    "#4ade80",
  "agent.deactivated":   "#9090b0",
  "agent.reactivated":   "#4ade80",
  "activity.logged":     "#7c6fff",
  "passport.issued":     "#fbbf24",
  "reputation.updated":  "#f472b6",
  "stake.placed":        "#2dd4bf",
  "stake.withdrawn":     "#9090b0",
  "task.posted":         "#60a5fa",
  "task.assigned":       "#7c6fff",
  "task.completed":      "#4ade80",
  "task.settled":        "#2dd4bf",
  "task.disputed":       "#f87171",
  "condition.triggered": "#fbbf24",
  "memory.set":          "#a78bfa",
};

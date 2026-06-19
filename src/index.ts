import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { registerWebSocketRoute } from "./routes/websocket.js";

const wss = new WebSocketServer({ noServer: true });

registerWebSocketRoute(app, upgradeWebSocket);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    websocket: {
      server: wss,
    },
  },
  (info) => {
    console.log(`Backend is running on http://localhost:${info.port}`);
    console.log(`API docs are available at http://localhost:${info.port}/api/docs`);
    console.log(`WebSocket endpoint is available at ws://localhost:${info.port}/ws`);
  },
);

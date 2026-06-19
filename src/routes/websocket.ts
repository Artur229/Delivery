import type { UpgradeWebSocket } from "hono/ws";
import type { WebSocketLike } from "@hono/node-server";
import { isRole } from "../constants/roles.js";
import { verifyAuthToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import {
  getRealtimeClientCount,
  registerRealtimeClient,
} from "../lib/realtime.js";
import type { app } from "../app.js";

type App = typeof app;

export const registerWebSocketRoute = (
  targetApp: App,
  upgradeWebSocket: UpgradeWebSocket<WebSocketLike, { onError: (err: unknown) => void }>,
) => {
  targetApp.get(
    "/ws",
    upgradeWebSocket(async (c) => {
      const token = c.req.query("token");

      if (!token) {
        return {
          onOpen: (_event, ws) => {
            ws.close(1008, "Access token is required");
          },
        };
      }

      try {
        const payload = await verifyAuthToken(token, "access");
        const role = payload.role;

        if (!isRole(role)) {
          return {
            onOpen: (_event, ws) => {
              ws.close(1008, "Invalid role");
            },
          };
        }

        let unregister = () => {};

        return {
          onOpen: (_event, ws) => {
            const client = {
              userId: payload.sub,
              role,
              ws,
            };
            unregister = registerRealtimeClient(client);
            ws.send(
              JSON.stringify({
                event: "connected",
                payload: {
                  userId: client.userId,
                  role: client.role,
                },
                sentAt: new Date().toISOString(),
              }),
            );
            logger.info("system", "websocket connected", {
              userId: payload.sub,
              role,
              clients: getRealtimeClientCount(),
            });
          },
          onMessage: (event, ws) => {
            if (event.data === "ping") {
              ws.send(
                JSON.stringify({
                  event: "pong",
                  payload: {},
                  sentAt: new Date().toISOString(),
                }),
              );
            }
          },
          onClose: () => {
            unregister();
            logger.info("system", "websocket disconnected", {
              userId: payload.sub,
              role,
              clients: getRealtimeClientCount(),
            });
          },
          onError: () => {
            unregister();
          },
        };
      } catch {
        return {
          onOpen: (_event, ws) => {
            ws.close(1008, "Invalid or expired token");
          },
        };
      }
    }),
  );
};

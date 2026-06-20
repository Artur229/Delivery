import type { WebSocketLike } from "@hono/node-server";
import type { WSContext } from "hono/ws";
import type { Role } from "../constants/roles.js";

export type RealtimeEvent = "cart_updated" | "order_updated" | "order_cancelled" | "new_message";

type RealtimeClient = {
  userId: string;
  role: Role;
  ws: WSContext<WebSocketLike>;
};

type RealtimeMessage = {
  event: RealtimeEvent;
  payload: unknown;
  sentAt: string;
};

const clients = new Set<RealtimeClient>();
const clientsByUserId = new Map<string, Set<RealtimeClient>>();
const clientsByRole = new Map<Role, Set<RealtimeClient>>();

const addToIndex = <Key>(
  index: Map<Key, Set<RealtimeClient>>,
  key: Key,
  client: RealtimeClient,
) => {
  const existingClients = index.get(key) ?? new Set<RealtimeClient>();
  existingClients.add(client);
  index.set(key, existingClients);
};

const removeFromIndex = <Key>(
  index: Map<Key, Set<RealtimeClient>>,
  key: Key,
  client: RealtimeClient,
) => {
  const existingClients = index.get(key);

  if (!existingClients) {
    return;
  }

  existingClients.delete(client);

  if (existingClients.size === 0) {
    index.delete(key);
  }
};

export const registerRealtimeClient = (client: RealtimeClient) => {
  clients.add(client);
  addToIndex(clientsByUserId, client.userId, client);
  addToIndex(clientsByRole, client.role, client);

  return () => unregisterRealtimeClient(client);
};

export const unregisterRealtimeClient = (client: RealtimeClient) => {
  clients.delete(client);
  removeFromIndex(clientsByUserId, client.userId, client);
  removeFromIndex(clientsByRole, client.role, client);
};

const sendMessage = (client: RealtimeClient, message: RealtimeMessage) => {
  if (client.ws.readyState !== 1) {
    unregisterRealtimeClient(client);
    return;
  }

  try {
    client.ws.send(JSON.stringify(message));
  } catch {
    unregisterRealtimeClient(client);
  }
};

const sendToClients = (
  targetClients: Iterable<RealtimeClient>,
  event: RealtimeEvent,
  payload: unknown,
) => {
  const message = {
    event,
    payload,
    sentAt: new Date().toISOString(),
  };

  for (const client of targetClients) {
    sendMessage(client, message);
  }
};

export const sendToUser = (
  userId: string,
  event: RealtimeEvent,
  payload: unknown,
) => {
  sendToClients(clientsByUserId.get(userId) ?? [], event, payload);
};

export const sendToRoles = (
  roles: Role[],
  event: RealtimeEvent,
  payload: unknown,
) => {
  const targetClients = new Set<RealtimeClient>();

  for (const role of roles) {
    for (const client of clientsByRole.get(role) ?? []) {
      targetClients.add(client);
    }
  }

  sendToClients(targetClients, event, payload);
};

export const getRealtimeClientCount = () => clients.size;

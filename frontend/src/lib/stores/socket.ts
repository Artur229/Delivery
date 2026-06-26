import { env } from "$env/dynamic/public";
import { get, writable } from "svelte/store";
import { getAccessToken } from "$lib/api";
import { cartStore } from "$lib/stores/cart";
import { toastStore } from "$lib/stores/toast";
import { user } from "$lib/stores/auth";
import type { Cart, Order, Role } from "$lib/types";

export const socketConnected = writable(false);
export const realtimeOrders = writable<Order[]>([]);

let socket: WebSocket | null = null;

const orderLabel = (order: Order) => `Order #${order.id.slice(0, 8)}`;
const statusLabel = (status: Order["status"]) => status.replaceAll("_", " ");

const upsertRealtimeOrder = (order: Order) => {
  realtimeOrders.update((orders) => {
    const existing = orders.filter((item) => item.id !== order.id);
    return [order, ...existing];
  });
};

const notifyOrderUpdate = (order: Order) => {
  const currentUser = get(user);
  const role = currentUser?.role;

  if (!role || order.status === "cancelled") {
    return;
  }

  if (role === "owner" || role === "admin") {
    if (order.status === "created" || order.status === "paid") {
      toastStore.info("New order received", `${orderLabel(order)} · ₴${order.totalPrice}`);
      return;
    }

    toastStore.info("Order status changed", `${orderLabel(order)} is now ${statusLabel(order.status)}.`);
    return;
  }

  if (role === "chef") {
    if (order.status === "paid") {
      toastStore.info("New kitchen ticket", `${orderLabel(order)} is ready to start.`);
      return;
    }

    if (order.status === "cooking") {
      toastStore.info("Kitchen ticket updated", `${orderLabel(order)} is cooking.`);
      return;
    }

    if (order.status === "ready") {
      toastStore.success("Order ready", `${orderLabel(order)} is waiting for pickup.`);
    }

    return;
  }

  if (role === "courier") {
    if (order.status === "ready") {
      toastStore.info("Pickup available", `${orderLabel(order)} is ready for delivery.`);
      return;
    }

    if (order.status === "on_the_way") {
      toastStore.info("Delivery started", `${orderLabel(order)} is on the way.`);
      return;
    }

    if (order.status === "delivered") {
      toastStore.success("Delivery completed", `${orderLabel(order)} was delivered.`);
    }

    return;
  }

  if (role === "customer") {
    const messages: Partial<Record<Order["status"], [string, string]>> = {
      created: ["Order placed", `${orderLabel(order)} was created.`],
      paid: ["Payment received", `${orderLabel(order)} is waiting for the kitchen.`],
      cooking: ["Kitchen started", `${orderLabel(order)} is being prepared.`],
      ready: ["Order ready", `${orderLabel(order)} is ready for pickup or delivery.`],
      on_the_way: ["Courier on the way", `${orderLabel(order)} is heading to you.`],
      delivered: ["Delivered", `${orderLabel(order)} has been delivered.`],
    };
    const message = messages[order.status];

    if (message) {
      toastStore.info(message[0], message[1]);
    }
  }
};

const notifyOrderCancelled = (order: Order) => {
  const role = get(user)?.role as Role | undefined;

  if (!role) {
    return;
  }

  const title = role === "customer" ? "Order cancelled" : "Order was cancelled";
  toastStore.error(title, `${orderLabel(order)} is no longer active.`);
};

export const connectSocket = () => {
  const token = getAccessToken();
  const wsUrl = env.PUBLIC_WS_URL || (import.meta.env.DEV ? "ws://localhost:3000/ws" : "");

  if (!token || !wsUrl || socket?.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(`${wsUrl}?token=${token}`);

  socket.addEventListener("open", () => socketConnected.set(true));
  socket.addEventListener("close", () => socketConnected.set(false));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.event === "cart_updated") {
      cartStore.set(message.payload as Cart);
    }

    if (message.event === "order_updated") {
      const order = message.payload as Order;
      upsertRealtimeOrder(order);
      notifyOrderUpdate(order);
    }

    if (message.event === "order_cancelled") {
      const order = message.payload as Order;
      upsertRealtimeOrder(order);
      notifyOrderCancelled(order);
    }
  });
};

export const disconnectSocket = () => {
  socket?.close();
  socket = null;
  socketConnected.set(false);
};

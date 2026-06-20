import { PUBLIC_WS_URL } from "$env/static/public";
import { writable } from "svelte/store";
import { getAccessToken } from "$lib/api";
import { cartStore } from "$lib/stores/cart";
import type { Cart, Order } from "$lib/types";

export const socketConnected = writable(false);
export const realtimeOrders = writable<Order[]>([]);

let socket: WebSocket | null = null;

export const connectSocket = () => {
  const token = getAccessToken();

  if (!token || socket?.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(`${PUBLIC_WS_URL || "ws://localhost:3000/ws"}?token=${token}`);

  socket.addEventListener("open", () => socketConnected.set(true));
  socket.addEventListener("close", () => socketConnected.set(false));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.event === "cart_updated") {
      cartStore.set(message.payload as Cart);
    }

    if (message.event === "order_updated") {
      const order = message.payload as Order;
      realtimeOrders.update((orders) => {
        const existing = orders.filter((item) => item.id !== order.id);
        return [order, ...existing];
      });
    }
  });
};

export const disconnectSocket = () => {
  socket?.close();
  socket = null;
  socketConnected.set(false);
};

import { writable } from "svelte/store";
import { api } from "$lib/api";
import type { Cart } from "$lib/types";

export const cart = writable<Cart | null>(null);

export const cartStore = {
  load: async () => {
    const currentCart = await api.cart();
    cart.set(currentCart);
    return currentCart;
  },
  add: async (productSlug: string, quantity = 1) => {
    const updatedCart = await api.addCartItem({ productSlug, quantity });
    cart.set(updatedCart);
    return updatedCart;
  },
  update: async (itemId: string, quantity: number) => {
    const updatedCart = await api.updateCartItem(itemId, quantity);
    cart.set(updatedCart);
    return updatedCart;
  },
  remove: async (itemId: string) => {
    const updatedCart = await api.deleteCartItem(itemId);
    cart.set(updatedCart);
    return updatedCart;
  },
  clear: async () => {
    await api.clearCart();
    const updatedCart = await api.cart();
    cart.set(updatedCart);
    return updatedCart;
  },
  set: (value: Cart) => cart.set(value),
};

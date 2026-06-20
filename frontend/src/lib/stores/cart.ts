import { writable } from "svelte/store";
import { api, getAccessToken } from "$lib/api";
import type { Cart, CartItem } from "$lib/types";

export const cart = writable<Cart | null>(null);

const guestCartKey = "guestCart";

type GuestCartItem = {
  productSlug: string;
  quantity: number;
};

const isBrowser = () => typeof localStorage !== "undefined";
const hasToken = () => Boolean(getAccessToken());

const readGuestItems = (): GuestCartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(guestCartKey);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
};

const writeGuestItems = (items: GuestCartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(guestCartKey, JSON.stringify(items));
};

const toGuestCart = async (items: GuestCartItem[]): Promise<Cart> => {
  const products = await Promise.all(items.map((item) => api.product(item.productSlug)));
  const cartItems: CartItem[] = items.map((item, index) => {
    const product = products[index];

    return {
      id: `guest-${product.slug}`,
      productId: product.id,
      quantity: item.quantity,
      product,
    };
  });
  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + Number(item.product?.price ?? 0) * item.quantity;
  }, 0);

  return {
    id: "guest-cart",
    userId: null,
    updatedAt: new Date().toISOString(),
    items: cartItems,
    totalPrice: totalPrice.toFixed(2),
  };
};

const loadGuestCart = async () => {
  const currentCart = await toGuestCart(readGuestItems());
  cart.set(currentCart);
  return currentCart;
};

const setGuestItems = async (items: GuestCartItem[]) => {
  writeGuestItems(items);
  return loadGuestCart();
};

export const cartStore = {
  load: async () => {
    if (!hasToken()) {
      return loadGuestCart();
    }

    const currentCart = await api.cart();
    cart.set(currentCart);
    return currentCart;
  },
  add: async (productSlug: string, quantity = 1) => {
    if (!hasToken()) {
      const items = readGuestItems();
      const existing = items.find((item) => item.productSlug === productSlug);

      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({ productSlug, quantity });
      }

      return setGuestItems(items);
    }

    const updatedCart = await api.addCartItem({ productSlug, quantity });
    cart.set(updatedCart);
    return updatedCart;
  },
  update: async (itemId: string, quantity: number) => {
    if (!hasToken()) {
      const productSlug = itemId.replace(/^guest-/, "");
      const items = readGuestItems().map((item) =>
        item.productSlug === productSlug ? { ...item, quantity } : item,
      );
      return setGuestItems(items);
    }

    const updatedCart = await api.updateCartItem(itemId, quantity);
    cart.set(updatedCart);
    return updatedCart;
  },
  remove: async (itemId: string) => {
    if (!hasToken()) {
      const productSlug = itemId.replace(/^guest-/, "");
      return setGuestItems(readGuestItems().filter((item) => item.productSlug !== productSlug));
    }

    const updatedCart = await api.deleteCartItem(itemId);
    cart.set(updatedCart);
    return updatedCart;
  },
  clear: async () => {
    if (!hasToken()) {
      return setGuestItems([]);
    }

    await api.clearCart();
    const updatedCart = await api.cart();
    cart.set(updatedCart);
    return updatedCart;
  },
  set: (value: Cart) => cart.set(value),
  guestItems: () => readGuestItems(),
};

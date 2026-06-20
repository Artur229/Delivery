import { cartStore } from "$lib/stores/cart";
import { toastStore } from "$lib/stores/toast";
import type { Product } from "$lib/types";

export const addProductToCart = async (product: Pick<Product, "slug" | "name">) => {
  try {
    await cartStore.add(product.slug);
    toastStore.success("Added to basket", `${product.name} is waiting in your cart.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add this item.";
    toastStore.error("Cart needs attention", message);
  }
};

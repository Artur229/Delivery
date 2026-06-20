import { PUBLIC_API_URL } from "$env/static/public";
import type {
  AuthResponse,
  Cart,
  Category,
  Order,
  Product,
  Review,
  Tag,
  User,
} from "$lib/types";

const baseUrl = PUBLIC_API_URL || "http://localhost:3000";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const getToken = () => {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem("accessToken");
};

export const setAuthTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearAuthTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getAccessToken = () => getToken();

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiClientError(data?.error ?? "Request failed", data?.code ?? response.status);
  }

  return data as T;
};

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) =>
    apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => apiFetch<User>("/me"),
  categories: () => apiFetch<{ categories: Category[] }>("/categories"),
  tags: () => apiFetch<{ tags: Tag[] }>("/tags"),
  products: () => apiFetch<{ products: Product[] }>("/products"),
  product: (slug: string) => apiFetch<Product>(`/products/${slug}`),
  productIngredients: (slug: string) =>
    apiFetch<{ ingredients: Product["ingredients"] }>(`/products/${slug}/ingredients`),
  productReviews: (slug: string) =>
    apiFetch<{ reviews: Review[] }>(`/products/${slug}/reviews`),
  createReview: (slug: string, body: { rating: number; text: string }) =>
    apiFetch<Review>(`/products/${slug}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  cart: () => apiFetch<Cart>("/cart"),
  addCartItem: (body: { productSlug: string; quantity: number }) =>
    apiFetch<Cart>("/cart/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCartItem: (itemId: string, quantity: number) =>
    apiFetch<Cart>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  deleteCartItem: (itemId: string) =>
    apiFetch<Cart>(`/cart/items/${itemId}`, {
      method: "DELETE",
    }),
  clearCart: () =>
    apiFetch<{ success: true }>("/cart", {
      method: "DELETE",
    }),
  createOrder: (body: {
    deliveryType: "delivery" | "pickup";
    address?: string | null;
    phone?: string | null;
    paymentType: "cash" | "card";
  }) =>
    apiFetch<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  orders: () => apiFetch<{ orders: Order[] }>("/orders"),
  checkout: (orderId: string) =>
    apiFetch<{ checkoutUrl: string; sessionId: string }>(`/payments/checkout/${orderId}`, {
      method: "POST",
    }),
};

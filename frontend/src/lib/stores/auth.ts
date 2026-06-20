import { writable } from "svelte/store";
import { api, clearAuthTokens, setAuthTokens } from "$lib/api";
import type { AuthResponse, User } from "$lib/types";

export const user = writable<User | null>(null);
export const authLoading = writable(false);

const applyAuth = (response: AuthResponse) => {
  setAuthTokens(response.accessToken, response.refreshToken);
  user.set(response.user);
};

export const authStore = {
  login: async (email: string, password: string) => {
    authLoading.set(true);
    try {
      const response = await api.login({ email, password });
      applyAuth(response);
      return response.user;
    } finally {
      authLoading.set(false);
    }
  },
  register: async (body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => {
    authLoading.set(true);
    try {
      const response = await api.register(body);
      applyAuth(response);
      return response.user;
    } finally {
      authLoading.set(false);
    }
  },
  loadMe: async () => {
    try {
      const currentUser = await api.me();
      user.set(currentUser);
      return currentUser;
    } catch {
      clearAuthTokens();
      user.set(null);
      return null;
    }
  },
  logout: () => {
    clearAuthTokens();
    user.set(null);
  },
};

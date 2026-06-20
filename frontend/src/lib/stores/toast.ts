import { writable } from "svelte/store";

export type ToastTone = "success" | "error" | "info";

export type Toast = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

const toasts = writable<Toast[]>([]);
let nextToastId = 1;

const remove = (id: number) => {
  toasts.update((items) => items.filter((item) => item.id !== id));
};

const push = (toast: Omit<Toast, "id">) => {
  const id = nextToastId++;
  toasts.update((items) => [{ ...toast, id }, ...items].slice(0, 4));
  window.setTimeout(() => remove(id), 3600);
};

export const toastStore = {
  subscribe: toasts.subscribe,
  success: (title: string, message?: string) => push({ title, message, tone: "success" }),
  error: (title: string, message?: string) => push({ title, message, tone: "error" }),
  info: (title: string, message?: string) => push({ title, message, tone: "info" }),
  remove,
};

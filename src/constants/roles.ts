export const roles = ["owner", "admin", "customer", "chef", "courier"] as const;

export type Role = (typeof roles)[number];

export const roleSet = new Set<string>(roles);

export const isRole = (value: string): value is Role => roleSet.has(value);

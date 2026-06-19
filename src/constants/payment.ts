export const paymentTypes = ["cash", "card"] as const;

export const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;

export type PaymentType = (typeof paymentTypes)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

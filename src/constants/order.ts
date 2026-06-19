export const orderStatuses = [
  "created",
  "paid",
  "cooking",
  "ready",
  "on_the_way",
  "delivered",
] as const;

export const deliveryTypes = ["delivery", "pickup"] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type DeliveryType = (typeof deliveryTypes)[number];

export type Role = "owner" | "admin" | "customer" | "chef" | "courier";

export type User = {
  id: string;
  name: string;
  slug: string;
  email: string;
  role: Role;
  cover: string | null;
  phone: string | null;
  address: string | null;
  isBlockedFromReviews: boolean | null;
  createdAt: string | null;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  description: string | null;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  price: string;
  description: string | null;
  categories?: Category[];
  tags?: Tag[];
  ingredients?: Ingredient[];
};

export type InventoryItem = {
  id: string;
  name: string;
  slug: string;
  quantity: string;
  unit: string;
  cover: string | null;
  updatedAt: string | null;
};

export type Ingredient = {
  id: string;
  productId: string | null;
  name: string;
  quantity: string;
  unit: string;
};

export type CartItem = {
  id: string;
  productId: string | null;
  quantity: number;
  product: Product | null;
};

export type Cart = {
  id: string;
  userId: string | null;
  updatedAt: string | null;
  items: CartItem[];
  totalPrice: string;
};

export type OrderStatus =
  | "created"
  | "paid"
  | "cooking"
  | "ready"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  userId: string | null;
  totalPrice: string;
  status: OrderStatus;
  deliveryType: "delivery" | "pickup";
  address: string | null;
  phone: string | null;
  paymentType: "cash" | "card";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  createdAt: string | null;
  items: Array<{
    id: string;
    productId: string | null;
    quantity: number;
    price: string;
    product: Pick<Product, "id" | "name" | "slug" | "cover"> | null;
  }>;
};

export type Review = {
  id: string;
  userId: string | null;
  productId: string | null;
  rating: number;
  text: string;
  createdAt: string | null;
  user: Pick<User, "id" | "name" | "slug" | "cover" | "role"> | null;
};

export type ApiError = {
  error: string;
  code: number;
};

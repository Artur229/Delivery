import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { deliveryTypes, orderStatuses } from "../constants/order.js";
import { paymentStatuses, paymentTypes } from "../constants/payment.js";
import { roles } from "../constants/roles.js";

export const roleEnum = pgEnum("role", roles);
export const orderStatusEnum = pgEnum("order_status", orderStatuses);
export const deliveryTypeEnum = pgEnum("delivery_type", deliveryTypes);
export const paymentTypeEnum = pgEnum("payment_type", paymentTypes);
export const paymentStatusEnum = pgEnum("payment_status", paymentStatuses);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  cover: text("cover"),
  phone: text("phone"),
  address: text("address"),
  isBlockedFromReviews: boolean("is_blocked_from_reviews").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  cover: text("cover"),
  description: text("description"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  cover: text("cover"),
  price: numeric("price").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
});

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.categoryId],
    }),
  ],
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.tagId],
    }),
  ],
);

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  cover: text("cover"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  totalPrice: numeric("total_price").notNull(),
  status: orderStatusEnum("status").notNull(),
  deliveryType: deliveryTypeEnum("delivery_type").notNull(),
  address: text("address"),
  phone: text("phone"),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, {
    onDelete: "cascade",
  }),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    productId: uuid("product_id").references(() => products.id),
    rating: integer("rating").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("reviews_user_product_unique").on(table.userId, table.productId),
  ],
);

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique().references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
});

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  refreshTokens: many(refreshTokens),
  products: many(products),
  orders: many(orders),
  reviews: many(reviews),
  cart: one(carts),
  chats: many(chats),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  productCategories: many(productCategories),
  productTags: many(productTags),
  ingredients: many(ingredients),
  orderItems: many(orderItems),
  reviews: many(reviews),
  cartItems: many(cartItems),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  productTags: many(productTags),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  product: one(products, {
    fields: [ingredients.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

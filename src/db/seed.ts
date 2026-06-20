import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  categories,
  inventory,
  productCategories,
  products,
  productTags,
  tags,
  users,
} from "./schema.js";
import { db } from "./client.js";
import { hashPassword } from "../lib/password.js";
import { createSlug } from "../lib/slug.js";
import type { Role } from "../constants/roles.js";

const defaultPassword = "Password123!";

const seedUsers: Array<{
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
}> = [
  {
    name: "Delivery Owner",
    email: "owner@delivery.test",
    role: "owner",
    phone: "+380000000001",
    address: "Kyiv, Main office",
  },
  { name: "Admin One", email: "admin1@delivery.test", role: "admin" },
  { name: "Admin Two", email: "admin2@delivery.test", role: "admin" },
  { name: "Chef One", email: "chef1@delivery.test", role: "chef" },
  { name: "Chef Two", email: "chef2@delivery.test", role: "chef" },
  { name: "Courier One", email: "courier1@delivery.test", role: "courier" },
  { name: "Courier Two", email: "courier2@delivery.test", role: "courier" },
  { name: "Courier Three", email: "courier3@delivery.test", role: "courier" },
  { name: "Courier Four", email: "courier4@delivery.test", role: "courier" },
  { name: "Customer One", email: "customer1@delivery.test", role: "customer" },
  { name: "Customer Two", email: "customer2@delivery.test", role: "customer" },
  { name: "Customer Three", email: "customer3@delivery.test", role: "customer" },
  { name: "Customer Four", email: "customer4@delivery.test", role: "customer" },
  { name: "Customer Five", email: "customer5@delivery.test", role: "customer" },
  { name: "Customer Six", email: "customer6@delivery.test", role: "customer" },
  { name: "Customer Seven", email: "customer7@delivery.test", role: "customer" },
  { name: "Customer Eight", email: "customer8@delivery.test", role: "customer" },
  { name: "Customer Nine", email: "customer9@delivery.test", role: "customer" },
  { name: "Customer Ten", email: "customer10@delivery.test", role: "customer" },
];

const seedCategories = [
  {
    name: "Pizza",
    cover: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    description: "Classic and signature pizzas.",
  },
  {
    name: "Burgers",
    cover: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    description: "Juicy burgers with fresh toppings.",
  },
  {
    name: "Sushi",
    cover: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c",
    description: "Rolls, nigiri, and sets.",
  },
  {
    name: "Salads",
    cover: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    description: "Fresh salads and bowls.",
  },
  {
    name: "Drinks",
    cover: "https://images.unsplash.com/photo-1544145945-f90425340c7e",
    description: "Cold drinks and lemonades.",
  },
];

const seedTags = [
  "spicy",
  "vegan",
  "new",
  "popular",
  "kids",
  "gluten-free",
  "discount",
  "premium",
];

const seedInventory = [
  { name: "Pizza Dough", quantity: "80", unit: "pcs" },
  { name: "Mozzarella", quantity: "25", unit: "kg" },
  { name: "Tomato Sauce", quantity: "18", unit: "kg" },
  { name: "Beef Patty", quantity: "60", unit: "pcs" },
  { name: "Burger Bun", quantity: "90", unit: "pcs" },
  { name: "Salmon", quantity: "12", unit: "kg" },
  { name: "Rice", quantity: "30", unit: "kg" },
  { name: "Lettuce", quantity: "15", unit: "kg" },
  { name: "Lemon", quantity: "120", unit: "pcs" },
  { name: "Cola", quantity: "140", unit: "bottles" },
];

const seedProducts = [
  {
    name: "Margherita Pizza",
    price: "245.00",
    categorySlugs: ["pizza"],
    tagSlugs: ["popular", "kids"],
  },
  {
    name: "Pepperoni Pizza",
    price: "295.00",
    categorySlugs: ["pizza"],
    tagSlugs: ["popular", "spicy"],
  },
  {
    name: "Four Cheese Pizza",
    price: "325.00",
    categorySlugs: ["pizza"],
    tagSlugs: ["premium"],
  },
  {
    name: "Classic Burger",
    price: "220.00",
    categorySlugs: ["burgers"],
    tagSlugs: ["popular"],
  },
  {
    name: "Double Beef Burger",
    price: "310.00",
    categorySlugs: ["burgers"],
    tagSlugs: ["premium"],
  },
  {
    name: "Vegan Burger",
    price: "240.00",
    categorySlugs: ["burgers"],
    tagSlugs: ["vegan", "new"],
  },
  {
    name: "Philadelphia Roll",
    price: "330.00",
    categorySlugs: ["sushi"],
    tagSlugs: ["popular"],
  },
  {
    name: "Dragon Roll",
    price: "390.00",
    categorySlugs: ["sushi"],
    tagSlugs: ["premium", "spicy"],
  },
  {
    name: "Avocado Maki",
    price: "170.00",
    categorySlugs: ["sushi"],
    tagSlugs: ["vegan"],
  },
  {
    name: "Caesar Salad",
    price: "210.00",
    categorySlugs: ["salads"],
    tagSlugs: ["popular"],
  },
  {
    name: "Greek Salad",
    price: "190.00",
    categorySlugs: ["salads"],
    tagSlugs: ["gluten-free"],
  },
  {
    name: "Green Bowl",
    price: "230.00",
    categorySlugs: ["salads"],
    tagSlugs: ["vegan", "new"],
  },
  {
    name: "Homemade Lemonade",
    price: "95.00",
    categorySlugs: ["drinks"],
    tagSlugs: ["kids"],
  },
  {
    name: "Cola",
    price: "65.00",
    categorySlugs: ["drinks"],
    tagSlugs: ["discount"],
  },
  {
    name: "Berry Iced Tea",
    price: "105.00",
    categorySlugs: ["drinks"],
    tagSlugs: ["new"],
  },
];

const upsertUsers = async () => {
  const passwordHash = await hashPassword(defaultPassword);

  await db
    .insert(users)
    .values(
      seedUsers.map((user) => ({
        ...user,
        slug: createSlug(user.name),
        passwordHash,
        cover: null,
        isBlockedFromReviews: false,
      })),
    )
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
      },
    });
};

const upsertCategories = async () => {
  await db
    .insert(categories)
    .values(
      seedCategories.map((category) => ({
        ...category,
        slug: createSlug(category.name),
      })),
    )
    .onConflictDoNothing();
};

const upsertTags = async () => {
  await db
    .insert(tags)
    .values(seedTags.map((tag) => ({ name: tag, slug: createSlug(tag) })))
    .onConflictDoNothing();
};

const upsertInventory = async () => {
  await db
    .insert(inventory)
    .values(
      seedInventory.map((item) => ({
        ...item,
        slug: createSlug(item.name),
        updatedAt: new Date(),
      })),
    )
    .onConflictDoNothing();
};

const getUserByEmail = async (email: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error(`Seed user not found: ${email}`);
  }

  return user;
};

const upsertProducts = async () => {
  const owner = await getUserByEmail("owner@delivery.test");

  await db
    .insert(products)
    .values(
      seedProducts.map((product) => ({
        name: product.name,
        slug: createSlug(product.name),
        cover: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        price: product.price,
        description: `${product.name} from the seeded delivery menu.`,
        createdBy: owner.id,
      })),
    )
    .onConflictDoNothing();
};

const getCategoryBySlug = async (slug: string) => {
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });

  if (!category) {
    throw new Error(`Seed category not found: ${slug}`);
  }

  return category;
};

const getProductBySlug = async (slug: string) => {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  if (!product) {
    throw new Error(`Seed product not found: ${slug}`);
  }

  return product;
};

const getTagBySlug = async (slug: string) => {
  const tag = await db.query.tags.findFirst({
    where: eq(tags.slug, slug),
  });

  if (!tag) {
    throw new Error(`Seed tag not found: ${slug}`);
  }

  return tag;
};

const linkProducts = async () => {
  for (const seedProduct of seedProducts) {
    const product = await getProductBySlug(createSlug(seedProduct.name));

    for (const categorySlug of seedProduct.categorySlugs) {
      const category = await getCategoryBySlug(categorySlug);

      await db
        .insert(productCategories)
        .values({
          productId: product.id,
          categoryId: category.id,
        })
        .onConflictDoNothing();
    }

    for (const tagSlug of seedProduct.tagSlugs) {
      const tag = await getTagBySlug(tagSlug);

      await db
        .insert(productTags)
        .values({
          productId: product.id,
          tagId: tag.id,
        })
        .onConflictDoNothing();
    }
  }
};

const main = async () => {
  await upsertUsers();
  await upsertCategories();
  await upsertTags();
  await upsertInventory();
  await upsertProducts();
  await linkProducts();

  console.log("Seed completed");
  console.log(`Seed users password: ${defaultPassword}`);
};

await main();

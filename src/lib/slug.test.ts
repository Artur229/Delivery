import { describe, expect, it } from "vitest";
import { createSlug, createUniqueSlug } from "./slug.js";

describe("slug utilities", () => {
  it("creates lowercase URL-safe slugs", () => {
    expect(createSlug("  Spicy Chicken Pizza!!  ")).toBe("spicy-chicken-pizza");
  });

  it("removes accents and collapses separators", () => {
    expect(createSlug("Crème   brûlée -- Cake")).toBe("creme-brulee-cake");
  });

  it("falls back to item and increments until slug is unique", async () => {
    const existingSlugs = new Set(["item", "item-1", "item-2"]);

    await expect(
      createUniqueSlug("!!!", async (slug) => existingSlugs.has(slug)),
    ).resolves.toBe("item-3");
  });
});

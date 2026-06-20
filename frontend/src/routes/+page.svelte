<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowRight } from "@lucide/svelte";
  import ProductCard from "$lib/components/ProductCard.svelte";
  import { api } from "$lib/api";
  import { addProductToCart } from "$lib/cart-actions";
  import type { Category, Product } from "$lib/types";

  let products: Product[] = [];
  let categories: Category[] = [];
  let error = "";

  onMount(async () => {
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        api.products(),
        api.categories(),
      ]);
      products = productResponse.products;
      categories = categoryResponse.categories;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load menu";
    }
  });
</script>

<main>
  <section class="hero page-shell">
    <div class="hero-copy">
      <span class="label">Artisanal provisions</span>
      <h1 class="display">Food with a maker's hand.</h1>
      <p class="body-lg">
        Fresh favorites, thoughtful recipes, and simple ordering for slow evenings,
        quick lunches, and everything in between.
      </p>
      <div class="hero-actions">
        <a class="primary-button" href="/catalog">
          Explore catalog <ArrowRight size={18} />
        </a>
        <a class="secondary-button" href="/register">Join the table</a>
      </div>
    </div>
    <div class="hero-image rough-image">
      <img
        src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80"
        alt="Editorial pizza on a warm table"
      />
    </div>
  </section>

  <section class="page-shell category-strip">
    {#each categories as category}
      <a class="chip" href={`/catalog?category=${category.slug}`}>{category.name}</a>
    {/each}
  </section>

  <section class="page-shell featured">
    <div class="section-heading">
      <span class="label">Seasonal edits</span>
      <h2 class="headline">Curated from the kitchen</h2>
    </div>
    {#if error}
      <p class="form-error">{error}</p>
    {:else if products[0]}
      <ProductCard product={products[0]} featured onAdd={addProductToCart} />
    {/if}
    <div class="product-grid">
      {#each products.slice(1, 7) as product}
        <ProductCard {product} onAdd={addProductToCart} />
      {/each}
    </div>
  </section>
</main>

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
    gap: 40px;
    align-items: center;
    padding: 72px 0 56px;
  }

  .hero-copy {
    position: relative;
    z-index: 2;
  }

  .hero-copy p {
    max-width: 620px;
    margin: 24px 0 0;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 34px;
  }

  .hero-image {
    height: min(68vh, 680px);
  }

  .hero-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .category-strip {
    display: flex;
    flex-wrap: wrap;
    border-block: 1px solid rgba(124, 87, 48, 0.18);
    gap: 12px;
    padding: 24px 0;
  }

  .featured {
    padding-top: 72px;
  }

  .section-heading {
    margin-bottom: 36px;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 34px 24px;
    margin-top: 56px;
  }

  @media (max-width: 900px) {
    .hero,
    .product-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

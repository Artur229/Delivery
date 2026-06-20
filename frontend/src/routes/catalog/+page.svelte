<script lang="ts">
  import { onMount } from "svelte";
  import ProductCard from "$lib/components/ProductCard.svelte";
  import { api } from "$lib/api";
  import { cartStore } from "$lib/stores/cart";
  import type { Category, Product, Tag } from "$lib/types";

  let products: Product[] = [];
  let categories: Category[] = [];
  let tags: Tag[] = [];
  let activeCategory = "all";
  let error = "";

  $: filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((product) =>
          product.categories?.some((category) => category.slug === activeCategory),
        );

  onMount(async () => {
    try {
      const [productResponse, categoryResponse, tagResponse] = await Promise.all([
        api.products(),
        api.categories(),
        api.tags(),
      ]);
      products = productResponse.products;
      categories = categoryResponse.categories;
      tags = tagResponse.tags;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load catalog";
    }
  });
</script>

<main class="page-shell catalog">
  <header class="catalog-head">
    <div>
      <span class="label">Artisanal selection</span>
      <h1 class="display">The collection</h1>
      <p class="body-lg">Filter the seeded Supabase menu by category and send favorites to your live cart.</p>
    </div>
    <div class="filters">
      <button class:active={activeCategory === "all"} on:click={() => (activeCategory = "all")}>All</button>
      {#each categories as category}
        <button
          class:active={activeCategory === category.slug}
          on:click={() => (activeCategory = category.slug)}
        >
          {category.name}
        </button>
      {/each}
    </div>
  </header>

  <div class="tag-row">
    {#each tags as tag}
      <span class="chip">{tag.name}</span>
    {/each}
  </div>

  {#if error}
    <p class="form-error">{error}</p>
  {:else}
    <section class="product-grid">
      {#each filteredProducts as product}
        <ProductCard {product} onAdd={(slug) => cartStore.add(slug)} />
      {/each}
    </section>
  {/if}
</main>

<style>
  .catalog {
    padding-top: 64px;
  }

  .catalog-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.5fr);
    gap: 32px;
    align-items: end;
    border-bottom: 1px solid rgba(124, 87, 48, 0.18);
    padding-bottom: 34px;
  }

  .catalog-head p {
    max-width: 680px;
    margin-top: 18px;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .filters button {
    border: 1px solid rgba(124, 87, 48, 0.24);
    border-radius: 999px;
    background: var(--surface-container);
    color: var(--muted);
    cursor: pointer;
    font-family: "Space Mono", monospace;
    font-size: 0.75rem;
    padding: 0.58rem 0.85rem;
    text-transform: uppercase;
  }

  .filters button.active {
    background: var(--secondary);
    color: white;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 24px 0 48px;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 36px 24px;
  }

  @media (max-width: 900px) {
    .catalog-head,
    .product-grid {
      grid-template-columns: 1fr;
    }

    .filters {
      justify-content: flex-start;
    }
  }
</style>

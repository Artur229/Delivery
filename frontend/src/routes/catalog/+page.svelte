<script lang="ts">
  import { onMount } from "svelte";
  import ProductCard from "$lib/components/ProductCard.svelte";
  import { api } from "$lib/api";
  import { addProductToCart } from "$lib/cart-actions";
  import type { Category, Product, Tag } from "$lib/types";

  let products: Product[] = [];
  let categories: Category[] = [];
  let tags: Tag[] = [];
  let activeCategory = "all";
  let activeTag = "all";
  let sortKey = "featured";
  let error = "";

  $: filteredProducts = products.filter((product) => {
    const categoryMatches =
      activeCategory === "all" ||
      product.categories?.some((category) => category.slug === activeCategory);
    const tagMatches =
      activeTag === "all" || product.tags?.some((tag) => tag.slug === activeTag);

    return categoryMatches && tagMatches;
  });
  $: sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortKey === "price-low") {
      return Number(a.price) - Number(b.price);
    }

    if (sortKey === "price-high") {
      return Number(b.price) - Number(a.price);
    }

    if (sortKey === "name") {
      return a.name.localeCompare(b.name);
    }

    return 0;
  });

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
      const categoryFromUrl = new URLSearchParams(window.location.search).get("category");
      if (categoryFromUrl) {
        activeCategory = categoryFromUrl;
      }
      const tagFromUrl = new URLSearchParams(window.location.search).get("tag");
      if (tagFromUrl) {
        activeTag = tagFromUrl;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load catalog";
    }
  });

  const toggleTag = (slug: string) => {
    activeTag = activeTag === slug ? "all" : slug;
  };

  const clearFilters = () => {
    activeCategory = "all";
    activeTag = "all";
  };
</script>

<main class="page-shell catalog">
  <header class="catalog-head">
    <div>
      <span class="label">Artisanal selection</span>
      <h1 class="display">The collection</h1>
      <p class="body-lg">Choose by craving, mood, or price, then send your favorites straight to the basket.</p>
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

  <div class="catalog-tools">
    <div class="tag-row">
      {#each tags as tag}
        <button
          class:active={activeTag === tag.slug}
          class="chip tag-chip"
          on:click={() => toggleTag(tag.slug)}
        >
          {tag.name}
        </button>
      {/each}
    </div>
    <label class="sort-control">
      <span class="label">Sort</span>
      <select bind:value={sortKey}>
        <option value="featured">Featured first</option>
        <option value="price-low">Price: low to high</option>
        <option value="price-high">Price: high to low</option>
        <option value="name">Name A-Z</option>
      </select>
    </label>
  </div>

  {#if error}
    <p class="form-error">{error}</p>
  {:else}
    <p class="result-count">{sortedProducts.length} pieces in this edit</p>
    {#if sortedProducts.length === 0}
      <section class="empty-state paper">
        <span class="label">No matches</span>
        <h2 class="headline">Nothing in this exact edit yet.</h2>
        <p class="body-lg">
          This category and tag combination has no dishes right now. Try another tag or reset the filters.
        </p>
        <button class="primary-button" on:click={clearFilters}>Reset filters</button>
      </section>
    {:else}
      <section class="product-grid">
        {#each sortedProducts as product}
          <ProductCard {product} onAdd={addProductToCart} />
        {/each}
      </section>
    {/if}
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
    font-family: var(--font-body);
    font-size: 0.75rem;
    padding: 0.58rem 0.85rem;
    text-transform: uppercase;
  }

  .filters button.active {
    background: var(--secondary);
    color: white;
  }

  .catalog-tools {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
    margin: 24px 0 34px;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tag-chip {
    border: 0;
    cursor: pointer;
    transition:
      background 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .tag-chip:hover {
    transform: translateY(-1px);
  }

  .tag-chip.active {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .sort-control {
    display: grid;
    min-width: 220px;
    gap: 8px;
  }

  .sort-control select {
    border: 1px solid rgba(124, 87, 48, 0.28);
    border-radius: 14px;
    background: var(--surface-container);
    color: var(--primary);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.78rem 0.9rem;
    text-transform: uppercase;
  }

  .result-count {
    color: var(--secondary);
    font-family: var(--font-body);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    margin: 0 0 22px;
    text-transform: uppercase;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 36px 24px;
  }

  .empty-state {
    display: grid;
    max-width: 760px;
    gap: 18px;
    padding: clamp(28px, 5vw, 54px);
  }

  .empty-state h2,
  .empty-state p {
    margin: 0;
  }

  @media (max-width: 900px) {
    .catalog-head,
    .product-grid {
      grid-template-columns: 1fr;
    }

    .filters {
      justify-content: flex-start;
    }

    .catalog-tools {
      display: grid;
    }

    .sort-control {
      min-width: 0;
    }
  }
</style>

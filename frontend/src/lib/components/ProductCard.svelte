<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import type { Product } from "$lib/types";

  export let product: Product;
  export let featured = false;
  export let onAdd: ((slug: string) => void) | undefined = undefined;
</script>

<article class:featured class="product-card">
  <a class="image rough-image" href={`/catalog/${product.slug}`}>
    <img src={product.cover ?? "/food-placeholder.svg"} alt={product.name} />
  </a>
  <div class="copy organic-border">
    <span class="label">{product.tags?.[0]?.name ?? "Artisanal"}</span>
    <a href={`/catalog/${product.slug}`}>
      <h2 class={featured ? "headline" : "subhead"}>{product.name}</h2>
    </a>
    <p>{product.description ?? "A seeded kitchen favorite from our editorial menu."}</p>
    <div class="meta">
      <strong>₴{product.price}</strong>
      <button class="icon-button" aria-label={`Add ${product.name}`} on:click={() => onAdd?.(product.slug)}>
        <Plus size={18} />
      </button>
    </div>
  </div>
</article>

<style>
  .product-card {
    display: grid;
    gap: 18px;
  }

  .image {
    display: block;
    height: 320px;
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.7s ease;
  }

  .product-card:hover img {
    transform: scale(1.04);
  }

  .copy {
    margin-top: -42px;
    margin-left: 24px;
    max-width: calc(100% - 24px);
    background: rgba(250, 249, 246, 0.94);
    padding: 24px;
    position: relative;
  }

  h2 {
    margin: 0.35rem 0 0.55rem;
    color: var(--primary);
  }

  p {
    color: var(--muted);
    line-height: 1.65;
    margin: 0 0 1rem;
  }

  .meta {
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(124, 87, 48, 0.16);
    justify-content: space-between;
    padding-top: 16px;
  }

  strong {
    color: var(--primary);
    font-family: "Playfair Display", serif;
    font-size: 1.7rem;
  }

  .featured {
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
    align-items: center;
  }

  .featured .image {
    height: 460px;
  }

  .featured .copy {
    margin-left: -72px;
    margin-top: 0;
    max-width: none;
  }

  @media (max-width: 850px) {
    .featured {
      display: grid;
      grid-template-columns: 1fr;
    }

    .featured .copy,
    .copy {
      margin: -36px 0 0 20px;
      max-width: calc(100% - 20px);
    }
  }
</style>

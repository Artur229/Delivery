<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ArrowRight, Star } from "@lucide/svelte";
  import { api } from "$lib/api";
  import { cartStore } from "$lib/stores/cart";
  import type { Ingredient, Product, Review } from "$lib/types";

  let product: Product | null = null;
  let ingredients: Ingredient[] = [];
  let reviews: Review[] = [];
  let error = "";
  let reviewText = "";
  let rating = 5;

  $: slug = $page.params.slug ?? "";

  onMount(async () => {
    try {
      if (!slug) {
        return;
      }

      const [productResponse, ingredientResponse, reviewResponse] = await Promise.all([
        api.product(slug),
        api.productIngredients(slug),
        api.productReviews(slug),
      ]);
      product = productResponse;
      ingredients = ingredientResponse.ingredients ?? [];
      reviews = reviewResponse.reviews;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load product";
    }
  });

  const submitReview = async () => {
    if (!slug) {
      return;
    }

    const review = await api.createReview(slug, { rating, text: reviewText });
    reviews = [review, ...reviews];
    reviewText = "";
  };
</script>

<main class="product-page">
  {#if error}
    <p class="page-shell form-error">{error}</p>
  {:else if product}
    <section class="hero page-shell">
      <div class="image rough-image">
        <img src={product.cover ?? "/food-placeholder.svg"} alt={product.name} />
      </div>
      <div class="copy">
        <div class="chips">
          {#each product.tags ?? [] as tag}
            <span class="chip">{tag.name}</span>
          {/each}
        </div>
        <h1 class="display">{product.name}</h1>
        <p class="body-lg">{product.description}</p>
        <div class="buy-row">
          <strong>₴{product.price}</strong>
          <button class="primary-button" on:click={() => cartStore.add(product!.slug)}>
            Add to cart <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>

    <section class="page-shell detail-grid">
      <div>
        <span class="label">The maker's hand</span>
        <h2 class="headline">Composition</h2>
        <p class="body-lg">
          The backend owns product logic and pricing; the frontend turns it into a warm,
          tactile ordering surface.
        </p>
      </div>
      <div class="paper ingredient-list">
        {#each ingredients as ingredient}
          <div>
            <span class="status-dot"></span>
            <div>
              <strong>{ingredient.name}</strong>
              <p>{ingredient.quantity} {ingredient.unit}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="page-shell reviews">
      <div>
        <span class="label">Reviews</span>
        <h2 class="headline">Notes from the table</h2>
      </div>
      <form class="paper review-form" on:submit|preventDefault={submitReview}>
        <label>
          <span class="label">Rating</span>
          <input class="ink-input" bind:value={rating} type="number" min="1" max="5" />
        </label>
        <label>
          <span class="label">Your note</span>
          <textarea class="ink-input" bind:value={reviewText} rows="3"></textarea>
        </label>
        <button class="secondary-button" type="submit">
          <Star size={16} /> Publish
        </button>
      </form>
      <div class="review-list">
        {#each reviews as review}
          <article class="paper">
            <span class="label">{review.rating}/5</span>
            <p>{review.text}</p>
            <small>{review.user?.name ?? "Guest"}</small>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  .product-page {
    padding-top: 56px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: 36px;
    align-items: center;
  }

  .image {
    height: min(70vh, 720px);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    margin-left: -72px;
    background: rgba(250, 249, 246, 0.94);
    padding: 34px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .buy-row {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: 28px;
  }

  .buy-row strong {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 2.4rem;
  }

  .detail-grid,
  .reviews {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 34px;
    margin-top: 92px;
  }

  .ingredient-list,
  .review-form {
    padding: 28px;
  }

  .ingredient-list > div {
    display: flex;
    gap: 14px;
    border-bottom: 1px solid rgba(124, 87, 48, 0.14);
    padding: 18px 0;
  }

  .ingredient-list p,
  .review-list p {
    color: var(--muted);
    margin: 0.25rem 0 0;
  }

  .review-form {
    display: grid;
    gap: 22px;
  }

  .review-list {
    grid-column: 2;
    display: grid;
    gap: 14px;
  }

  .review-list article {
    padding: 20px;
  }

  small {
    color: var(--secondary);
  }

  @media (max-width: 900px) {
    .hero,
    .detail-grid,
    .reviews {
      grid-template-columns: 1fr;
    }

    .copy {
      margin: -48px 20px 0;
    }

    .review-list {
      grid-column: auto;
    }
  }
</style>

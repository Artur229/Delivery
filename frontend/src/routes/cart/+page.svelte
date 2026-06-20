<script lang="ts">
  import { goto } from "$app/navigation";
  import { Minus, Plus, Trash2 } from "@lucide/svelte";
  import { getProductImage } from "$lib/media/products";
  import { cart, cartStore } from "$lib/stores/cart";

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    cartStore.update(itemId, quantity);
  };
</script>

<main class="page-shell cart-page">
  <header>
    <span class="label">Cart</span>
    <h1 class="display">Your basket</h1>
  </header>

  {#if !$cart || $cart.items.length === 0}
    <section class="empty paper">
      <h2 class="headline">Your table is still open.</h2>
      <p class="body-lg">Explore the collection and add something handcrafted.</p>
      <a class="primary-button" href="/catalog">Browse catalog</a>
    </section>
  {:else}
    <section class="cart-grid">
      <div class="items">
        {#each $cart.items as item}
          <article class="paper cart-item">
            <img src={getProductImage(item.product)} alt={item.product?.name ?? "Cart item"} />
            <div>
              <h2 class="subhead">{item.product?.name}</h2>
              <p>₴{item.product?.price}</p>
              <div class="quantity">
                <button class="icon-button" on:click={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus size={16} />
                </button>
                <span>{item.quantity}</span>
                <button class="icon-button" on:click={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus size={16} />
                </button>
                <button class="icon-button" on:click={() => cartStore.remove(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </article>
        {/each}
      </div>
      <aside class="paper summary">
        <span class="label">Total</span>
        <strong>₴{$cart.totalPrice}</strong>
        <button class="primary-button" on:click={() => goto("/checkout")}>Checkout</button>
        <button class="secondary-button" on:click={cartStore.clear}>Clear cart</button>
      </aside>
    </section>
  {/if}
</main>

<style>
  .cart-page {
    padding-top: 64px;
  }

  header {
    border-bottom: 1px solid rgba(124, 87, 48, 0.18);
    margin-bottom: 40px;
    padding-bottom: 28px;
  }

  .cart-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
  }

  .items {
    display: grid;
    gap: 18px;
  }

  .cart-item {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 20px;
    padding: 18px;
  }

  .cart-item img {
    width: 150px;
    height: 130px;
    border-radius: 14px;
    object-fit: cover;
  }

  .cart-item p {
    color: var(--secondary);
  }

  .quantity {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .summary,
  .empty {
    display: grid;
    gap: 18px;
    padding: 28px;
  }

  .summary strong {
    color: var(--primary);
    font-family: "Playfair Display", serif;
    font-size: 3rem;
  }

  @media (max-width: 850px) {
    .cart-grid,
    .cart-item {
      grid-template-columns: 1fr;
    }

    .cart-item img {
      width: 100%;
      height: 220px;
    }
  }
</style>

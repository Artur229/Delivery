<script lang="ts">
  import { ShoppingBag, UserRound, LogOut } from "@lucide/svelte";
  import { cart } from "$lib/stores/cart";
  import { authStore, user } from "$lib/stores/auth";

  let lastCartCount = 0;
  let bumpCart = false;

  const links = [
    { href: "/", label: "Discover" },
    { href: "/catalog", label: "Catalog" },
    { href: "/orders", label: "Orders" },
  ];

  $: cartCount = $cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  $: if (cartCount > lastCartCount) {
    bumpCart = false;
    setTimeout(() => {
      bumpCart = true;
      setTimeout(() => (bumpCart = false), 520);
    });
  }
  $: lastCartCount = cartCount;
</script>

<header class="site-header">
  <div class="page-shell header-inner">
    <a class="brand" href="/">LuxeEats</a>
    <nav>
      {#each links as link}
        <a href={link.href}>{link.label}</a>
      {/each}
    </nav>
    <div class="actions">
      <a class:bump={bumpCart} class="icon-button cart-link" href="/cart" aria-label="Cart">
        <ShoppingBag size={20} />
        {#if cartCount > 0}
          <span>{cartCount}</span>
        {/if}
      </a>
      {#if $user}
        <a class="icon-button" href={`/profile/${$user.slug}`} aria-label="Profile">
          <UserRound size={20} />
        </a>
        <button class="icon-button" aria-label="Logout" on:click={authStore.logout}>
          <LogOut size={18} />
        </button>
      {:else}
        <a class="secondary-button auth-link" href="/login">Sign in</a>
      {/if}
    </div>
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 20;
    border-bottom: 1px solid rgba(124, 87, 48, 0.18);
    background: rgba(250, 249, 246, 0.9);
    backdrop-filter: blur(16px);
  }

  .header-inner {
    display: flex;
    min-height: 88px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    color: var(--primary);
    font-family: "Playfair Display", serif;
    font-size: clamp(2rem, 4vw, 4rem);
    font-weight: 700;
    line-height: 1;
  }

  nav {
    display: flex;
    gap: 28px;
    color: var(--muted);
    font-size: 0.96rem;
  }

  nav a:hover {
    color: var(--secondary);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cart-link {
    position: relative;
  }

  .cart-link.bump {
    animation: bag-bump 0.24s ease-out;
  }

  .cart-link span {
    position: absolute;
    top: -5px;
    right: -5px;
    display: grid;
    min-width: 20px;
    height: 20px;
    place-items: center;
    border-radius: 999px;
    background: var(--primary);
    color: var(--secondary-soft);
    font-family: "Space Mono", monospace;
    font-size: 0.7rem;
  }

  @keyframes bag-bump {
    0% {
      transform: translateY(0) scale(1);
    }

    50% {
      transform: translateY(-2px) scale(1.05);
    }

    100% {
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 760px) {
    .header-inner {
      min-height: 74px;
    }

    nav {
      display: none;
    }

    .auth-link {
      padding-inline: 0.75rem;
    }
  }
</style>

<script lang="ts">
  import { ShoppingBag, UserRound, LogOut, Menu, X } from "@lucide/svelte";
  import { cart } from "$lib/stores/cart";
  import { authStore, user } from "$lib/stores/auth";

  let lastCartCount = 0;
  let bumpCart = false;
  let isMenuOpen = false;

  const links = [
    { href: "/", label: "Discover" },
    { href: "/catalog", label: "Catalog" },
    { href: "/orders", label: "Orders" },
  ];

  $: canSeeDashboard =
    $user?.role === "owner" ||
    $user?.role === "admin" ||
    $user?.role === "chef" ||
    $user?.role === "courier";
  $: dashboardHref =
    $user?.role === "courier" ? "/courier" : $user?.role === "chef" ? "/chef" : "/admin";
  $: dashboardLabel =
    $user?.role === "courier" ? "Courier" : $user?.role === "chef" ? "Chef" : "Dashboard";

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
    <a class="brand" href="/" on:click={() => (isMenuOpen = false)}>LuxeEats</a>
    <nav class="desktop-nav" aria-label="Primary navigation">
      {#each links as link}
        <a href={link.href}>{link.label}</a>
      {/each}
      {#if canSeeDashboard}
        <a href={dashboardHref}>{dashboardLabel}</a>
      {/if}
    </nav>
    <div class="actions">
      <a class:bump={bumpCart} class="icon-button cart-link" href="/cart" aria-label="Cart">
        <ShoppingBag size={20} />
        {#if cartCount > 0}
          <span>{cartCount}</span>
        {/if}
      </a>
      <a class="account-link" href="/account" aria-label={$user ? "Account" : "Sign in or register"}>
        <UserRound size={20} />
        <span>Account</span>
      </a>
      {#if $user}
        <button class="icon-button logout-button" type="button" aria-label="Logout" on:click={authStore.logout}>
          <LogOut size={18} />
        </button>
      {/if}
      <button
        class="icon-button menu-toggle"
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        on:click={() => (isMenuOpen = !isMenuOpen)}
      >
        {#if isMenuOpen}
          <X size={20} />
        {:else}
          <Menu size={20} />
        {/if}
      </button>
    </div>
    {#if isMenuOpen}
      <nav class="mobile-menu" aria-label="Mobile navigation">
        {#each links as link}
          <a href={link.href} on:click={() => (isMenuOpen = false)}>{link.label}</a>
        {/each}
        {#if canSeeDashboard}
          <a href={dashboardHref} on:click={() => (isMenuOpen = false)}>{dashboardLabel}</a>
        {/if}
        <a href="/account" on:click={() => (isMenuOpen = false)}>Account</a>
        {#if $user}
          <button
            type="button"
            on:click={() => {
              isMenuOpen = false;
              authStore.logout();
            }}
          >
            Sign out
          </button>
        {/if}
      </nav>
    {/if}
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
    flex-wrap: wrap;
  }

  .brand {
    color: var(--primary);
    font-family: var(--font-logo);
    font-size: clamp(2rem, 4vw, 4rem);
    font-weight: 700;
    line-height: 1;
  }

  .desktop-nav {
    display: flex;
    gap: 28px;
    color: var(--muted);
    font-size: 0.96rem;
  }

  .menu-toggle {
    display: none;
  }

  .desktop-nav a:hover {
    color: var(--secondary);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .account-link {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(124, 87, 48, 0.3);
    border-radius: 999px;
    color: var(--secondary);
    font-family: var(--font-body);
    font-size: 0.74rem;
    gap: 7px;
    letter-spacing: 0.06em;
    padding: 0 0.9rem;
    text-transform: uppercase;
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
    font-family: var(--font-body);
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
    .site-header {
      overflow: hidden;
    }

    .header-inner {
      min-height: 74px;
      gap: 10px 14px;
      padding-block: 10px 12px;
    }

    .brand {
      font-size: 2.2rem;
    }

    .desktop-nav {
      display: none;
    }

    .actions {
      gap: 8px;
    }

    .icon-button {
      width: 40px;
      height: 40px;
    }

    .account-link {
      display: none;
    }

    .logout-button {
      display: none;
    }

    .menu-toggle {
      display: inline-flex;
    }

    .mobile-menu {
      order: 3;
      display: grid;
      width: 100%;
      gap: 8px;
      border-top: 1px solid rgba(124, 87, 48, 0.16);
      padding-top: 10px;
    }

    .mobile-menu a,
    .mobile-menu button {
      width: 100%;
      border: 1px solid rgba(124, 87, 48, 0.22);
      border-radius: 8px;
      background: var(--surface-container);
      color: var(--muted);
      font-family: var(--font-body);
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      padding: 0.75rem 0.85rem;
      text-align: left;
      text-transform: uppercase;
    }
  }
</style>

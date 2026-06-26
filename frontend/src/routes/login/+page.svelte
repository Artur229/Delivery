<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { ArrowRight } from "@lucide/svelte";
  import { authStore } from "$lib/stores/auth";
  import { cartStore } from "$lib/stores/cart";
  import { connectSocket } from "$lib/stores/socket";

  let email = "";
  let password = "";
  let error = "";

  const getSafeRedirect = () => {
    const redirect = $page.url.searchParams.get("redirect") || "";
    return redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "";
  };

  $: redirectTo = getSafeRedirect();
  $: isCheckoutRedirect = redirectTo === "/checkout";

  const submit = async () => {
    error = "";
    try {
      await authStore.login(email, password);
      await cartStore.mergeGuestIntoAccount().catch(() => cartStore.load().catch(() => undefined));
      connectSocket();
      const currentUser = await authStore.loadMe();

      if (currentUser?.role === "courier") {
        await goto("/courier");
        return;
      }

      if (currentUser?.role === "chef") {
        await goto("/chef");
        return;
      }

      if (currentUser?.role === "owner" || currentUser?.role === "admin") {
        await goto("/admin");
        return;
      }

      await goto(redirectTo || "/catalog");
    } catch (err) {
      error = err instanceof Error ? err.message : "Login failed";
    }
  };
</script>

<main class="auth-page">
  <section class="visual">
    <img
      src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=1200&q=80"
      alt="Artisanal table"
    />
    <div>
      <h1 class="display">LuxeEats</h1>
      <p class="label">Artisanal provisions</p>
    </div>
  </section>
  <section class="form-side">
    <form class="auth-card" on:submit|preventDefault={submit}>
      <span class="label">Welcome back</span>
      <h2 class="headline">Curate your culinary journey.</h2>
      {#if isCheckoutRedirect}
        <p class="auth-note">Sign in to continue checkout with your saved basket.</p>
      {/if}
      <label>
        <span class="label">Email</span>
        <input class="ink-input" bind:value={email} type="email" autocomplete="email" />
      </label>
      <label>
        <span class="label">Password</span>
        <input class="ink-input" bind:value={password} type="password" autocomplete="current-password" />
      </label>
      {#if error}
        <p class="form-error">{error}</p>
      {/if}
      <button class="primary-button" type="submit">
        Sign in <ArrowRight size={18} />
      </button>
      <p>New here? <a href={isCheckoutRedirect ? "/register?redirect=/checkout" : "/register"}>Register here</a></p>
    </form>
  </section>
</main>

<style>
  .auth-page {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    min-height: calc(100vh - 88px);
  }

  .visual {
    position: relative;
    overflow: hidden;
  }

  .visual img {
    width: 100%;
    height: 100%;
    min-height: 620px;
    object-fit: cover;
  }

  .visual::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(24, 27, 25, 0.55), transparent);
    content: "";
  }

  .visual div {
    position: absolute;
    left: 64px;
    top: 64px;
    z-index: 1;
    color: white;
  }

  .form-side {
    display: grid;
    place-items: center;
    padding: 48px;
  }

  .auth-card {
    display: grid;
    width: min(100%, 460px);
    gap: 28px;
  }

  .auth-card p {
    color: var(--muted);
  }

  .auth-note {
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: var(--surface-container-low);
    margin: 0;
    padding: 14px 16px;
  }

  .auth-card a {
    color: var(--secondary);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 900px) {
    .auth-page {
      grid-template-columns: 1fr;
    }

    .visual {
      display: none;
    }
  }
</style>

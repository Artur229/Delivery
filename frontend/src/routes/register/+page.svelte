<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { ArrowRight } from "@lucide/svelte";
  import { authStore } from "$lib/stores/auth";
  import { cartStore } from "$lib/stores/cart";
  import { connectSocket } from "$lib/stores/socket";

  let name = "";
  let email = "";
  let password = "Password123!";
  let phone = "";
  let address = "";
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
      await authStore.register({ name, email, password, phone, address });
      await cartStore.mergeGuestIntoAccount().catch(() => cartStore.load().catch(() => undefined));
      connectSocket();
      await goto(redirectTo || "/catalog");
    } catch (err) {
      error = err instanceof Error ? err.message : "Registration failed";
    }
  };
</script>

<main class="register-page">
  <section class="image-panel">
    <img
      src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80"
      alt="Baker shaping bread"
    />
  </section>
  <section class="form-panel">
    <form on:submit|preventDefault={submit}>
      <span class="label">The art of craft</span>
      <h1 class="display">Join the collective</h1>
      {#if isCheckoutRedirect}
        <p class="auth-note">Create an account to place the order and keep your order history.</p>
      {/if}
      <label>
        <span class="label">Full name</span>
        <input class="ink-input" bind:value={name} required />
      </label>
      <label>
        <span class="label">Email</span>
        <input class="ink-input" bind:value={email} type="email" required />
      </label>
      <label>
        <span class="label">Password</span>
        <input class="ink-input" bind:value={password} type="password" required />
      </label>
      <label>
        <span class="label">Phone</span>
        <input class="ink-input" bind:value={phone} />
      </label>
      <label>
        <span class="label">Address</span>
        <input class="ink-input" bind:value={address} />
      </label>
      {#if error}
        <p class="form-error">{error}</p>
      {/if}
      <button class="primary-button" type="submit">
        Begin <ArrowRight size={18} />
      </button>
      <p>Already a member? <a href={isCheckoutRedirect ? "/login?redirect=/checkout" : "/login"}>Sign in here</a></p>
    </form>
  </section>
</main>

<style>
  .register-page {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    min-height: calc(100vh - 88px);
  }

  .image-panel {
    min-height: 680px;
    overflow: hidden;
  }

  .image-panel img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .form-panel {
    display: grid;
    place-items: center;
    padding: 48px;
  }

  form {
    display: grid;
    width: min(100%, 520px);
    gap: 22px;
  }

  p {
    color: var(--muted);
  }

  .auth-note {
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: var(--surface-container-low);
    margin: 0;
    padding: 14px 16px;
  }

  a {
    color: var(--secondary);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 900px) {
    .register-page {
      grid-template-columns: 1fr;
    }

    .image-panel {
      display: none;
    }
  }
</style>

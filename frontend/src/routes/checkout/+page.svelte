<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import MapPicker from "$lib/components/MapPicker.svelte";
  import { api, getAccessToken } from "$lib/api";
  import { cart, cartStore } from "$lib/stores/cart";
  import { user } from "$lib/stores/auth";
  import { toastStore } from "$lib/stores/toast";

  let deliveryType: "delivery" | "pickup" = "delivery";
  let paymentType: "cash" | "card" = "cash";
  let address = "";
  let phone = "";
  let error = "";
  let isGuest = true;

  $: if ($user && !address) address = $user.address ?? "";
  $: if ($user && !phone) phone = $user.phone ?? "";
  $: isGuest = !getAccessToken();
  $: if (isGuest && paymentType === "card") paymentType = "cash";

  onMount(async () => {
    if (!getAccessToken()) {
      toastStore.info("Account required", "Sign in or create an account before checkout.");
      await goto("/login?redirect=/checkout");
    }
  });

  const normalizePhone = (value: string) => {
    const startsWithPlus = value.trim().startsWith("+");
    const digits = value.replace(/\D/g, "").slice(0, 15);
    return `${startsWithPlus ? "+" : ""}${digits}`;
  };

  const handlePhoneInput = (event: Event) => {
    phone = normalizePhone((event.currentTarget as HTMLInputElement).value);
  };

  const validateCheckout = () => {
    const normalizedPhone = normalizePhone(phone);
    phone = normalizedPhone;

    if (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 7) {
      return "Enter a valid phone number.";
    }

    if (deliveryType === "delivery") {
      const cleanAddress = address.trim();

      if (cleanAddress.length < 5 || !/[A-Za-zА-Яа-яІіЇїЄєҐґ]/.test(cleanAddress)) {
        return "Enter a valid delivery address.";
      }

      if (!/\d/.test(cleanAddress)) {
        return "Add a building or apartment number to the address.";
      }
    }

    return "";
  };

  const submit = async () => {
    error = "";
    try {
      if (!$cart || $cart.items.length === 0) {
        error = "Your basket is empty.";
        return;
      }

      const validationError = validateCheckout();
      if (validationError) {
        error = validationError;
        return;
      }

      if (isGuest) {
        toastStore.info("Account required", "Sign in or create an account before checkout.");
        await goto("/login?redirect=/checkout");
        return;
      }

      const order = await api.createOrder({ deliveryType, paymentType, address, phone });

      if (paymentType === "card") {
        const checkout = await api.checkout(order.id);
        window.location.href = checkout.checkoutUrl;
        return;
      }

      await goto("/orders");
    } catch (err) {
      error = err instanceof Error ? err.message : "Checkout failed";
    }
  };
</script>

<main class="page-shell checkout-page">
  <header>
    <span class="label">Checkout</span>
    <h1 class="display">Finalizing your order</h1>
  </header>

  <section class="checkout-grid">
    <form class="paper" on:submit|preventDefault={submit}>
      {#if isGuest}
        <p class="guest-note">Sign in or create an account to place this order.</p>
      {/if}
      <label>
        <span class="label">Delivery type</span>
        <select class="ink-input" bind:value={deliveryType}>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
        </select>
      </label>
      <label>
        <span class="label">Payment</span>
        <select class="ink-input" bind:value={paymentType}>
          <option value="cash">Cash</option>
          {#if !isGuest}
            <option value="card">Card / Stripe</option>
          {/if}
        </select>
      </label>
      <label>
        <span class="label">Address</span>
        <input class="ink-input" bind:value={address} autocomplete="street-address" placeholder="Street and building" />
      </label>
      <label>
        <span class="label">Phone</span>
        <input
          class="ink-input"
          bind:value={phone}
          autocomplete="tel"
          inputmode="tel"
          placeholder="+380..."
          on:input={handlePhoneInput}
        />
      </label>
      {#if error}
        <p class="form-error">{error}</p>
      {/if}
      <button class="primary-button" type="submit">Place order · ₴{$cart?.totalPrice ?? "0.00"}</button>
    </form>
    <MapPicker {address} onAddress={(value) => (address = value)} />
  </section>
</main>

<style>
  .checkout-page {
    padding-top: 64px;
  }

  header {
    margin-bottom: 36px;
  }

  .checkout-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(320px, 1.15fr);
    gap: 28px;
  }

  form {
    display: grid;
    gap: 24px;
    padding: 28px;
  }

  .guest-note {
    color: var(--muted);
    line-height: 1.65;
  }

  .guest-note {
    border-bottom: 1px solid rgba(124, 87, 48, 0.16);
    margin: 0;
    padding-bottom: 18px;
  }

  @media (max-width: 900px) {
    .checkout-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

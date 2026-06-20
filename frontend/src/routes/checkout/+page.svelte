<script lang="ts">
  import { goto } from "$app/navigation";
  import MapPicker from "$lib/components/MapPicker.svelte";
  import { api } from "$lib/api";
  import { cart } from "$lib/stores/cart";
  import { user } from "$lib/stores/auth";

  let deliveryType: "delivery" | "pickup" = "delivery";
  let paymentType: "cash" | "card" = "cash";
  let address = "";
  let phone = "";
  let error = "";

  $: if ($user && !address) address = $user.address ?? "";
  $: if ($user && !phone) phone = $user.phone ?? "";

  const submit = async () => {
    error = "";
    try {
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
          <option value="card">Card / Stripe</option>
        </select>
      </label>
      <label>
        <span class="label">Address</span>
        <input class="ink-input" bind:value={address} />
      </label>
      <label>
        <span class="label">Phone</span>
        <input class="ink-input" bind:value={phone} />
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

  @media (max-width: 900px) {
    .checkout-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

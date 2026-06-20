<script lang="ts">
  import { onMount } from "svelte";
  import { CheckCircle2, ChefHat, Truck } from "@lucide/svelte";
  import { api } from "$lib/api";
  import { realtimeOrders } from "$lib/stores/socket";
  import type { Order } from "$lib/types";

  let orders: Order[] = [];
  let error = "";

  $: mergedOrders = [
    ...$realtimeOrders,
    ...orders.filter((order) => !$realtimeOrders.some((item) => item.id === order.id)),
  ];

  onMount(async () => {
    try {
      const response = await api.orders();
      orders = response.orders;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load orders";
    }
  });

  const statusIndex = (status: string) =>
    ["created", "paid", "cooking", "ready", "on_the_way", "delivered"].indexOf(status);
</script>

<main class="page-shell orders-page">
  <header>
    <span class="label">Realtime</span>
    <h1 class="display">Your culinary journey</h1>
    <p class="body-lg">Orders update through the backend WebSocket event stream.</p>
  </header>

  {#if error}
    <p class="form-error">{error}</p>
  {:else}
    <section class="orders">
      {#each mergedOrders as order}
        <article class="paper order-card">
          <div class="order-top">
            <div>
              <span class="label">{order.status.replaceAll("_", " ")}</span>
              <h2 class="subhead">Order #{order.id.slice(0, 8)}</h2>
            </div>
            <strong>₴{order.totalPrice}</strong>
          </div>
          <div class="timeline">
            <div class:done={statusIndex(order.status) >= 0}><CheckCircle2 size={20} />Created</div>
            <div class:done={statusIndex(order.status) >= 2}><ChefHat size={20} />Cooking</div>
            <div class:done={statusIndex(order.status) >= 4}><Truck size={20} />On the way</div>
          </div>
          <ul>
            {#each order.items as item}
              <li>{item.quantity} × {item.product?.name ?? "Product"} · ₴{item.price}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
  .orders-page {
    padding-top: 64px;
  }

  header {
    margin-bottom: 42px;
    max-width: 850px;
  }

  .orders {
    display: grid;
    gap: 20px;
  }

  .order-card {
    padding: 28px;
  }

  .order-top {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
  }

  strong {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 2rem;
  }

  .timeline {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 24px 0;
  }

  .timeline div {
    display: flex;
    align-items: center;
    border-bottom: 2px solid rgba(124, 87, 48, 0.2);
    color: var(--muted);
    gap: 10px;
    padding-bottom: 12px;
  }

  .timeline div.done {
    border-color: var(--secondary);
    color: var(--secondary);
  }

  li {
    color: var(--muted);
    line-height: 1.7;
  }

  @media (max-width: 700px) {
    .timeline {
      grid-template-columns: 1fr;
    }
  }
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowRight, CheckCircle2, ChefHat, ReceiptText, Truck, XCircle } from "@lucide/svelte";
  import { ApiClientError, api, getAccessToken } from "$lib/api";
  import { realtimeOrders } from "$lib/stores/socket";
  import type { Order } from "$lib/types";

  let orders: Order[] = [];
  let error = "";
  let isGuest = false;
  let isLoading = true;

  $: mergedOrders = [
    ...$realtimeOrders,
    ...orders.filter((order) => !$realtimeOrders.some((item) => item.id === order.id)),
  ];
  $: activeOrders = mergedOrders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled",
  );

  onMount(async () => {
    try {
      if (!getAccessToken()) {
        isGuest = true;
        return;
      }

      const response = await api.orders();
      orders = response.orders;
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 401) {
        isGuest = true;
      } else {
        error = err instanceof Error ? err.message : "Failed to load orders";
      }
    } finally {
      isLoading = false;
    }
  });

  const statusIndex = (status: string) =>
    ["created", "paid", "cooking", "ready", "on_the_way", "delivered", "cancelled"].indexOf(status);

  const canCancel = (order: Order) => order.status === "created" || order.status === "paid";

  const cancelOrder = async (orderId: string) => {
    error = "";

    try {
      const cancelledOrder = await api.cancelOrder(orderId);
      orders = orders.map((order) => (order.id === orderId ? cancelledOrder : order));
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not cancel order";
    }
  };
</script>

<main class="page-shell orders-page">
  <header>
    <span class="label">Orders</span>
  </header>

  {#if isLoading}
    <section class="empty-state paper">
      <div class="empty-icon">
        <ReceiptText size={24} />
      </div>
      <span class="label">Loading</span>
      <h2 class="headline">Gathering your active orders.</h2>
      <p class="body-lg">A moment while we check what is currently in progress.</p>
    </section>
  {:else if isGuest}
    <section class="empty-state paper">
      <div class="empty-icon">
        <ReceiptText size={24} />
      </div>
      <span class="label">No active orders</span>
      <h2 class="headline">Your orders will appear here.</h2>
      <p class="body-lg">
        When you place an order from an account, this is where you can follow its status and cancel it before it goes to the kitchen.
      </p>
      <div class="empty-actions">
        <a class="primary-button" href="/catalog">
          Browse catalog <ArrowRight size={18} />
        </a>
      </div>
    </section>
  {:else if error}
    <p class="form-error">{error}</p>
  {:else if activeOrders.length === 0}
    <section class="empty-state paper">
      <div class="empty-icon">
        <ReceiptText size={24} />
      </div>
      <span class="label">No active orders</span>
      <h2 class="headline">Your orders will appear here.</h2>
      <p class="body-lg">
        Place something from the catalog and you will be able to track it here while it is being prepared and delivered.
      </p>
      <div class="empty-actions">
        <a class="primary-button" href="/catalog">
          Browse catalog <ArrowRight size={18} />
        </a>
      </div>
    </section>
  {:else}
    <section class="orders">
      {#each activeOrders as order}
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
          {#if canCancel(order)}
            <button class="secondary-button cancel-button" on:click={() => cancelOrder(order.id)}>
              <XCircle size={17} /> Cancel order
            </button>
          {/if}
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
    margin-bottom: 24px;
  }

  .orders {
    display: grid;
    gap: 20px;
  }

  .empty-state {
    display: grid;
    max-width: 760px;
    gap: 18px;
    padding: clamp(28px, 5vw, 54px);
  }

  .empty-icon {
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border-radius: 999px;
    background: var(--tertiary);
    color: var(--secondary);
  }

  .empty-state h2,
  .empty-state p {
    margin: 0;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
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

  .cancel-button {
    margin-top: 18px;
  }

  @media (max-width: 700px) {
    .timeline {
      grid-template-columns: 1fr;
    }
  }
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import { ShieldAlert, XCircle } from "@lucide/svelte";
  import { ApiClientError, api, getAccessToken } from "$lib/api";
  import { user } from "$lib/stores/auth";
  import type { Order, OrderStatus } from "$lib/types";

  const statuses: Exclude<OrderStatus, "cancelled">[] = [
    "created",
    "paid",
    "cooking",
    "ready",
    "on_the_way",
    "delivered",
  ];

  let orders: Order[] = [];
  let error = "";
  let isLoading = true;

  $: activeOrders = orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");
  $: finishedOrders = orders.filter((order) => order.status === "delivered" || order.status === "cancelled");

  const loadOrders = async () => {
    isLoading = true;
    error = "";

    try {
      const response = await api.adminOrders();
      orders = response.orders;
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === 401 || err.code === 403)) {
        error = "Admin access is required.";
      } else {
        error = err instanceof Error ? err.message : "Could not load admin orders.";
      }
    } finally {
      isLoading = false;
    }
  };

  onMount(async () => {
    if (!getAccessToken()) {
      error = "Admin access is required.";
      isLoading = false;
      return;
    }

    await loadOrders();
  });

  const replaceOrder = (nextOrder: Order) => {
    orders = orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    error = "";

    try {
      replaceOrder(await api.updateOrderStatus(order.id, status));
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not update order.";
    }
  };

  const cancelOrder = async (order: Order) => {
    error = "";

    try {
      replaceOrder(await api.cancelOrder(order.id));
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not cancel order.";
    }
  };

  const formatStatus = (status: string) => status.replaceAll("_", " ");
</script>

<main class="page-shell admin-page">
  <header>
    <span class="label">Admin</span>
    <h1 class="display">Orders desk</h1>
    <p class="body-lg">Review current orders, move them through the kitchen flow, or cancel when needed.</p>
  </header>

  {#if isLoading}
    <section class="paper empty-state">
      <span class="label">Loading</span>
      <h2 class="headline">Gathering orders.</h2>
    </section>
  {:else if error}
    <section class="paper empty-state">
      <ShieldAlert size={28} />
      <span class="label">Attention</span>
      <h2 class="headline">{error}</h2>
      {#if !$user}
        <a class="primary-button" href="/login">Sign in</a>
      {/if}
    </section>
  {:else}
    <section class="stats">
      <article class="paper">
        <span class="label">Active</span>
        <strong>{activeOrders.length}</strong>
      </article>
      <article class="paper">
        <span class="label">Finished</span>
        <strong>{finishedOrders.length}</strong>
      </article>
      <article class="paper">
        <span class="label">Total</span>
        <strong>{orders.length}</strong>
      </article>
    </section>

    <section class="orders">
      {#each orders as order}
        <article class="paper order-card">
          <div class="order-top">
            <div>
              <span class="label">{formatStatus(order.status)}</span>
              <h2 class="subhead">Order #{order.id.slice(0, 8)}</h2>
              <p>{order.deliveryType} · {order.phone ?? "No phone"} · {order.address ?? "No address"}</p>
            </div>
            <strong>₴{order.totalPrice}</strong>
          </div>

          <ul>
            {#each order.items as item}
              <li>{item.quantity} × {item.product?.name ?? "Product"} · ₴{item.price}</li>
            {/each}
          </ul>

          <div class="status-actions">
            {#each statuses as status}
              <button
                class:active={order.status === status}
                disabled={order.status === status || order.status === "cancelled"}
                on:click={() => updateStatus(order, status)}
              >
                {formatStatus(status)}
              </button>
            {/each}
          </div>

          <div class="order-actions">
            <span class="label">{order.paymentType} · {order.paymentStatus}</span>
            <button
              class="secondary-button"
              disabled={order.status === "cancelled" || order.status === "delivered"}
              on:click={() => cancelOrder(order)}
            >
              {#if order.status === "cancelled"}
                Cancelled
              {:else}
                <XCircle size={17} /> Cancel order
              {/if}
            </button>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</main>

<style>
  .admin-page {
    padding-top: 64px;
  }

  header {
    max-width: 850px;
    margin-bottom: 42px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .stats article,
  .empty-state,
  .order-card {
    padding: 24px;
  }

  .stats strong,
  .order-top strong {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 2.3rem;
  }

  .orders {
    display: grid;
    gap: 18px;
  }

  .order-card {
    display: grid;
    gap: 20px;
  }

  .order-top,
  .order-actions {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
  }

  .order-top p,
  li {
    color: var(--muted);
    line-height: 1.7;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .status-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .status-actions button {
    border: 1px solid rgba(124, 87, 48, 0.24);
    border-radius: 999px;
    background: var(--surface-container);
    color: var(--muted);
    cursor: pointer;
    font-family: "Space Mono", monospace;
    font-size: 0.72rem;
    padding: 0.52rem 0.72rem;
    text-transform: uppercase;
  }

  .status-actions button.active {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .status-actions button:disabled,
  .order-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .empty-state {
    display: grid;
    max-width: 760px;
    gap: 18px;
  }

  @media (max-width: 850px) {
    .stats,
    .order-top,
    .order-actions {
      grid-template-columns: 1fr;
    }

    .stats {
      display: grid;
    }

    .order-top,
    .order-actions {
      display: grid;
    }
  }
</style>

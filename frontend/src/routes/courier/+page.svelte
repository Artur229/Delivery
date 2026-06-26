<script lang="ts">
  import { onMount } from "svelte";
  import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    MapPin,
    Navigation,
    PackageCheck,
    Phone,
    ShieldAlert,
    Truck,
  } from "@lucide/svelte";
  import { ApiClientError, api, getAccessToken } from "$lib/api";
  import { realtimeOrders } from "$lib/stores/socket";
  import { user } from "$lib/stores/auth";
  import type { Order, OrderStatus, User } from "$lib/types";

  type CourierTab = "available" | "active" | "completed";

  let orders: Order[] = [];
  let currentUser: User | null = null;
  let activeTab: CourierTab = "available";
  let error = "";
  let isLoading = true;
  let updatingOrderId = "";

  $: mergedOrders = [
    ...$realtimeOrders,
    ...orders.filter((order) => !$realtimeOrders.some((item) => item.id === order.id)),
  ];
  $: availableOrders = mergedOrders.filter((order) => order.status === "ready");
  $: activeOrders = mergedOrders.filter((order) => order.status === "on_the_way");
  $: completedOrders = mergedOrders.filter((order) => order.status === "delivered");
  $: visibleOrders =
    activeTab === "available"
      ? availableOrders
      : activeTab === "active"
        ? activeOrders
        : completedOrders;

  const canUseCourierConsole = (role: User["role"]) =>
    role === "courier" || role === "owner" || role === "admin";

  const formatMoney = (value: number | string) => `₴${Number(value).toFixed(2)}`;
  const formatStatus = (status: string) => status.replaceAll("_", " ");
  const mapsUrl = (address: string | null) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? "Kyiv")}`;

  const loadCourierOrders = async () => {
    isLoading = true;
    error = "";

    try {
      const profile = await api.me();
      currentUser = profile;
      user.set(profile);

      if (!canUseCourierConsole(profile.role)) {
        error = "Courier access is required.";
        return;
      }

      const response = await api.adminOrders();
      orders = response.orders;
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === 401 || err.code === 403)) {
        error = "Courier access is required.";
      } else {
        error = err instanceof Error ? err.message : "Could not load courier orders.";
      }
    } finally {
      isLoading = false;
    }
  };

  onMount(async () => {
    if (!getAccessToken()) {
      error = "Courier access is required.";
      isLoading = false;
      return;
    }

    await loadCourierOrders();
  });

  const replaceOrder = (nextOrder: Order) => {
    orders = orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
  };

  const moveOrder = async (order: Order, status: OrderStatus) => {
    updatingOrderId = order.id;
    error = "";

    try {
      replaceOrder(await api.updateOrderStatus(order.id, status));
      activeTab = status === "on_the_way" ? "active" : status === "delivered" ? "completed" : activeTab;
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not update delivery.";
    } finally {
      updatingOrderId = "";
    }
  };
</script>

<main class="courier-page">
  <section class="courier-hero">
    <div>
      <span class="label">Courier shift</span>
      <h1>Delivery Console</h1>
      <p>Ready orders, active deliveries, and completed drops in one phone-friendly workspace.</p>
    </div>
    <div class="shift-card">
      <span class="status-dot"></span>
      <div>
        <strong>{currentUser?.name ?? "Courier"}</strong>
        <span>{currentUser?.role ?? "shift pending"}</span>
      </div>
    </div>
  </section>

  {#if isLoading}
    <section class="paper empty-state">
      <Clock3 size={28} />
      <span class="label">Loading</span>
      <h2 class="headline">Checking the dispatch board.</h2>
    </section>
  {:else if error}
    <section class="paper empty-state">
      <ShieldAlert size={28} />
      <span class="label">Attention</span>
      <h2 class="headline">{error}</h2>
      <a class="primary-button" href="/login">Sign in</a>
    </section>
  {:else}
    <section class="courier-metrics">
      <button class="metric-card" type="button" on:click={() => (activeTab = "available")}>
        <PackageCheck size={22} />
        <span class="label">Ready pickup</span>
        <strong>{availableOrders.length}</strong>
        <p>Orders waiting for a courier handoff.</p>
      </button>
      <button class="metric-card dark" type="button" on:click={() => (activeTab = "active")}>
        <Truck size={22} />
        <span class="label">On the way</span>
        <strong>{activeOrders.length}</strong>
        <p>Deliveries currently in progress.</p>
      </button>
      <button class="metric-card" type="button" on:click={() => (activeTab = "completed")}>
        <CheckCircle2 size={22} />
        <span class="label">Completed</span>
        <strong>{completedOrders.length}</strong>
        <p>Finished drops from the current board.</p>
      </button>
    </section>

    <section class="courier-tabs" aria-label="Courier order filters">
      <button class:active={activeTab === "available"} on:click={() => (activeTab = "available")}>
        <PackageCheck size={18} />
        Available
        <span>{availableOrders.length}</span>
      </button>
      <button class:active={activeTab === "active"} on:click={() => (activeTab = "active")}>
        <Truck size={18} />
        Active
        <span>{activeOrders.length}</span>
      </button>
      <button class:active={activeTab === "completed"} on:click={() => (activeTab = "completed")}>
        <CheckCircle2 size={18} />
        Completed
        <span>{completedOrders.length}</span>
      </button>
    </section>

    {#if visibleOrders.length === 0}
      <section class="paper empty-state">
        <Navigation size={30} />
        <span class="label">Nothing here</span>
        <h2 class="headline">
          {#if activeTab === "available"}No ready orders yet.
          {:else if activeTab === "active"}No active delivery right now.
          {:else}Completed deliveries will appear here.{/if}
        </h2>
      </section>
    {:else}
      <section class="delivery-list">
        {#each visibleOrders as order}
          <article class="paper delivery-card">
            <div class="delivery-top">
              <div>
                <span class="label">{formatStatus(order.status)}</span>
                <h2>Order #{order.id.slice(0, 8)}</h2>
              </div>
              <strong>{formatMoney(order.totalPrice)}</strong>
            </div>

            <div class="delivery-address">
              <MapPin size={22} />
              <div>
                <span>{order.deliveryType}</span>
                <strong>{order.address ?? "Pickup / address missing"}</strong>
              </div>
            </div>

            <div class="delivery-meta">
              <a href={`tel:${order.phone ?? ""}`} class:disabled={!order.phone}>
                <Phone size={17} />
                {order.phone ?? "No phone"}
              </a>
              <span>{order.items.length} items</span>
              <span>{order.paymentType} · {order.paymentStatus}</span>
            </div>

            <ul>
              {#each order.items as item}
                <li>{item.quantity} × {item.product?.name ?? "Product"}</li>
              {/each}
            </ul>

            <div class="delivery-actions">
              <a class="secondary-button" href={mapsUrl(order.address)} target="_blank" rel="noreferrer">
                <ExternalLink size={17} /> Open maps
              </a>

              {#if order.status === "ready"}
                <button
                  class="primary-button"
                  disabled={updatingOrderId === order.id}
                  on:click={() => moveOrder(order, "on_the_way")}
                >
                  <Truck size={17} /> Start delivery
                </button>
              {:else if order.status === "on_the_way"}
                <button
                  class="primary-button"
                  disabled={updatingOrderId === order.id}
                  on:click={() => moveOrder(order, "delivered")}
                >
                  <CheckCircle2 size={17} /> Mark delivered
                </button>
              {/if}
            </div>
          </article>
        {/each}
      </section>
    {/if}
  {/if}
</main>

<style>
  .courier-page {
    width: min(100% - 32px, 980px);
    margin: 0 auto;
    padding: clamp(28px, 6vw, 64px) 0;
  }

  .courier-hero {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .courier-hero h1 {
    margin: 8px 0 14px;
    font-family: var(--font-heading);
    font-size: clamp(3rem, 8vw, 5.8rem);
    line-height: 0.95;
  }

  .courier-hero p,
  .metric-card p,
  .delivery-card li {
    color: var(--muted);
    line-height: 1.7;
  }

  .shift-card {
    display: flex;
    min-width: 220px;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(124, 87, 48, 0.22);
    background: var(--surface-container-low);
    padding: 18px;
  }

  .shift-card strong,
  .shift-card span {
    display: block;
  }

  .shift-card span:last-child {
    color: var(--muted);
    margin-top: 4px;
  }

  .courier-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .metric-card {
    display: grid;
    min-height: 160px;
    align-content: space-between;
    border: 1px solid rgba(124, 87, 48, 0.18);
    border-radius: 8px;
    background: var(--surface-container);
    color: var(--primary);
    cursor: pointer;
    padding: 20px;
    text-align: left;
    transition:
      border-color 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .metric-card:hover {
    border-color: rgba(124, 87, 48, 0.32);
    box-shadow: 0 18px 42px rgba(35, 32, 28, 0.08);
    transform: translateY(-2px);
  }

  .metric-card strong {
    color: var(--secondary);
    font-family: var(--font-heading);
    font-size: 3rem;
    line-height: 1;
  }

  .metric-card.dark {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .metric-card.dark strong,
  .metric-card.dark .label,
  .metric-card.dark p {
    color: var(--secondary-soft);
  }

  .courier-tabs {
    position: sticky;
    top: 88px;
    z-index: 8;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 22px;
    background: rgba(250, 249, 246, 0.9);
    padding: 10px 0;
    backdrop-filter: blur(14px);
  }

  .courier-tabs button {
    display: flex;
    min-height: 58px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(124, 87, 48, 0.24);
    border-radius: 8px;
    background: var(--surface-container);
    color: var(--muted);
    cursor: pointer;
    gap: 8px;
  }

  .courier-tabs button.active {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .courier-tabs span {
    display: grid;
    min-width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 999px;
    background: rgba(124, 87, 48, 0.14);
    font-family: var(--font-body);
    font-size: 0.75rem;
  }

  .delivery-list {
    display: grid;
    gap: 16px;
  }

  .delivery-card,
  .empty-state {
    padding: clamp(22px, 4vw, 34px);
  }

  .delivery-card {
    display: grid;
    gap: 20px;
  }

  .delivery-top,
  .delivery-actions,
  .delivery-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .delivery-top h2 {
    margin: 5px 0 0;
    font-family: var(--font-heading);
    font-size: clamp(1.8rem, 4vw, 2.8rem);
  }

  .delivery-top strong {
    color: var(--secondary);
    font-family: var(--font-heading);
    font-size: 2rem;
  }

  .delivery-address {
    display: flex;
    align-items: start;
    gap: 12px;
    border-left: 4px solid var(--secondary);
    background: var(--surface-container-low);
    padding: 18px;
  }

  .delivery-address span,
  .delivery-address strong {
    display: block;
  }

  .delivery-address span {
    color: var(--muted);
    font-family: var(--font-body);
    font-size: 0.76rem;
    text-transform: uppercase;
  }

  .delivery-address strong {
    margin-top: 5px;
    font-size: 1.2rem;
  }

  .delivery-meta {
    flex-wrap: wrap;
    color: var(--muted);
    font-family: var(--font-body);
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .delivery-meta a {
    display: inline-flex;
    align-items: center;
    color: var(--secondary);
    gap: 6px;
  }

  .delivery-meta a.disabled {
    pointer-events: none;
    opacity: 0.55;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .delivery-actions {
    position: sticky;
    bottom: 12px;
    align-items: stretch;
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: rgba(250, 249, 246, 0.9);
    padding: 10px;
    backdrop-filter: blur(14px);
  }

  .delivery-actions a,
  .delivery-actions button {
    flex: 1;
  }

  .delivery-actions button:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .empty-state {
    display: grid;
    gap: 16px;
  }

  @media (max-width: 720px) {
    .courier-hero,
    .delivery-top,
    .delivery-meta,
    .delivery-actions {
      display: grid;
    }

    .shift-card {
      min-width: 0;
    }

    .courier-metrics {
      grid-template-columns: 1fr;
    }

    .courier-tabs {
      top: 74px;
    }
  }
</style>

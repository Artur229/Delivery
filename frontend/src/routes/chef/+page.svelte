<script lang="ts">
  import { onMount } from "svelte";
  import {
    Boxes,
    CheckCircle2,
    ChefHat,
    Clock3,
    Flame,
    PackageSearch,
    ShieldAlert,
    Soup,
    Utensils,
  } from "@lucide/svelte";
  import { ApiClientError, api, getAccessToken } from "$lib/api";
  import { realtimeOrders } from "$lib/stores/socket";
  import { user } from "$lib/stores/auth";
  import type { InventoryItem, Order, OrderStatus, Product, User } from "$lib/types";

  type ChefSection = "queue" | "menu" | "inventory";

  let orders: Order[] = [];
  let products: Product[] = [];
  let inventory: InventoryItem[] = [];
  let currentUser: User | null = null;
  let activeSection: ChefSection = "queue";
  let error = "";
  let isLoading = true;
  let updatingOrderId = "";

  $: mergedOrders = [
    ...$realtimeOrders,
    ...orders.filter((order) => !$realtimeOrders.some((item) => item.id === order.id)),
  ];
  $: paidOrders = mergedOrders.filter((order) => order.status === "paid");
  $: cookingOrders = mergedOrders.filter((order) => order.status === "cooking");
  $: readyOrders = mergedOrders.filter((order) => order.status === "ready");
  $: kitchenOrders = [...paidOrders, ...cookingOrders, ...readyOrders];
  $: lowStock = inventory.filter((item) => Number(item.quantity) <= 10);
  $: menuValue = products.reduce((sum, product) => sum + Number(product.price), 0);

  const canUseChefConsole = (role: User["role"]) =>
    role === "chef" || role === "owner" || role === "admin";

  const formatMoney = (value: number | string) => `₴${Number(value).toFixed(2)}`;
  const formatStatus = (status: string) => status.replaceAll("_", " ");

  const loadChefWorkspace = async () => {
    isLoading = true;
    error = "";

    try {
      const profile = await api.me();
      currentUser = profile;
      user.set(profile);

      if (!canUseChefConsole(profile.role)) {
        error = "Chef access is required.";
        return;
      }

      const [orderResult, productResult, inventoryResult] = await Promise.allSettled([
        api.adminOrders(),
        api.products(),
        api.inventory(),
      ]);

      if (orderResult.status === "rejected") {
        throw orderResult.reason;
      }

      orders = orderResult.value.orders;
      products = productResult.status === "fulfilled" ? productResult.value.products : [];
      inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value.inventory : [];
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === 401 || err.code === 403)) {
        error = "Chef access is required.";
      } else {
        error = err instanceof Error ? err.message : "Could not load chef workspace.";
      }
    } finally {
      isLoading = false;
    }
  };

  onMount(async () => {
    if (!getAccessToken()) {
      error = "Chef access is required.";
      isLoading = false;
      return;
    }

    await loadChefWorkspace();
  });

  const replaceOrder = (nextOrder: Order) => {
    orders = orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
  };

  const moveOrder = async (order: Order, status: OrderStatus) => {
    updatingOrderId = order.id;
    error = "";

    try {
      replaceOrder(await api.updateOrderStatus(order.id, status));
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not update kitchen order.";
    } finally {
      updatingOrderId = "";
    }
  };
</script>

<main class="chef-page">
  <section class="chef-hero">
    <div>
      <span class="label">Chef workspace</span>
      <h1>Kitchen Console</h1>
      <p>Prep queue, menu overview, and stock awareness for the kitchen shift.</p>
    </div>
    <div class="shift-card">
      <span class="status-dot"></span>
      <div>
        <strong>{currentUser?.name ?? "Chef"}</strong>
        <span>{currentUser?.role ?? "station pending"}</span>
      </div>
    </div>
  </section>

  {#if isLoading}
    <section class="paper empty-state">
      <Clock3 size={28} />
      <span class="label">Loading</span>
      <h2 class="headline">Warming up the kitchen board.</h2>
    </section>
  {:else if error}
    <section class="paper empty-state">
      <ShieldAlert size={28} />
      <span class="label">Attention</span>
      <h2 class="headline">{error}</h2>
      <a class="primary-button" href="/login">Sign in</a>
    </section>
  {:else}
    <section class="chef-metrics">
      <article class="metric-card dark">
        <span class="label">To start</span>
        <strong>{paidOrders.length}</strong>
        <p>Paid orders waiting for the first kitchen action.</p>
      </article>
      <article class="metric-card hot">
        <span class="label">Cooking</span>
        <strong>{cookingOrders.length}</strong>
        <p>Tickets currently moving through the line.</p>
      </article>
      <article class="metric-card">
        <span class="label">Ready</span>
        <strong>{readyOrders.length}</strong>
        <p>Finished orders waiting for delivery pickup.</p>
      </article>
      <article class="metric-card">
        <span class="label">Low stock</span>
        <strong>{lowStock.length}</strong>
        <p>Inventory items at ten units or below.</p>
      </article>
    </section>

    <section class="chef-tabs" aria-label="Chef workspace sections">
      <button class:active={activeSection === "queue"} on:click={() => (activeSection = "queue")}>
        <ChefHat size={18} />
        Kitchen
        <span>{kitchenOrders.length}</span>
      </button>
      <button class:active={activeSection === "menu"} on:click={() => (activeSection = "menu")}>
        <PackageSearch size={18} />
        Menu
        <span>{products.length}</span>
      </button>
      <button class:active={activeSection === "inventory"} on:click={() => (activeSection = "inventory")}>
        <Boxes size={18} />
        Stock
        <span>{inventory.length}</span>
      </button>
    </section>

    {#if activeSection === "queue"}
      {#if kitchenOrders.length === 0}
        <section class="paper empty-state">
          <Soup size={30} />
          <span class="label">Clear rail</span>
          <h2 class="headline">No active kitchen tickets right now.</h2>
        </section>
      {:else}
        <section class="ticket-list">
          {#each kitchenOrders as order}
            <article class="paper ticket-card">
              <div class="ticket-top">
                <div>
                  <span class="label">{formatStatus(order.status)}</span>
                  <h2>Order #{order.id.slice(0, 8)}</h2>
                </div>
                <strong>{formatMoney(order.totalPrice)}</strong>
              </div>

              <div class="ticket-items">
                {#each order.items as item}
                  <div>
                    <span>{item.quantity}x</span>
                    <strong>{item.product?.name ?? "Product"}</strong>
                    <small>{formatMoney(Number(item.price) * item.quantity)}</small>
                  </div>
                {/each}
              </div>

              <div class="ticket-meta">
                <span>{order.deliveryType}</span>
                <span>{order.paymentType} · {order.paymentStatus}</span>
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "No time"}</span>
              </div>

              <div class="ticket-actions">
                {#if order.status === "paid"}
                  <button
                    class="primary-button"
                    disabled={updatingOrderId === order.id}
                    on:click={() => moveOrder(order, "cooking")}
                  >
                    <Flame size={17} /> Start cooking
                  </button>
                {:else if order.status === "cooking"}
                  <button
                    class="primary-button"
                    disabled={updatingOrderId === order.id}
                    on:click={() => moveOrder(order, "ready")}
                  >
                    <CheckCircle2 size={17} /> Mark ready
                  </button>
                {:else}
                  <span class="ready-pill">Ready for courier</span>
                {/if}
              </div>
            </article>
          {/each}
        </section>
      {/if}
    {:else if activeSection === "menu"}
      <section class="menu-summary paper">
        <div>
          <span class="label">Menu library</span>
          <h2 class="headline">{products.length} active dishes</h2>
        </div>
        <p>Average listed price: {products.length ? formatMoney(menuValue / products.length) : formatMoney(0)}</p>
      </section>

      <section class="menu-grid">
        {#each products as product}
          <article class="paper menu-card">
            <div class="menu-image">
              {#if product.cover}
                <img src={product.cover} alt={product.name} />
              {:else}
                <Utensils size={26} />
              {/if}
            </div>
            <div>
              <span class="label">{product.categories?.[0]?.name ?? "Menu"}</span>
              <h2>{product.name}</h2>
              <p>{product.description ?? "Kitchen menu item."}</p>
              <strong>{formatMoney(product.price)}</strong>
            </div>
          </article>
        {/each}
      </section>
    {:else}
      <section class="stock-layout">
        <article class="paper low-stock-panel">
          <span class="label">Low stock alerts</span>
          <h2 class="headline">{lowStock.length ? "Needs attention" : "Stock looks steady"}</h2>
          <div class="stock-stack">
            {#each lowStock as item}
              <div>
                <strong>{item.name}</strong>
                <span>{item.quantity} {item.unit}</span>
              </div>
            {:else}
              <p>No inventory item is currently at the low-stock threshold.</p>
            {/each}
          </div>
        </article>

        <section class="stock-table paper">
          <div class="stock-row stock-head">
            <span>Item</span>
            <span>Quantity</span>
            <span>Updated</span>
          </div>
          {#each inventory as item}
            <div class:low={Number(item.quantity) <= 10} class="stock-row">
              <strong>{item.name}</strong>
              <span>{item.quantity} {item.unit}</span>
              <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "No date"}</span>
            </div>
          {/each}
        </section>
      </section>
    {/if}
  {/if}
</main>

<style>
  .chef-page {
    width: min(100% - 32px, 1180px);
    margin: 0 auto;
    padding: clamp(28px, 6vw, 64px) 0;
  }

  .chef-hero {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .chef-hero h1 {
    margin: 8px 0 14px;
    font-family: "Playfair Display", serif;
    font-size: clamp(3rem, 8vw, 5.8rem);
    line-height: 0.95;
  }

  .chef-hero p,
  .metric-card p,
  .menu-card p,
  .stock-stack p {
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

  .chef-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .metric-card {
    display: grid;
    min-height: 170px;
    align-content: space-between;
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: var(--surface-container);
    padding: 22px;
  }

  .metric-card strong {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 3.2rem;
    line-height: 1;
  }

  .metric-card.dark {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .metric-card.dark .label,
  .metric-card.dark p {
    color: var(--secondary-soft);
  }

  .metric-card.hot {
    background: color-mix(in srgb, var(--secondary-soft) 55%, white);
  }

  .chef-tabs {
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

  .chef-tabs button {
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

  .chef-tabs button.active {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .chef-tabs span {
    display: grid;
    min-width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 999px;
    background: rgba(124, 87, 48, 0.14);
    font-family: "Space Mono", monospace;
    font-size: 0.75rem;
  }

  .ticket-list,
  .menu-grid {
    display: grid;
    gap: 16px;
  }

  .ticket-card,
  .empty-state,
  .menu-summary,
  .low-stock-panel,
  .stock-table {
    padding: clamp(22px, 4vw, 34px);
  }

  .ticket-card {
    display: grid;
    gap: 20px;
  }

  .ticket-top,
  .ticket-meta,
  .ticket-actions,
  .menu-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .ticket-top h2,
  .menu-card h2 {
    margin: 5px 0 0;
    font-family: "Playfair Display", serif;
    font-size: clamp(1.8rem, 4vw, 2.8rem);
  }

  .ticket-top strong,
  .menu-card strong {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 2rem;
  }

  .ticket-items {
    display: grid;
    gap: 8px;
  }

  .ticket-items div,
  .stock-row,
  .stock-stack div {
    display: grid;
    grid-template-columns: 60px 1fr auto;
    gap: 14px;
    align-items: center;
    border-bottom: 1px solid rgba(124, 87, 48, 0.14);
    padding: 10px 0;
  }

  .ticket-items span,
  .ticket-items small,
  .ticket-meta,
  .stock-row span,
  .ready-pill {
    color: var(--muted);
    font-family: "Space Mono", monospace;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .ticket-actions {
    position: sticky;
    bottom: 12px;
    align-items: stretch;
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: rgba(250, 249, 246, 0.9);
    padding: 10px;
    backdrop-filter: blur(14px);
  }

  .ticket-actions button {
    width: 100%;
  }

  .ticket-actions button:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .ready-pill {
    display: inline-flex;
    justify-content: center;
    border: 1px solid rgba(124, 87, 48, 0.22);
    background: var(--surface-container-low);
    padding: 1rem;
  }

  .empty-state {
    display: grid;
    gap: 16px;
  }

  .menu-summary {
    margin-bottom: 16px;
  }

  .menu-summary h2 {
    margin: 6px 0 0;
  }

  .menu-card {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 20px;
    padding: 16px;
  }

  .menu-image {
    display: grid;
    min-height: 150px;
    place-items: center;
    background: var(--surface-high);
    color: var(--secondary);
    overflow: hidden;
  }

  .menu-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .stock-layout {
    display: grid;
    grid-template-columns: 0.85fr 1.4fr;
    gap: 16px;
  }

  .stock-stack {
    display: grid;
    gap: 6px;
    margin-top: 18px;
  }

  .stock-stack div {
    grid-template-columns: 1fr auto;
  }

  .stock-head {
    color: var(--secondary);
    font-family: "Space Mono", monospace;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .stock-row.low {
    color: var(--error);
  }

  @media (max-width: 900px) {
    .chef-metrics,
    .stock-layout {
      grid-template-columns: 1fr 1fr;
    }

    .menu-card {
      grid-template-columns: 130px 1fr;
    }
  }

  @media (max-width: 720px) {
    .chef-hero,
    .ticket-top,
    .ticket-meta,
    .ticket-actions,
    .menu-summary,
    .stock-layout {
      display: grid;
    }

    .chef-metrics,
    .chef-tabs {
      grid-template-columns: 1fr;
    }

    .chef-tabs {
      top: 74px;
    }

    .shift-card {
      min-width: 0;
    }

    .menu-card,
    .ticket-items div,
    .stock-row,
    .stock-stack div {
      grid-template-columns: 1fr;
    }
  }
</style>

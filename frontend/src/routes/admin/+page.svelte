<script lang="ts">
  import { onMount } from "svelte";
  import {
    Banknote,
    Boxes,
    ClipboardList,
    LayoutDashboard,
    PackageSearch,
    Settings,
    ShieldAlert,
    Star,
    UsersRound,
    XCircle,
  } from "@lucide/svelte";
  import { ApiClientError, api, getAccessToken } from "$lib/api";
  import { user } from "$lib/stores/auth";
  import type { Category, InventoryItem, Order, OrderStatus, Product, Tag, User } from "$lib/types";

  const statuses: Exclude<OrderStatus, "cancelled">[] = [
    "created",
    "paid",
    "cooking",
    "ready",
    "on_the_way",
    "delivered",
  ];

  const sections = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "finance", label: "Finance", icon: Banknote },
    { id: "catalog", label: "Catalog", icon: PackageSearch },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "staff", label: "Staff", icon: UsersRound },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  type SectionId = (typeof sections)[number]["id"];

  let activeSection: SectionId = "overview";
  let orders: Order[] = [];
  let products: Product[] = [];
  let categories: Category[] = [];
  let tags: Tag[] = [];
  let staff: User[] = [];
  let inventory: InventoryItem[] = [];
  let error = "";
  let isLoading = true;

  $: activeOrders = orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");
  $: finishedOrders = orders.filter((order) => order.status === "delivered" || order.status === "cancelled");
  $: paidRevenue = orders
    .filter((order) => order.paymentStatus === "paid" || order.paymentStatus === "refunded")
    .reduce((sum, order) => sum + Number(order.totalPrice), 0);
  $: averageOrder = orders.length ? paidRevenue / orders.length : 0;
  $: lowStock = inventory.filter((item) => Number(item.quantity) <= 10);
  $: team = staff.filter((member) => member.role !== "customer");
  $: customers = staff.filter((member) => member.role === "customer");
  $: recentOrders = orders.slice(0, 5);

  const formatMoney = (value: number | string) => `₴${Number(value).toFixed(2)}`;
  const formatStatus = (status: string) => status.replaceAll("_", " ");

  const settleValue = <T,>(result: PromiseSettledResult<T>, fallback: T) =>
    result.status === "fulfilled" ? result.value : fallback;

  const loadDashboard = async () => {
    isLoading = true;
    error = "";

    try {
      const [orderResult, productResult, categoryResult, tagResult, userResult, inventoryResult] =
        await Promise.allSettled([
          api.adminOrders(),
          api.products(),
          api.categories(),
          api.tags(),
          api.users(),
          api.inventory(),
        ]);

      if (orderResult.status === "rejected") {
        const err = orderResult.reason;
        if (err instanceof ApiClientError && (err.code === 401 || err.code === 403)) {
          error = "Dashboard access is required.";
        } else {
          error = err instanceof Error ? err.message : "Could not load dashboard orders.";
        }
        return;
      }

      orders = orderResult.value.orders;
      products = settleValue(productResult, { products: [] }).products;
      categories = settleValue(categoryResult, { categories: [] }).categories;
      tags = settleValue(tagResult, { tags: [] }).tags;
      staff = settleValue(userResult, { users: [] }).users;
      inventory = settleValue(inventoryResult, { inventory: [] }).inventory;
    } finally {
      isLoading = false;
    }
  };

  onMount(async () => {
    if (!getAccessToken()) {
      error = "Dashboard access is required.";
      isLoading = false;
      return;
    }

    await loadDashboard();
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
</script>

<main class="dashboard-shell">
  <aside class="dashboard-sidebar">
    <a class="dashboard-brand" href="/">LuxeEats</a>
    <div>
      <span class="label">Owner workspace</span>
      <h1>Daily Dispatch</h1>
    </div>
    <nav class="dashboard-nav" aria-label="Dashboard sections">
      {#each sections as section}
        <button class:active={activeSection === section.id} on:click={() => (activeSection = section.id)}>
          <svelte:component this={section.icon} size={18} />
          {section.label}
        </button>
      {/each}
    </nav>
    <div class="sidebar-note">
      <span class="label">Signed in</span>
      <strong>{$user?.name ?? "Staff member"}</strong>
      <p>{$user?.role ?? "dashboard"}</p>
    </div>
  </aside>

  <section class="dashboard-content">
    {#if isLoading}
      <section class="paper empty-state">
        <span class="label">Loading</span>
        <h2 class="headline">Preparing the workspace.</h2>
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
      <header class="dashboard-header">
        <div>
          <span class="label">{activeSection}</span>
          <h2 class="display">
            {#if activeSection === "overview"}Daily Dispatch
            {:else if activeSection === "orders"}Orders Desk
            {:else if activeSection === "finance"}Cash Flow
            {:else if activeSection === "catalog"}Menu Library
            {:else if activeSection === "inventory"}Stock Room
            {:else if activeSection === "staff"}The Team
            {:else}Restaurant Settings{/if}
          </h2>
        </div>
        <div class="header-actions">
          <button class="secondary-button">Export</button>
          <a class="primary-button" href="/catalog">Open catalog</a>
        </div>
      </header>

      {#if activeSection === "overview"}
        <section class="overview-grid">
          <button class="metric-card featured" type="button" on:click={() => (activeSection = "finance")}>
            <span class="label">Paid revenue</span>
            <strong>{formatMoney(paidRevenue)}</strong>
            <p>{orders.length} orders recorded in the current ledger.</p>
          </button>
          <button class="metric-card dark" type="button" on:click={() => (activeSection = "orders")}>
            <span class="label">Active orders</span>
            <strong>{activeOrders.length}</strong>
            <p>Kitchen and delivery work currently in motion.</p>
          </button>
          <button class="metric-card" type="button" on:click={() => (activeSection = "finance")}>
            <span class="label">Average order</span>
            <strong>{formatMoney(averageOrder)}</strong>
            <p>Calculated from paid and refunded orders.</p>
          </button>
          <button class="metric-card" type="button" on:click={() => (activeSection = "inventory")}>
            <span class="label">Low stock</span>
            <strong>{lowStock.length}</strong>
            <p>Inventory items at 10 units or below.</p>
          </button>
        </section>

        <section class="content-grid">
          <article class="paper panel wide">
            <div class="section-title">
              <div>
                <span class="label">Live orders</span>
                <h3 class="subhead">Latest movement</h3>
              </div>
              <button on:click={() => (activeSection = "orders")}>View all</button>
            </div>
            <div class="compact-list">
              {#each recentOrders as order}
                <div class="compact-row">
                  <div>
                    <strong>#{order.id.slice(0, 8)}</strong>
                    <span>{order.items.length} items · {formatStatus(order.status)}</span>
                  </div>
                  <b>{formatMoney(order.totalPrice)}</b>
                </div>
              {/each}
            </div>
          </article>

          <article class="paper panel">
            <div class="section-title">
              <div>
                <span class="label">Menu health</span>
                <h3 class="subhead">{products.length} dishes</h3>
              </div>
              <Star size={22} />
            </div>
            <p>{categories.length} categories and {tags.length} tags shape the catalog filters.</p>
            <button on:click={() => (activeSection = "catalog")}>Review menu</button>
          </article>
        </section>

        <section class="ops-grid">
          <button class="paper action-card" type="button" on:click={() => (activeSection = "orders")}>
            <ClipboardList size={24} />
            <span class="label">Kitchen queue</span>
            <strong>{orders.filter((order) => order.status === "paid" || order.status === "cooking").length}</strong>
            <p>Paid and cooking tickets that need operational attention.</p>
          </button>
          <button class="paper action-card" type="button" on:click={() => (activeSection = "orders")}>
            <PackageSearch size={24} />
            <span class="label">Delivery queue</span>
            <strong>{orders.filter((order) => order.status === "ready" || order.status === "on_the_way").length}</strong>
            <p>Ready pickups and couriers already on the way.</p>
          </button>
          <button class="paper action-card" type="button" on:click={() => (activeSection = "staff")}>
            <UsersRound size={24} />
            <span class="label">Team access</span>
            <strong>{team.length}</strong>
            <p>Owner, admin, kitchen, and courier profiles in the workspace.</p>
          </button>
        </section>
      {:else if activeSection === "orders"}
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
                  <h3 class="subhead">Order #{order.id.slice(0, 8)}</h3>
                  <p>{order.deliveryType} · {order.phone ?? "No phone"} · {order.address ?? "No address"}</p>
                </div>
                <strong>{formatMoney(order.totalPrice)}</strong>
              </div>

              <ul>
                {#each order.items as item}
                  <li>{item.quantity} × {item.product?.name ?? "Product"} · {formatMoney(item.price)}</li>
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
      {:else if activeSection === "finance"}
        <section class="finance-grid">
          <article class="paper finance-hero">
            <span class="label">Net flow</span>
            <h3>{formatMoney(paidRevenue)}</h3>
            <div class="bars" aria-hidden="true">
              <span style="height: 34%"></span>
              <span style="height: 48%"></span>
              <span style="height: 42%"></span>
              <span style="height: 68%"></span>
              <span style="height: 82%"></span>
              <span style="height: 100%"></span>
            </div>
          </article>
          <article class="paper panel">
            <span class="label">Payments</span>
            <h3 class="subhead">Order mix</h3>
            <p>Cash: {orders.filter((order) => order.paymentType === "cash").length}</p>
            <p>Card: {orders.filter((order) => order.paymentType === "card").length}</p>
          </article>
          <article class="paper panel">
            <span class="label">Next backend step</span>
            <h3 class="subhead">Finance ledger</h3>
            <p>This panel is ready for a real finance endpoint with periods, expenses, refunds, and export.</p>
          </article>
        </section>
      {:else if activeSection === "catalog"}
        <section class="catalog-grid">
          {#each products as product}
            <article class="paper catalog-card">
              <span class="label">{product.categories?.[0]?.name ?? "Menu"}</span>
              <h3>{product.name}</h3>
              <p>{product.description ?? "No description yet."}</p>
              <strong>{formatMoney(product.price)}</strong>
            </article>
          {/each}
        </section>
      {:else if activeSection === "inventory"}
        <section class="table-panel paper">
          <div class="section-title">
            <div>
              <span class="label">Inventory</span>
              <h3 class="subhead">Stock levels</h3>
            </div>
            <span class="label">{lowStock.length} low</span>
          </div>
          <div class="data-table">
            {#each inventory as item}
              <div class:warning={Number(item.quantity) <= 10}>
                <span>{item.name}</span>
                <strong>{item.quantity} {item.unit}</strong>
              </div>
            {/each}
          </div>
        </section>
      {:else if activeSection === "staff"}
        <section class="staff-grid">
          {#each team as member}
            <article class="paper staff-card">
              <div class="avatar">{member.name.slice(0, 1)}</div>
              <div>
                <span class="label">{member.role}</span>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>
            </article>
          {/each}
          <article class="paper panel">
            <span class="label">Customers</span>
            <h3 class="subhead">{customers.length} profiles</h3>
            <p>Customer management can become a separate page with search, segments, and review controls.</p>
          </article>
        </section>
      {:else}
        <section class="settings-grid">
          <article class="paper panel wide">
            <span class="label">Brand identity</span>
            <h3 class="subhead">LuxeEats settings</h3>
            <p>Restaurant name, service hours, delivery zones, payment modes, and notification preferences belong here.</p>
          </article>
          <article class="paper panel">
            <span class="label">Access model</span>
            <h3 class="subhead">Role split</h3>
            <p>Owner sees finance and staff. Admin manages operations. Chef and courier get focused order queues.</p>
          </article>
        </section>
      {/if}
    {/if}
  </section>
</main>

<style>
  .dashboard-shell {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: calc(100vh - 88px);
  }

  .dashboard-sidebar {
    position: sticky;
    top: 88px;
    display: flex;
    height: calc(100vh - 88px);
    flex-direction: column;
    gap: 26px;
    border-right: 1px solid rgba(124, 87, 48, 0.18);
    background: rgba(239, 238, 235, 0.72);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 30px 24px;
  }

  .dashboard-sidebar::-webkit-scrollbar {
    width: 8px;
  }

  .dashboard-sidebar::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(124, 87, 48, 0.24);
  }

  .dashboard-brand {
    color: var(--primary);
    font-family: var(--font-logo);
    font-size: 2.1rem;
    font-weight: 700;
    line-height: 1;
  }

  .dashboard-sidebar h1 {
    margin: 8px 0 0;
    font-family: var(--font-heading);
    font-size: 1.9rem;
  }

  .dashboard-nav {
    display: grid;
    gap: 8px;
  }

  .dashboard-nav button {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    gap: 10px;
    padding: 0.8rem 0.9rem;
    text-align: left;
  }

  .dashboard-nav button.active,
  .dashboard-nav button:hover {
    border-color: rgba(124, 87, 48, 0.24);
    background: var(--surface-container-lowest);
    color: var(--primary);
  }

  .sidebar-note {
    margin-top: auto;
    border-left: 3px solid var(--secondary);
    background: var(--surface-container-lowest);
    padding: 18px;
  }

  .sidebar-note strong,
  .sidebar-note p {
    display: block;
    margin: 6px 0 0;
  }

  .dashboard-content {
    min-width: 0;
    padding: clamp(28px, 5vw, 64px);
  }

  .dashboard-header,
  .section-title,
  .order-top,
  .order-actions {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
  }

  .dashboard-header {
    margin-bottom: 34px;
  }

  .dashboard-header h2 {
    margin: 0;
  }

  .header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .overview-grid,
  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .metric-card,
  .panel,
  .order-card,
  .table-panel,
  .catalog-card,
  .staff-card,
  .empty-state,
  .stats article {
    padding: 24px;
  }

  .metric-card {
    position: relative;
    overflow: hidden;
    background: var(--surface-container-low);
    color: var(--primary);
    cursor: pointer;
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

  .metric-card::before {
    position: absolute;
    top: 24px;
    left: 0;
    width: 4px;
    height: 48px;
    background: var(--secondary);
    content: "";
  }

  .metric-card.featured {
    grid-column: span 2;
  }

  .metric-card.dark {
    background: var(--primary);
    color: var(--secondary-soft);
  }

  .metric-card strong,
  .stats strong,
  .order-top strong,
  .finance-hero h3 {
    display: block;
    color: var(--secondary);
    font-family: var(--font-heading);
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1.05;
    margin-top: 8px;
  }

  .metric-card.dark strong {
    color: var(--secondary-soft);
  }

  .metric-card p,
  .panel p,
  .catalog-card p,
  .staff-card p,
  .order-top p,
  li {
    color: var(--muted);
    line-height: 1.7;
  }

  .content-grid,
  .finance-grid,
  .settings-grid,
  .ops-grid {
    display: grid;
    grid-template-columns: 1.35fr 0.65fr;
    gap: 18px;
  }

  .ops-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 18px;
  }

  .wide {
    grid-column: span 1;
  }

  .compact-list,
  .orders,
  .data-table {
    display: grid;
    gap: 14px;
  }

  .compact-row,
  .data-table div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid rgba(124, 87, 48, 0.16);
    padding-bottom: 12px;
  }

  .compact-row span {
    display: block;
    color: var(--muted);
    margin-top: 4px;
  }

  .section-title button,
  .panel button {
    border: 0;
    background: transparent;
    color: var(--secondary);
    cursor: pointer;
    font-family: var(--font-body);
    text-transform: uppercase;
  }

  .action-card {
    display: grid;
    gap: 12px;
    border: 1px solid rgba(124, 87, 48, 0.18);
    background: var(--surface-container-low);
    color: var(--primary);
    cursor: pointer;
    font-family: var(--font-body);
    text-align: left;
    text-transform: none;
  }

  .action-card strong {
    color: var(--secondary);
    font-family: var(--font-heading);
    font-size: 2.2rem;
    line-height: 1;
  }

  .order-card {
    display: grid;
    gap: 20px;
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
    font-family: var(--font-body);
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

  .finance-hero {
    grid-row: span 2;
    min-height: 430px;
    overflow: hidden;
    padding: 34px;
  }

  .bars {
    display: flex;
    height: 220px;
    align-items: end;
    gap: 12px;
    margin-top: 42px;
    border-bottom: 1px solid rgba(124, 87, 48, 0.26);
  }

  .bars span {
    flex: 1;
    background: var(--surface-container-high);
  }

  .bars span:last-child {
    background: var(--primary);
  }

  .catalog-grid,
  .staff-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .catalog-card h3,
  .staff-card h3 {
    margin: 8px 0;
    font-family: var(--font-heading);
    font-size: 1.45rem;
  }

  .catalog-card strong {
    color: var(--secondary);
  }

  .data-table div.warning {
    color: var(--error);
  }

  .staff-card {
    display: flex;
    gap: 16px;
  }

  .avatar {
    display: grid;
    flex: 0 0 auto;
    width: 54px;
    height: 54px;
    place-items: center;
    border-radius: 999px;
    background: var(--tertiary);
    color: var(--secondary);
    font-family: var(--font-heading);
    font-size: 1.5rem;
  }

  .empty-state {
    display: grid;
    max-width: 760px;
    gap: 18px;
  }

  @media (max-width: 1050px) {
    .dashboard-shell {
      grid-template-columns: 1fr;
    }

    .dashboard-sidebar {
      position: static;
      height: auto;
      max-height: none;
      overflow: visible;
      overscroll-behavior: auto;
    }

    .dashboard-nav {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .overview-grid,
    .stats,
    .catalog-grid,
    .staff-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .content-grid,
    .finance-grid,
    .settings-grid,
    .ops-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .dashboard-content {
      padding: 24px 18px;
    }

    .dashboard-nav,
    .overview-grid,
    .stats,
    .catalog-grid,
    .staff-grid {
      grid-template-columns: 1fr;
    }

    .metric-card.featured {
      grid-column: span 1;
    }

    .dashboard-header,
    .section-title,
    .order-top,
    .order-actions,
    .compact-row,
    .data-table div {
      display: grid;
    }
  }
</style>

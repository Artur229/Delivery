<script lang="ts">
  import { ArrowRight, ClipboardList, LayoutDashboard, LogIn, LogOut, UserRound } from "@lucide/svelte";
  import { authStore, user } from "$lib/stores/auth";

  $: workspaceHref =
    $user?.role === "courier" ? "/courier" : $user?.role === "chef" ? "/chef" : "/admin";
  $: canSeeWorkspace =
    $user?.role === "owner" ||
    $user?.role === "admin" ||
    $user?.role === "chef" ||
    $user?.role === "courier";
</script>

<main class="account-page">
  {#if $user}
    <section class="account-hero">
      <div>
        <span class="label">Account</span>
        <h1>{$user.name}</h1>
        <p>{$user.email}</p>
      </div>
      <div class="role-card">
        <span class="status-dot"></span>
        <div>
          <strong>{$user.role}</strong>
          <span>Signed in</span>
        </div>
      </div>
    </section>

    <section class="account-grid">
      <a class="paper account-action" href={`/profile/${$user.slug}`}>
        <UserRound size={24} />
        <div>
          <span class="label">Profile</span>
          <strong>Manage your details</strong>
          <p>Update your phone, address, and profile information.</p>
        </div>
        <ArrowRight size={18} />
      </a>

      <a class="paper account-action" href="/orders">
        <ClipboardList size={24} />
        <div>
          <span class="label">Orders</span>
          <strong>Track your orders</strong>
          <p>Follow active orders and check their current status.</p>
        </div>
        <ArrowRight size={18} />
      </a>

      {#if canSeeWorkspace}
        <a class="paper account-action" href={workspaceHref}>
          <LayoutDashboard size={24} />
          <div>
            <span class="label">Workspace</span>
            <strong>Open your dashboard</strong>
            <p>Continue in the workspace connected to your role.</p>
          </div>
          <ArrowRight size={18} />
        </a>
      {/if}

      <button class="paper account-action logout-action" on:click={authStore.logout}>
        <LogOut size={24} />
        <div>
          <span class="label">Session</span>
          <strong>Sign out</strong>
          <p>Leave this account on the current device.</p>
        </div>
      </button>
    </section>
  {:else}
    <section class="guest-card paper">
      <span class="label">Account</span>
      <h1 class="display">Your place is ready.</h1>
      <p class="body-lg">
        Sign in to track orders, save delivery details, and keep your basket connected across devices.
      </p>
      <div class="guest-actions">
        <a class="primary-button" href="/login">
          <LogIn size={18} /> Sign in
        </a>
        <a class="secondary-button" href="/register">Create account</a>
      </div>
    </section>
  {/if}
</main>

<style>
  .account-page {
    width: min(100% - 32px, 1040px);
    margin: 0 auto;
    padding: clamp(34px, 7vw, 76px) 0;
  }

  .account-hero {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .account-hero h1,
  .guest-card h1 {
    margin: 8px 0 12px;
    font-family: var(--font-heading);
    font-size: clamp(3rem, 8vw, 5.8rem);
    line-height: 0.95;
  }

  .account-hero p,
  .account-action p {
    color: var(--muted);
    line-height: 1.7;
  }

  .role-card {
    display: flex;
    min-width: 220px;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(124, 87, 48, 0.22);
    background: var(--surface-container-low);
    padding: 18px;
  }

  .role-card strong,
  .role-card span {
    display: block;
  }

  .role-card span:last-child {
    color: var(--muted);
    margin-top: 4px;
  }

  .account-grid {
    display: grid;
    gap: 14px;
  }

  .account-action {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 18px;
    align-items: center;
    padding: 22px;
    text-align: left;
  }

  .account-action strong {
    display: block;
    margin: 5px 0;
    font-family: var(--font-heading);
    font-size: 1.65rem;
  }

  .logout-action {
    width: 100%;
    border: 1px solid rgba(124, 87, 48, 0.18);
    color: inherit;
    cursor: pointer;
  }

  .guest-card {
    display: grid;
    max-width: 780px;
    gap: 18px;
    padding: clamp(26px, 6vw, 52px);
  }

  .guest-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }

  @media (max-width: 720px) {
    .account-hero,
    .account-action {
      display: grid;
    }

    .role-card {
      min-width: 0;
    }

    .account-action {
      grid-template-columns: 1fr;
    }

    .guest-actions a {
      width: 100%;
    }
  }
</style>

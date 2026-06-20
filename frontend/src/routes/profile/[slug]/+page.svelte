<script lang="ts">
  import { MapPin, Phone, Shield } from "@lucide/svelte";
  import { user } from "$lib/stores/auth";
</script>

<main class="page-shell profile-page">
  <header>
    <span class="label">Personal journal</span>
    <h1 class="display">Your profile</h1>
  </header>

  {#if !$user}
    <section class="paper empty">
      <h2 class="headline">Sign in to view your journal.</h2>
      <a class="primary-button" href="/login">Sign in</a>
    </section>
  {:else}
    <section class="profile-grid">
      <aside class="paper profile-card">
        <div class="avatar">
          {#if $user.cover}
            <img src={$user.cover} alt={$user.name} />
          {:else}
            <span>{$user.name.slice(0, 1)}</span>
          {/if}
        </div>
        <h2 class="subhead">{$user.name}</h2>
        <span class="chip">{$user.role}</span>
        <div class="profile-line">
          <MapPin size={18} />
          <p>{$user.address ?? "No address yet"}</p>
        </div>
        <div class="profile-line">
          <Phone size={18} />
          <p>{$user.phone ?? "No phone yet"}</p>
        </div>
        <div class="profile-line">
          <Shield size={18} />
          <p>{$user.email}</p>
        </div>
      </aside>
      <section class="journal">
        <article class="paper">
          <span class="label">Saved taste</span>
          <h3 class="headline">Your saved details</h3>
          <p class="body-lg">
            Keep your delivery details close, review your account information, and make
            future orders feel a little easier.
          </p>
        </article>
      </section>
    </section>
  {/if}
</main>

<style>
  .profile-page {
    padding-top: 64px;
  }

  header {
    margin-bottom: 42px;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 32px;
  }

  .profile-card,
  .journal article,
  .empty {
    padding: 28px;
  }

  .avatar {
    display: grid;
    width: 136px;
    height: 136px;
    place-items: center;
    border: 2px solid rgba(124, 87, 48, 0.24);
    border-radius: 999px;
    margin-bottom: 24px;
    overflow: hidden;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    color: var(--secondary);
    font-family: "Playfair Display", serif;
    font-size: 4rem;
  }

  .profile-line {
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(124, 87, 48, 0.14);
    color: var(--muted);
    gap: 12px;
    padding: 18px 0;
  }

  @media (max-width: 850px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

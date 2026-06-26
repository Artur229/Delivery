<script lang="ts">
  import { MapPin, Phone, Save, Shield } from "@lucide/svelte";
  import { authStore, user } from "$lib/stores/auth";

  let phone = "";
  let address = "";
  let message = "";
  let error = "";
  let isSaving = false;

  $: if ($user) {
    phone = phone || $user.phone || "";
    address = address || $user.address || "";
  }

  const saveProfile = async () => {
    error = "";
    message = "";
    isSaving = true;

    try {
      await authStore.updateProfile({
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      message = "Profile details saved.";
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not save profile.";
    } finally {
      isSaving = false;
    }
  };
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
        <form class="paper details-form" on:submit|preventDefault={saveProfile}>
          <span class="label">Delivery details</span>
          <label>
            <span class="label">Phone</span>
            <input class="ink-input" bind:value={phone} autocomplete="tel" placeholder="+380..." />
          </label>
          <label>
            <span class="label">Address</span>
            <textarea
              class="ink-input"
              bind:value={address}
              autocomplete="street-address"
              placeholder="City, street, building"
              rows="3"
            ></textarea>
          </label>
          {#if message}
            <p class="form-success">{message}</p>
          {/if}
          {#if error}
            <p class="form-error">{error}</p>
          {/if}
          <button class="primary-button" disabled={isSaving} type="submit">
            <Save size={17} /> {isSaving ? "Saving..." : "Save details"}
          </button>
        </form>
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
  .details-form,
  .empty {
    padding: 28px;
  }

  .journal {
    display: grid;
    gap: 18px;
  }

  .details-form {
    display: grid;
    gap: 22px;
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
    font-family: var(--font-heading);
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

  .form-success {
    color: #3b6d32;
    font-size: 0.9rem;
    margin: 0;
  }

  @media (max-width: 850px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

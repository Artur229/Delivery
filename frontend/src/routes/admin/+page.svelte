<script lang="ts">
  const sections = ["Users", "Products", "Categories", "Tags", "Inventory", "Orders", "Reviews", "Chat"];
</script>

<main class="page-shell admin-page">
  <header>
    <span class="label">Admin</span>
    <h1 class="display">Back of house</h1>
    <p class="body-lg">
      Manage the daily rhythm of the kitchen, from menu updates to orders, reviews,
      stock, and team access.
    </p>
  </header>
  <section class="admin-grid">
    {#each sections as section}
      <article class="paper">
        <span class="label">{section}</span>
        <h2 class="subhead">{section}</h2>
        <p>Tools for keeping this area organized and up to date.</p>
      </article>
    {/each}
  </section>
</main>

<style>
  .admin-page {
    padding-top: 64px;
  }

  header {
    max-width: 850px;
    margin-bottom: 42px;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
  }

  article {
    padding: 22px;
  }

  p {
    color: var(--muted);
  }

  @media (max-width: 950px) {
    .admin-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .admin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

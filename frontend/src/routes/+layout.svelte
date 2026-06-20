<script lang="ts">
  import { onMount } from "svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import ToastHost from "$lib/components/ToastHost.svelte";
  import { page } from "$app/stores";
  import { authStore, user } from "$lib/stores/auth";
  import { cartStore } from "$lib/stores/cart";
  import { connectSocket } from "$lib/stores/socket";
  import "$lib/styles/app.css";

  onMount(async () => {
    const currentUser = await authStore.loadMe();

    await cartStore.load().catch(() => undefined);

    if (currentUser) {
      connectSocket();
    }
  });

  $: isDashboard = $page.url.pathname.startsWith("/admin");
</script>

<Header />
<slot />
<ToastHost />
{#if !isDashboard}
  <Footer />
{/if}

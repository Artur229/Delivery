<script lang="ts">
  import { onMount } from "svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import { authStore, user } from "$lib/stores/auth";
  import { cartStore } from "$lib/stores/cart";
  import { connectSocket } from "$lib/stores/socket";
  import "$lib/styles/app.css";

  onMount(async () => {
    const currentUser = await authStore.loadMe();

    if (currentUser) {
      await cartStore.load().catch(() => undefined);
      connectSocket();
    }
  });
</script>

<Header />
<slot />
<Footer />

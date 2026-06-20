<script lang="ts">
  import { onMount } from "svelte";
  import type { Map } from "leaflet";

  export let address = "";
  export let onAddress: (value: string) => void = () => {};

  let element: HTMLDivElement;
  let map: Map;

  onMount(() => {
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled) {
        return;
      }

      map = L.map(element).setView([50.4501, 30.5234], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      const marker = L.marker([50.4501, 30.5234], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        const nextAddress = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
        onAddress(nextAddress);
      });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  });
</script>

<div class="map-wrap paper">
  <div bind:this={element} class="map-box"></div>
  <p>{address || "Drag the marker to attach a delivery point."}</p>
</div>

<style>
  .map-wrap {
    position: relative;
    z-index: 0;
    padding: 12px;
  }

  p {
    color: var(--muted);
    font-family: "Space Mono", monospace;
    font-size: 0.75rem;
    margin: 12px 4px 4px;
    text-transform: uppercase;
  }
</style>

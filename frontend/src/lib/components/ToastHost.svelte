<script lang="ts">
  import { CheckCircle2, Info, X, XCircle } from "@lucide/svelte";
  import { toastStore, type ToastTone } from "$lib/stores/toast";

  const iconFor = (tone: ToastTone) => {
    if (tone === "success") return CheckCircle2;
    if (tone === "error") return XCircle;
    return Info;
  };
</script>

<div class="toast-host" aria-live="polite" aria-atomic="true">
  {#each $toastStore as toast (toast.id)}
    {@const Icon = iconFor(toast.tone)}
    <article class={`toast ${toast.tone}`}>
      <div class="toast-icon">
        <Icon size={18} />
      </div>
      <div>
        <strong>{toast.title}</strong>
        {#if toast.message}
          <p>{toast.message}</p>
        {/if}
      </div>
      <button aria-label="Dismiss notification" on:click={() => toastStore.remove(toast.id)}>
        <X size={15} />
      </button>
    </article>
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    top: 104px;
    right: max(20px, calc((100vw - 1320px) / 2));
    z-index: 60;
    display: grid;
    width: min(360px, calc(100vw - 32px));
    gap: 12px;
    pointer-events: none;
  }

  .toast {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) 30px;
    gap: 12px;
    align-items: start;
    border: 1px solid rgba(124, 87, 48, 0.22);
    border-radius: 18px 12px 22px 10px;
    background: rgba(250, 249, 246, 0.96);
    box-shadow: 0 20px 60px rgba(24, 27, 25, 0.14);
    padding: 14px;
    pointer-events: auto;
    animation: toast-in 0.34s cubic-bezier(0.18, 0.89, 0.32, 1.18);
  }

  .toast-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 999px;
    background: var(--tertiary);
    color: var(--secondary);
  }

  .toast.success .toast-icon {
    background: #e4efdf;
    color: #3b6d32;
  }

  .toast.error .toast-icon {
    background: #f8dedc;
    color: var(--error);
  }

  strong {
    display: block;
    color: var(--primary);
    font-family: "Space Mono", monospace;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  p {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.45;
    margin: 0.25rem 0 0;
  }

  button {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.96);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 760px) {
    .toast-host {
      top: 84px;
      right: 16px;
    }
  }
</style>

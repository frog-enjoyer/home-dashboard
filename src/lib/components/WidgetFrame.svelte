<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { WidgetState } from '$lib/widgets/types';

  interface Props {
    title: string;
    /** Unused now that GridStack positions the wrapper; kept for callers. */
    area?: string;
    state: WidgetState<T>;
    tag?: string;
    tagClass?: string;
    /** Rendered on status 'ok'. Receives (data, stale). */
    children: Snippet<[T, boolean]>;
    /** Optional custom empty state; falls back to a generic hint. */
    empty?: Snippet;
    /** Hint shown in the default empty state, e.g. "press [n] to add". */
    emptyHint?: string;
    onretry?: () => void;
  }

  // area is accepted but unused (GridStack handles placement).
  let { title, state, tag, tagClass, children, empty, emptyHint, onretry }: Props = $props();

  function reauth() {
    // Full-page navigation re-triggers Cloudflare Access and returns here.
    location.reload();
  }
</script>

<section class="pane">
  <div class="pane-h">
    <span class="pane-t"><span class="pre">~/</span><b>{title}</b></span>
    {#if state.status === 'ok' && state.stale}
      <span class="tag warn">⟳ stale · refreshing</span>
    {:else if tag}
      <span class="tag {tagClass ?? ''}">{tag}</span>
    {/if}
  </div>
  <div class="pane-body">
    {#if state.status === 'loading'}
      <div class="wf-skeleton" aria-label="loading">
        <span></span><span></span><span></span>
      </div>
    {:else if state.status === 'ok'}
      {@render children(state.data, state.stale)}
    {:else if state.status === 'empty'}
      {#if empty}{@render empty()}{:else}
        <div class="wf-empty">— nothing yet —{#if emptyHint}<br /><span class="hint">{emptyHint}</span>{/if}</div>
      {/if}
    {:else if state.status === 'auth-expired'}
      <div class="wf-auth">
        <div>session expired</div>
        <button onclick={reauth}>↻ sign in</button>
      </div>
    {:else if state.status === 'error'}
      <div class="wf-error">
        ⚠ {state.message}
        {#if onretry}<button onclick={onretry}>retry</button>{/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .wf-skeleton { display: flex; flex-direction: column; gap: 8px; }
  .wf-skeleton span {
    height: 12px; border-radius: 3px; background: var(--inset);
    animation: pulse 1.3s ease-in-out infinite;
  }
  .wf-skeleton span:nth-child(2) { width: 70%; }
  .wf-skeleton span:nth-child(3) { width: 45%; }
  @keyframes pulse { 50% { opacity: 0.45; } }

  .wf-empty { color: var(--faint); font-size: 11px; }
  .wf-empty .hint { color: var(--dim); }

  .wf-auth { display: flex; flex-direction: column; gap: 8px; color: var(--orange); }
  .wf-error { display: flex; flex-direction: column; gap: 8px; color: var(--red); font-size: 11px; }

  button {
    align-self: flex-start; font-family: var(--mono); font-size: 11px;
    color: var(--cyan); background: transparent; border: 1px solid var(--line-2);
    border-radius: 4px; padding: 3px 8px; cursor: pointer;
  }
  button:hover { border-color: var(--cyan); }
</style>

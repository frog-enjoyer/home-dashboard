<script lang="ts">
  import { configState } from '$lib/stores/config.svelte';
  let links = $derived(configState.cfg.settings.links);
</script>

<section class="pane">
  <div class="pane-h">
    <span class="pane-t"><span class="pre">~/</span><b>links</b></span>
    <span class="tag">{links.length}</span>
  </div>
  <div class="pane-body">
    {#if links.length === 0}
      <div class="muted">— add links in ⚙ settings —</div>
    {:else}
      <div class="grid">
        {#each links as l}
          <a class="lnk" href={l.url} title={l.url}>{l.label}</a>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .grid { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
  .lnk {
    font-family: var(--mono); font-size: 12px; color: var(--cyan);
    background: var(--inset); border: 1px solid var(--line); border-radius: 4px;
    padding: 5px 10px; text-decoration: none;
  }
  .lnk:hover { border-color: var(--cyan); background: var(--panel-h); }
  .muted { color: var(--faint); font-size: 11px; }
</style>

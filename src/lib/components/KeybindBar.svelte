<script lang="ts">
  interface Props {
    syncedAgo?: string;
    editing?: boolean;
    onsettings?: () => void;
    onedit?: () => void;
  }
  let { syncedAgo = 'just now', editing = false, onsettings, onedit }: Props = $props();
</script>

<div class="botbar">
  <button class="kb" onclick={onsettings}><b>⚙</b> settings</button>
  <button class="kb" class:active={editing} onclick={onedit}>
    <b>✎</b> {editing ? 'done editing' : 'edit layout'}
  </button>
  <span class="grow"></span>
  <span class="sync">↻ synced {syncedAgo}</span>
  <span><b>SWR</b> on</span>
</div>

<style>
  .botbar {
    display: flex; align-items: center; gap: 12px; background: var(--panel-h);
    border-top: 1px solid var(--line); padding: 0 12px; height: 28px; flex: none;
    font-size: 10.5px; color: var(--faint);
  }
  .kb {
    font-family: var(--mono); font-size: 10.5px; color: var(--faint);
    background: transparent; border: 0; cursor: pointer; padding: 0;
  }
  .kb b { color: var(--blue); }
  .kb:hover { color: var(--ink); }
  .kb.active { color: var(--green); }
  .kb.active b { color: var(--green); }
  .grow { flex: 1; }
  .sync { color: var(--green); }
  span b { color: var(--blue); }
</style>

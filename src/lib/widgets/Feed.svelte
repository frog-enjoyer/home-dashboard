<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import { configState } from '$lib/stores/config.svelte';
  import type { NewsItem } from '$lib/news-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<NewsItem[]>>({ status: 'loading' });
  let nonce = $state(0);
  let active = $state('all'); // 'all' or a source label

  // Tabs come from the configured feeds (stable order), with 'all' first.
  let tabs = $derived(['all', ...configState.cfg.settings.rssFeeds.map((f) => f.label)]);

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<NewsItem[]>('/api/news');
        if (cancelled) return;
        state = data.length ? { status: 'ok', data, stale } : { status: 'empty' };
      } catch (e) {
        if (cancelled) return;
        state =
          e instanceof AuthExpiredError
            ? { status: 'auth-expired' }
            : { status: 'error', message: String(e) };
      }
    })();
    const id = setInterval(() => (nonce += 1), 900_000); // 15 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });

  function count(items: NewsItem[], tab: string): number {
    return tab === 'all' ? items.length : items.filter((i) => i.source === tab).length;
  }
  function ago(ts: number): string {
    if (!ts) return '';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }
  function srcClass(src: string): string {
    const m: Record<string, string> = { BBC: 'bbc', HN: 'hn', RDT: 'rdt', SEC: 'sec' };
    return m[src] ?? '';
  }
</script>

<WidgetFrame title="feed" tag="tail -f" {state} onretry={() => (nonce += 1)}>
  {#snippet children(items)}
    {@const shown = active === 'all' ? items : items.filter((i) => i.source === active)}
    <nav class="tabs">
      {#each tabs as tab}
        <button class="tab" class:active={active === tab} onclick={() => (active = tab)}>
          {tab}<span class="cnt">{count(items, tab)}</span>
        </button>
      {/each}
    </nav>
    {#if shown.length === 0}
      <div class="none">— no items from {active} —</div>
    {:else}
      <ul class="log">
        {#each shown as it (it.link + it.title)}
          <li>
            <span class="ts">{ago(it.ts)}</span>
            {#if active === 'all'}<span class="src {srcClass(it.source)}">{it.source}</span>{/if}
            <a class="ttl" href={it.link} target="_blank" rel="noreferrer noopener">{it.title}</a>
          </li>
        {/each}
      </ul>
    {/if}
  {/snippet}
</WidgetFrame>

<style>
  .tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; flex: none; }
  .tab {
    font-family: var(--mono); font-size: 10px; text-transform: lowercase;
    color: var(--faint); background: transparent; border: 1px solid var(--line);
    border-radius: 4px; padding: 2px 7px; cursor: pointer; display: flex; gap: 5px; align-items: center;
  }
  .tab:hover { color: var(--dim); border-color: var(--line-2); }
  .tab.active { color: var(--cyan); border-color: var(--cyan); }
  .cnt { color: var(--faint); font-size: 9px; }
  .tab.active .cnt { color: var(--cyan); }
  .log { list-style: none; overflow-y: auto; }
  li { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
  li:last-child { border: 0; }
  .ts { color: var(--faint); flex: none; width: 28px; font-size: 11px; }
  .src { flex: none; width: 34px; font-size: 10px; color: var(--mag); }
  .src.bbc { color: var(--cyan); }
  .src.hn { color: var(--orange); }
  .src.rdt { color: var(--red); }
  .src.sec { color: var(--green); }
  .ttl { color: var(--ink); font-size: 12.5px; text-decoration: none; }
  .ttl:hover { color: var(--cyan); text-decoration: underline; }
  .none { color: var(--faint); font-size: 11px; }
</style>

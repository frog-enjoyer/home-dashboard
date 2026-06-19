<script lang="ts">
  import { configState, saveConfig } from '$lib/stores/config.svelte';
  import type { WidgetSettings } from '$lib/config-schema';

  let { onclose }: { onclose: () => void } = $props();

  let draft = $state<WidgetSettings>(structuredClone($state.snapshot(configState.cfg.settings)));
  let saving = $state(false);
  let err = $state('');

  let newFeedLabel = $state('');
  let newFeedUrl = $state('');
  let newTickerSym = $state('');
  let newTickerLabel = $state('');
  let newLinkLabel = $state('');
  let newLinkUrl = $state('');

  async function geocode() {
    err = '';
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          draft.weatherLocation.name
        )}&count=1`
      );
      const j = (await r.json()) as any;
      const hit = j.results?.[0];
      if (hit) draft.weatherLocation = { name: hit.name, lat: hit.latitude, lon: hit.longitude };
      else err = 'city not found';
    } catch {
      err = 'lookup failed';
    }
  }

  function addFeed() {
    if (!newFeedUrl.trim()) return;
    draft.rssFeeds = [
      ...draft.rssFeeds,
      { label: (newFeedLabel.trim() || 'rss').toUpperCase().slice(0, 4), url: newFeedUrl.trim() }
    ];
    newFeedLabel = '';
    newFeedUrl = '';
  }
  const rmFeed = (i: number) => (draft.rssFeeds = draft.rssFeeds.filter((_, j) => j !== i));

  function addTicker() {
    const symbol = newTickerSym.trim().toUpperCase();
    if (!symbol) return;
    draft.tickers = [...draft.tickers, { symbol, label: newTickerLabel.trim() || symbol }];
    newTickerSym = '';
    newTickerLabel = '';
  }
  const rmTicker = (i: number) => (draft.tickers = draft.tickers.filter((_, j) => j !== i));

  function addLink() {
    let url = newLinkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    const label = newLinkLabel.trim() || url.replace(/^https?:\/\//, '').split('/')[0];
    draft.links = [...draft.links, { label, url }];
    newLinkLabel = '';
    newLinkUrl = '';
  }
  const rmLink = (i: number) => (draft.links = draft.links.filter((_, j) => j !== i));

  async function save() {
    saving = true;
    err = '';
    const ok = await saveConfig({ ...configState.cfg, settings: $state.snapshot(draft) });
    saving = false;
    if (ok) onclose();
    else err = 'save failed — check connection';
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="overlay" onclick={onclose} role="presentation">
  <div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="settings">
    <div class="head">
      <span class="pane-t"><span class="pre">~/</span><b>settings</b></span>
      <button class="x" onclick={onclose} aria-label="close">×</button>
    </div>
    <div class="content">
      <section>
        <h3>owner</h3>
        <div class="row">
          <input bind:value={draft.owner} placeholder="name shown in greeting" aria-label="owner name" />
        </div>
      </section>

      <section>
        <h3>weather location</h3>
        <div class="row">
          <input bind:value={draft.weatherLocation.name} placeholder="city" aria-label="city" />
          <button onclick={geocode}>lookup</button>
        </div>
        <div class="coords">
          {draft.weatherLocation.lat.toFixed(3)}, {draft.weatherLocation.lon.toFixed(3)}
        </div>
      </section>

      <section>
        <h3>news feeds</h3>
        {#each draft.rssFeeds as feed, i}
          <div class="chip"><b>{feed.label}</b> <span>{feed.url}</span><button onclick={() => rmFeed(i)}>×</button></div>
        {/each}
        <div class="row">
          <input bind:value={newFeedLabel} placeholder="tag" class="sm" aria-label="feed label" />
          <input bind:value={newFeedUrl} placeholder="rss/atom url" onkeydown={(e) => e.key === 'Enter' && addFeed()} aria-label="feed url" />
          <button onclick={addFeed}>add</button>
        </div>
      </section>

      <section>
        <h3>tickers</h3>
        {#each draft.tickers as t, i}
          <div class="chip"><b>{t.label}</b> <span>{t.symbol}</span><button onclick={() => rmTicker(i)}>×</button></div>
        {/each}
        <div class="row">
          <input bind:value={newTickerLabel} placeholder="label" class="sm" aria-label="ticker label" />
          <input bind:value={newTickerSym} placeholder="symbol e.g. VWRL.L" onkeydown={(e) => e.key === 'Enter' && addTicker()} aria-label="ticker symbol" />
          <button onclick={addTicker}>add</button>
        </div>
        <div class="coords">tip: use the exchange symbol (LSE = .L, e.g. VWRL.L, VFEM.L)</div>
      </section>

      <section>
        <h3>quick links</h3>
        {#each draft.links as l, i}
          <div class="chip"><b>{l.label}</b> <span>{l.url}</span><button onclick={() => rmLink(i)}>×</button></div>
        {/each}
        <div class="row">
          <input bind:value={newLinkLabel} placeholder="label" class="sm" aria-label="link label" />
          <input bind:value={newLinkUrl} placeholder="url" onkeydown={(e) => e.key === 'Enter' && addLink()} aria-label="link url" />
          <button onclick={addLink}>add</button>
        </div>
      </section>

      {#if err}<div class="err">⚠ {err}</div>{/if}
    </div>
    <div class="foot">
      <button class="ghost" onclick={onclose}>cancel</button>
      <button class="primary" onclick={save} disabled={saving}>{saving ? 'saving…' : 'save'}</button>
    </div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 50; }
  .panel { width: min(520px, 92vw); max-height: 86vh; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line-2); border-radius: 8px; overflow: hidden; }
  .head { display: flex; align-items: center; justify-content: space-between; background: var(--panel-h); border-bottom: 1px solid var(--line); padding: 8px 12px; }
  .content { padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
  h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--faint); margin-bottom: 6px; font-weight: 600; }
  .row { display: flex; gap: 6px; }
  input { flex: 1; background: var(--inset); border: 1px solid var(--line); color: var(--ink); font-family: var(--mono); font-size: 12px; padding: 5px 8px; border-radius: 4px; }
  input.sm { flex: 0 0 80px; }
  input:focus { outline: none; border-color: var(--cyan); }
  .coords { color: var(--faint); font-size: 10px; margin-top: 4px; }
  .chip { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 3px 0; color: var(--dim); }
  .chip b { color: var(--blue); min-width: 44px; }
  .chip span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { font-family: var(--mono); font-size: 11px; color: var(--cyan); background: transparent; border: 1px solid var(--line-2); border-radius: 4px; padding: 4px 9px; cursor: pointer; }
  button:hover { border-color: var(--cyan); }
  .chip button { border: 0; padding: 0 2px; color: var(--faint); }
  .chip button:hover { color: var(--red); }
  .x { border: 0; font-size: 16px; color: var(--faint); padding: 0 4px; }
  .foot { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--line); }
  .primary { color: var(--bg); background: var(--green); border-color: var(--green); }
  .ghost { color: var(--dim); }
  .err { color: var(--red); font-size: 11px; }
</style>

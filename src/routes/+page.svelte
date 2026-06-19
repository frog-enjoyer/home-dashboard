<script lang="ts">
  import '../app.css';
  import 'gridstack/dist/gridstack.min.css';
  import { onMount, tick, type Component } from 'svelte';

  import StatusBar from '$lib/components/StatusBar.svelte';
  import KeybindBar from '$lib/components/KeybindBar.svelte';
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import Clock from '$lib/widgets/Clock.svelte';
  import Weather from '$lib/widgets/Weather.svelte';
  import Todos from '$lib/widgets/Todos.svelte';
  import Feed from '$lib/widgets/Feed.svelte';
  import Markets from '$lib/widgets/Markets.svelte';
  import Trains from '$lib/widgets/Trains.svelte';
  import Links from '$lib/widgets/Links.svelte';
  import Tfl from '$lib/widgets/Tfl.svelte';
  import Rain from '$lib/widgets/Rain.svelte';
  import Football from '$lib/widgets/Football.svelte';
  import Photo from '$lib/widgets/Photo.svelte';
  import DevTools from '$lib/widgets/DevTools.svelte';
  import { emptyHints } from '$lib/dashboard.config';
  import { configState, loadConfig, saveConfig } from '$lib/stores/config.svelte';
  import { DEFAULT_CONFIG, type LayoutItem } from '$lib/config-schema';
  import type { WidgetState } from '$lib/widgets/types';

  // Widgets that are fully built. The rest render a designed empty state.
  const COMPONENTS: Record<string, Component<any> | undefined> = {
    clock: Clock,
    weather: Weather,
    todo: Todos,
    feed: Feed,
    markets: Markets,
    trains: Trains,
    links: Links,
    tfl: Tfl,
    rain: Rain,
    football: Football,
    photo: Photo,
    devtools: DevTools
  };
  const empty: WidgetState<never> = { status: 'empty' };

  let items = $state<LayoutItem[]>([]); // rendered once; GridStack owns the DOM after init
  let editing = $state(false);
  let showSettings = $state(false);
  let gridEl: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let grid: any = null;

  onMount(async () => {
    await loadConfig();
    // Build from enabled widgets; use the saved position, else the default
    // position, else auto-place at the bottom. This guarantees a newly-added
    // widget (e.g. trains) shows up even over an older saved layout.
    const saved = new Map(configState.cfg.layout.map((l) => [l.id, l]));
    const defaults = new Map(DEFAULT_CONFIG.layout.map((l) => [l.id, l]));
    items = configState.cfg.enabled.map(
      (id, i) => saved.get(id) ?? defaults.get(id) ?? { id, x: 0, y: 100 + i, w: 4, h: 4 }
    );
    await tick(); // ensure grid-stack-items are in the DOM

    const { GridStack } = await import('gridstack');
    grid = GridStack.init(
      { column: 12, cellHeight: 64, margin: 5, float: true, staticGrid: true, handle: '.pane-h' },
      gridEl
    );
    applyColumns();
    grid.on('change', persistLayout);
    window.addEventListener('resize', applyColumns);
  });

  function applyColumns() {
    if (!grid) return;
    grid.column(window.innerWidth < 760 ? 1 : 12, 'list');
  }

  async function persistLayout() {
    if (!grid) return;
    const nodes = grid.save(false) as Array<{ id?: string; x?: number; y?: number; w?: number; h?: number }>;
    const layout: LayoutItem[] = nodes
      .filter((n) => n.id)
      .map((n) => ({ id: String(n.id), x: n.x ?? 0, y: n.y ?? 0, w: n.w ?? 1, h: n.h ?? 1 }));
    if (layout.length) await saveConfig({ ...configState.cfg, layout });
  }

  function toggleEdit() {
    editing = !editing;
    grid?.setStatic(!editing);
  }
</script>

<svelte:head><title>command-center</title></svelte:head>

<div class="app">
  <StatusBar user={configState.cfg.settings.owner} cacheWarm={configState.loaded ? 'warm' : 'cold'} edge="LHR" />

  <div class="grid-wrap" class:editing>
    <div class="grid-stack" bind:this={gridEl}>
      {#each items as item (item.id)}
        {@const Comp = COMPONENTS[item.id]}
        <div
          class="grid-stack-item"
          gs-id={item.id}
          gs-x={item.x}
          gs-y={item.y}
          gs-w={item.w}
          gs-h={item.h}
        >
          <div class="grid-stack-item-content">
            {#if Comp}
              <Comp {...(item.id === 'clock' ? { owner: configState.cfg.settings.owner } : {})} />
            {:else}
              <WidgetFrame title={item.id} state={empty} emptyHint={emptyHints[item.id]} />
            {/if}
          </div>
        </div>
      {/each}
    </div>
    {#if editing}
      <div class="edit-hint">drag the pane title to move · drag the corner to resize · changes save automatically</div>
    {/if}
  </div>

  <KeybindBar
    syncedAgo={configState.loaded ? 'live' : '—'}
    {editing}
    onsettings={() => (showSettings = true)}
    onedit={toggleEdit}
  />
</div>

{#if showSettings}
  <Settings onclose={() => (showSettings = false)} />
{/if}

<style>
  .grid-wrap { flex: 1; overflow: auto; background: var(--bg); position: relative; }
  .grid-stack { background: var(--bg); }
  :global(.grid-stack-item-content) { inset: 0; overflow: hidden; display: flex; }
  /* In edit mode, show a movable affordance on the pane title. */
  .grid-wrap.editing :global(.pane-h) { cursor: move; }
  .grid-wrap.editing :global(.pane) { outline: 1px dashed var(--line-2); }
  .edit-hint {
    position: sticky; bottom: 0; text-align: center; font-size: 10px;
    color: var(--cyan); padding: 4px; background: rgba(22, 22, 30, 0.9);
  }
</style>

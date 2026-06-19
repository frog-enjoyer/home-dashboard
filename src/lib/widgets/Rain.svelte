<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import { configState } from '$lib/stores/config.svelte';
  import type { RainData } from '$lib/rain-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<RainData>>({ status: 'loading' });
  let nonce = $state(0);
  let loc = $derived(configState.cfg.settings.weatherLocation);

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<RainData>('/api/rain');
        if (cancelled) return;
        state = { status: 'ok', data, stale };
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

  function headline(d: RainData): { text: string; cls: string } {
    if (d.currentlyRaining) return { text: 'raining now', cls: 'wet' };
    if (d.nextRainMinsFromIso) {
      const mins = Math.max(0, Math.round((new Date(d.nextRainMinsFromIso).getTime() - Date.now()) / 60000));
      return { text: `rain in ${mins}m · ${d.nextRainAt}`, cls: 'soon' };
    }
    return { text: 'dry next 2h', cls: 'dry' };
  }
  const barH = (mm: number, max: number) => (max <= 0 ? 2 : Math.max(2, Math.round((mm / max) * 38)));
</script>

<WidgetFrame title="rain" tag={loc.name} {state} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    {@const h = headline(d)}
    {@const max = Math.max(...d.series.map((s) => s.mm), 0.1)}
    <div class="head {h.cls}">{h.text}</div>
    <div class="sub">peak chance {d.maxProb}%</div>
    <div class="bars">
      {#each d.series as s, i}
        <div class="col">
          <div class="bar" class:on={s.mm > 0} style="height:{barH(s.mm, max)}px" title="{s.t} · {s.mm}mm · {s.prob}%"></div>
          <span class="lbl">{i % 2 === 0 ? s.t.slice(0, 5) : ''}</span>
        </div>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .head { font-size: 16px; font-weight: 600; }
  .head.wet { color: var(--cyan); }
  .head.soon { color: var(--orange); }
  .head.dry { color: var(--green); }
  .sub { color: var(--faint); font-size: 10px; margin-bottom: 6px; }
  .bars { display: flex; gap: 3px; align-items: flex-end; margin-top: auto; height: 44px; }
  .col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
  .bar { width: 100%; background: var(--line-2); border-radius: 2px 2px 0 0; }
  .bar.on { background: var(--cyan); }
  .lbl { color: var(--faint); font-size: 8px; margin-top: 2px; white-space: nowrap; }
</style>

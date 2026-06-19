<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import Sparkline from '$lib/components/Sparkline.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import { configState } from '$lib/stores/config.svelte';
  import { weatherLabel, type WeatherData } from '$lib/weather-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<WeatherData>>({ status: 'loading' });
  let nonce = $state(0);
  let loc = $derived(configState.cfg.settings.weatherLocation);

  $effect(() => {
    const { lat, lon } = loc;
    nonce; // re-run on manual retry
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<WeatherData>(
          `/api/weather?lat=${lat}&lon=${lon}`
        );
        if (!cancelled) state = { status: 'ok', data, stale };
      } catch (e) {
        if (cancelled) return;
        state =
          e instanceof AuthExpiredError
            ? { status: 'auth-expired' }
            : { status: 'error', message: String(e) };
      }
    })();
    const id = setInterval(() => (nonce += 1), 600_000); // 10 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });
</script>

<WidgetFrame title="weather" {state} tag={loc.name} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    <div class="wtop">
      <span class="wt">{d.tempC}°</span>
      <span class="wm">{weatherLabel(d.code)} · feels {d.apparentC}°</span>
    </div>
    <Sparkline values={d.hourly} trend="flat" />
    <div class="wf">
      <span class="hl">↑{d.hi} ↓{d.lo}</span>
      {#each d.daily as day}
        <span class="col">{day.day}<b>{day.hi}°</b></span>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .wtop { display: flex; align-items: baseline; gap: 10px; }
  .wt { font-size: 34px; font-weight: 600; color: var(--orange); }
  .wm { color: var(--dim); font-size: 11px; }
  .wf { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; color: var(--faint); font-size: 10px; }
  .hl { color: var(--dim); }
  .col { text-align: center; }
  .col b { display: block; color: var(--ink); font-size: 12px; }
</style>

<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import type { TrainsData, TrainBoard, TrainService } from '$lib/trains-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<TrainsData>>({ status: 'loading' });
  let nonce = $state(0);
  let tag = $derived(state.status === 'ok' ? `${state.data.fromCode} ⇄ ${state.data.toCode}` : '⇄');

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<TrainsData>('/api/trains');
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
    const id = setInterval(() => (nonce += 1), 180_000); // 3 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });

  function dueIn(s: TrainService): string {
    const t = /^\d\d:\d\d$/.test(s.etd) ? s.etd : s.std;
    const m = /^(\d\d):(\d\d)$/.exec(t);
    if (!m) return '';
    const now = new Date();
    const dep = new Date(now);
    dep.setHours(+m[1], +m[2], 0, 0);
    let diff = Math.round((dep.getTime() - now.getTime()) / 60000);
    if (diff < -180) diff += 1440; // crude midnight wrap
    if (diff < 0) return 'now';
    if (diff > 90) return '';
    return `${diff}m`;
  }
</script>

{#snippet board(b: TrainBoard)}
  <div class="bd">
    <div class="bh">{b.from} <span class="arr">→</span> {b.to}</div>
    {#if b.services.length === 0}
      <div class="muted">no departures</div>
    {:else}
      {#each b.services.slice(0, 4) as s}
        <div class="svc">
          <span class="std">{s.std}</span>
          <span
            class="etd"
            class:ok={s.status === 'ontime'}
            class:late={s.status === 'delayed'}
            class:can={s.status === 'cancelled'}
          >
            {#if s.status === 'ontime'}on time
            {:else if s.status === 'cancelled'}cancelled
            {:else if /^\d\d:\d\d$/.test(s.etd)}exp {s.etd}
            {:else}delayed{/if}
          </span>
          <span class="plat">{s.platform ? `pl ${s.platform}` : ''}</span>
          <span class="due">{dueIn(s)}</span>
        </div>
      {/each}
    {/if}
  </div>
{/snippet}

<WidgetFrame title="trains" {tag} {state} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    <div class="trains">
      {#if d.alerts.length}
        <div class="alerts">
          {#each d.alerts as a}<div class="alert">⚠ {a}</div>{/each}
        </div>
      {/if}
      {@render board(d.outbound)}
      {@render board(d.inbound)}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .trains { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
  .alerts { display: flex; flex-direction: column; gap: 4px; }
  .alert { color: var(--orange); font-size: 10.5px; line-height: 1.35; border-left: 2px solid var(--orange); padding-left: 6px; }
  .bd { display: flex; flex-direction: column; }
  .bh { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--faint); margin-bottom: 4px; }
  .bh .arr { color: var(--blue); }
  .svc { display: grid; grid-template-columns: 42px 1fr 48px 34px; gap: 6px; align-items: baseline; padding: 3px 0; border-bottom: 1px solid var(--line); }
  .svc:last-child { border: 0; }
  .std { color: var(--ink); font-weight: 600; }
  .etd { font-size: 11px; }
  .etd.ok { color: var(--green); }
  .etd.late { color: var(--orange); }
  .etd.can { color: var(--red); text-decoration: line-through; }
  .plat { color: var(--faint); font-size: 10px; }
  .due { color: var(--cyan); font-size: 11px; text-align: right; }
  .muted { color: var(--faint); font-size: 11px; }
</style>

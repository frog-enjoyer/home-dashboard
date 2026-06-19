<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import Sparkline from '$lib/components/Sparkline.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import type { FinanceRow } from '$lib/finance-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<FinanceRow[]>>({ status: 'loading' });
  let nonce = $state(0);

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<FinanceRow[]>('/api/finance');
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
    const id = setInterval(() => (nonce += 1), 180_000); // 3 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });

  const SYM: Record<string, string> = { USD: '$', GBP: '£', GBp: 'p', EUR: '€' };
  function fmt(r: FinanceRow): string {
    const s = SYM[r.currency] ?? '';
    const n = r.price >= 100 ? r.price.toFixed(0) : r.price.toFixed(2);
    return r.currency === 'GBp' ? `${n}p` : `${s}${n}`;
  }
</script>

<WidgetFrame title="markets" tag="● live" tagClass="live" {state} onretry={() => (nonce += 1)}>
  {#snippet children(rows)}
    <div class="mk">
      {#each rows as r (r.symbol)}
        <div class="row">
          <div class="lbl" title={r.symbol}>{r.label}</div>
          {#if r.ok}
            <div class="data">
              <Sparkline values={r.spark} trend={r.changePct >= 0 ? 'up' : 'down'} />
              <span class="px">{fmt(r)}</span>
              <span class="chg" class:up={r.changePct >= 0} class:down={r.changePct < 0}>
                {r.changePct >= 0 ? '+' : ''}{r.changePct.toFixed(1)}%
              </span>
            </div>
          {:else}
            <div class="err">no data</div>
          {/if}
        </div>
      {/each}
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .mk { display: flex; flex-direction: column; }
  .row { padding: 6px 0; border-bottom: 1px solid var(--line); }
  .row:last-child { border: 0; }
  .lbl { color: var(--ink); font-weight: 600; font-size: 12px; margin-bottom: 3px; }
  .data { display: grid; grid-template-columns: 1fr 64px 52px; gap: 8px; align-items: center; }
  .px { color: var(--dim); text-align: right; font-size: 12px; }
  .chg { text-align: right; font-size: 11px; }
  .up { color: var(--green); }
  .down { color: var(--red); }
  .err { color: var(--faint); font-size: 11px; }
</style>

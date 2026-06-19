<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import type { TflData } from '$lib/tfl-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<TflData>>({ status: 'loading' });
  let nonce = $state(0);

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<TflData>('/api/tfl');
        if (cancelled) return;
        state = data.lines.length ? { status: 'ok', data, stale } : { status: 'empty' };
      } catch (e) {
        if (cancelled) return;
        state =
          e instanceof AuthExpiredError
            ? { status: 'auth-expired' }
            : { status: 'error', message: String(e) };
      }
    })();
    const id = setInterval(() => (nonce += 1), 300_000); // 5 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });

  const cls = (sev: number) => (sev >= 10 ? 'good' : sev >= 6 ? 'minor' : 'severe');
</script>

<WidgetFrame title="tfl" tag="lines" {state} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    <ul class="lines">
      {#each d.lines as l}
        <li>
          <span class="dot {cls(l.severity)}">●</span>
          <span class="nm">{l.name}</span>
          <span class="st {cls(l.severity)}">{l.status}</span>
        </li>
      {/each}
    </ul>
  {/snippet}
</WidgetFrame>

<style>
  .lines { list-style: none; overflow-y: auto; }
  li { display: grid; grid-template-columns: 12px 1fr auto; gap: 7px; align-items: baseline; padding: 3px 0; border-bottom: 1px solid var(--line); }
  li:last-child { border: 0; }
  .dot { font-size: 9px; }
  .dot.good { color: var(--green); }
  .dot.minor { color: var(--orange); }
  .dot.severe { color: var(--red); }
  .nm { color: var(--ink); font-size: 12px; }
  .st { font-size: 10px; text-align: right; }
  .st.good { color: var(--faint); }
  .st.minor { color: var(--orange); }
  .st.severe { color: var(--red); }
</style>

<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import type { FootballData, FootballTeam, FootballMatch } from '$lib/football-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<FootballData>>({ status: 'loading' });
  let nonce = $state(0);
  let active = $state<'primary' | 'secondary'>('primary');

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<FootballData>('/api/football');
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
    const id = setInterval(() => (nonce += 1), 1_800_000); // 30 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });

  function opponent(m: FootballMatch, teamName: string): string {
    return m.home.includes(teamName) ? `v ${m.away}` : `@ ${m.home}`;
  }
  function score(m: FootballMatch): string {
    return `${m.homeScore ?? '-'}–${m.awayScore ?? '-'}`;
  }
  function won(m: FootballMatch, teamName: string): 'w' | 'l' | 'd' {
    const us = m.home.includes(teamName) ? m.homeScore : m.awayScore;
    const them = m.home.includes(teamName) ? m.awayScore : m.homeScore;
    if (us == null || them == null) return 'd';
    return us > them ? 'w' : us < them ? 'l' : 'd';
  }
  const dshort = (d: string) => (d ? d.slice(5) : ''); // MM-DD
</script>

<WidgetFrame title="football" tag="⚽" {state} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    {@const team = active === 'primary' ? d.primary : d.secondary}
    <nav class="tabs">
      <button class="tab" class:active={active === 'primary'} onclick={() => (active = 'primary')}>{d.primary.name}</button>
      <button class="tab" class:active={active === 'secondary'} onclick={() => (active = 'secondary')}>{d.secondary.name}</button>
    </nav>

    <div class="sec">next</div>
    {#if team.next.length === 0}
      <div class="muted">no fixtures</div>
    {:else}
      {#each team.next as m}
        <div class="fix">
          <span class="dt">{dshort(m.date)} {m.time}</span>
          <span class="opp">{opponent(m, team.name)}</span>
          <span class="lg">{m.league.replace('English ', '')}</span>
        </div>
      {/each}
    {/if}

    <div class="sec">results</div>
    {#each team.last as m}
      <div class="fix">
        <span class="res {won(m, team.name)}">{won(m, team.name).toUpperCase()}</span>
        <span class="opp">{opponent(m, team.name)}</span>
        <span class="sc">{score(m)}</span>
      </div>
    {/each}
  {/snippet}
</WidgetFrame>

<style>
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; }
  .tab { font-family: var(--mono); font-size: 10px; color: var(--faint); background: transparent; border: 1px solid var(--line); border-radius: 4px; padding: 2px 9px; cursor: pointer; }
  .tab.active { color: var(--cyan); border-color: var(--cyan); }
  .sec { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--faint); margin: 8px 0 3px; }
  .fix { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: baseline; padding: 3px 0; border-bottom: 1px solid var(--line); }
  .fix:last-child { border: 0; }
  .dt { color: var(--cyan); font-size: 11px; }
  .opp { color: var(--ink); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lg, .sc { color: var(--faint); font-size: 10px; text-align: right; }
  .res { font-size: 11px; font-weight: 700; }
  .res.w { color: var(--green); }
  .res.l { color: var(--red); }
  .res.d { color: var(--orange); }
  .muted { color: var(--faint); font-size: 11px; }
</style>

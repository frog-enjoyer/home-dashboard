<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import type { WidgetState } from './types';

  // Owner name comes from runtime config (KV), not committed code.
  let { owner = '' }: { owner?: string } = $props();

  // Client-only widget: ticks locally, no /api, no network. refreshIntervalMs
  // is null for this widget in the dashboard config.
  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(id);
  });

  let state = $derived<WidgetState<Date>>({ status: 'ok', data: now, stale: false });

  const pad = (n: number) => String(n).padStart(2, '0');
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function dayOfYear(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  }
  function greeting(h: number): string {
    if (h < 12) return 'good morning';
    if (h < 18) return 'good afternoon';
    return 'good evening';
  }
</script>

<WidgetFrame title="clock" area="clock" {state} tag="local">
  {#snippet children(d)}
    <div class="clock-body">
      <div class="time">
        {pad(d.getHours())}<span class="c">:</span>{pad(d.getMinutes())}<span class="s"
          >:{pad(d.getSeconds())}</span
        >
      </div>
      <div class="sub">
        {DAYS[d.getDay()]} · {MONTHS[d.getMonth()]} {d.getDate()} {d.getFullYear()} ·
        <b>day {dayOfYear(d)}</b>
      </div>
      <div class="uptime">{greeting(d.getHours())}{owner ? `, ${owner}` : ''}</div>
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .clock-body { display: flex; flex-direction: column; justify-content: center; flex: 1; }
  .time { font-size: 58px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; color: var(--ink); }
  .time .c { color: var(--green); }
  .time .s { color: var(--mag); font-size: 30px; }
  .sub { color: var(--dim); margin-top: 8px; }
  .sub b { color: var(--cyan); }
  .uptime { color: var(--faint); margin-top: 3px; font-size: 11px; }
</style>

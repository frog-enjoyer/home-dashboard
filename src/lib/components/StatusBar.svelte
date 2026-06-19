<script lang="ts">
  // Powerline-style top bar. Surfaces system telemetry as ambient chrome
  // (decided in design review). Values are placeholders until wired to real
  // platform signals; access shows the authenticated user once available.
  interface Props {
    user?: string;
    net?: string;
    edge?: string;
    cacheWarm?: string;
  }
  let { user = 'operator', net = 'cloudflare-access', edge = 'LHR', cacheWarm = '—' }: Props = $props();
</script>

<div class="topbar">
  <div class="seg host">◈ command-center</div>
  <div class="seg"><span class="k">user</span><span class="v">{user}</span></div>
  <div class="seg ok"><span class="k">access</span><span class="v">✓ authed</span></div>
  <div class="seg"><span class="k">net</span><span class="v">{net}</span></div>
  <div class="grow"></div>
  <div class="seg"><span class="k">cache</span><span class="v">{cacheWarm}</span></div>
  <div class="seg ok"><span class="k">edge</span><span class="v">{edge}</span></div>
  <div class="seg"><span class="cursor">▍</span></div>
</div>

<style>
  .topbar {
    display: flex; align-items: center; background: var(--panel-h);
    border-bottom: 1px solid var(--line); font-size: 11px; height: 30px; flex: none;
  }
  .seg { display: flex; align-items: center; gap: 6px; padding: 0 12px; height: 100%; border-right: 1px solid var(--line); }
  .seg.host { color: var(--bg); background: var(--blue); font-weight: 700; }
  .seg .k { color: var(--faint); }
  .seg .v { color: var(--ink); }
  .seg.ok .v { color: var(--green); }
  .grow { flex: 1; }
  .cursor { color: var(--green); animation: blink 1.1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
</style>

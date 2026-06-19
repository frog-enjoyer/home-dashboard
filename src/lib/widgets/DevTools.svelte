<script lang="ts">
  let input = $state('');
  let output = $state('');

  function set(v: string) {
    output = v;
  }
  function err(e: unknown) {
    output = `⚠ ${String(e)}`;
  }

  const b64enc = () => {
    try { set(btoa(unescape(encodeURIComponent(input)))); } catch (e) { err(e); }
  };
  const b64dec = () => {
    try { set(decodeURIComponent(escape(atob(input.trim())))); } catch (e) { err(e); }
  };
  const json = () => {
    try { set(JSON.stringify(JSON.parse(input), null, 2)); } catch (e) { err(e); }
  };
  const epoch = () => {
    const n = Number(input.trim());
    if (!input.trim() || Number.isNaN(n)) return set(new Date().toISOString());
    const ms = n < 1e12 ? n * 1000 : n; // seconds vs ms
    set(new Date(ms).toISOString());
  };
  const uuid = () => set(crypto.randomUUID());
  const sha256 = async () => {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      set([...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''));
    } catch (e) { err(e); }
  };
  const copy = () => navigator.clipboard?.writeText(output);
</script>

<section class="pane">
  <div class="pane-h">
    <span class="pane-t"><span class="pre">~/</span><b>devtools</b></span>
    <button class="cp" onclick={copy} title="copy output">copy</button>
  </div>
  <div class="pane-body">
    <textarea bind:value={input} placeholder="input…" rows="2" spellcheck="false"></textarea>
    <div class="ops">
      <button onclick={b64enc}>b64↑</button>
      <button onclick={b64dec}>b64↓</button>
      <button onclick={json}>json</button>
      <button onclick={epoch}>epoch</button>
      <button onclick={uuid}>uuid</button>
      <button onclick={sha256}>sha256</button>
    </div>
    <pre class="out">{output}</pre>
  </div>
</section>

<style>
  textarea {
    width: 100%; background: var(--inset); border: 1px solid var(--line); color: var(--ink);
    font-family: var(--mono); font-size: 11px; padding: 5px 7px; border-radius: 4px; resize: none;
  }
  textarea:focus { outline: none; border-color: var(--cyan); }
  .ops { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
  .ops button, .cp {
    font-family: var(--mono); font-size: 10px; color: var(--cyan); background: transparent;
    border: 1px solid var(--line-2); border-radius: 4px; padding: 3px 7px; cursor: pointer;
  }
  .ops button:hover, .cp:hover { border-color: var(--cyan); }
  .cp { color: var(--faint); }
  .out {
    flex: 1; min-height: 0; overflow: auto; background: var(--inset); border: 1px solid var(--line);
    border-radius: 4px; padding: 6px 7px; font-size: 11px; color: var(--green);
    white-space: pre-wrap; word-break: break-all; margin: 0;
  }
</style>

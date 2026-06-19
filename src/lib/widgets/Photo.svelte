<script lang="ts">
  import WidgetFrame from '$lib/components/WidgetFrame.svelte';
  import { fetchWidgetData, AuthExpiredError } from '$lib/client/fetchWidgetData';
  import type { PhotoData } from '$lib/photo-schema';
  import type { WidgetState } from './types';

  let state = $state<WidgetState<PhotoData>>({ status: 'loading' });
  let nonce = $state(0);

  $effect(() => {
    nonce;
    let cancelled = false;
    (async () => {
      try {
        const { data, stale } = await fetchWidgetData<PhotoData>('/api/photo');
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
    const id = setInterval(() => (nonce += 1), 21_600_000); // 6 h
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  });
</script>

<WidgetFrame title="photo" tag="bing" {state} onretry={() => (nonce += 1)}>
  {#snippet children(d)}
    <div class="photo" style="background-image:url('{d.url}')">
      <div class="cap">{d.title}</div>
    </div>
  {/snippet}
</WidgetFrame>

<style>
  .photo {
    flex: 1; min-height: 0; border-radius: 4px; background-size: cover; background-position: center;
    display: flex; align-items: flex-end; position: relative;
  }
  .cap {
    width: 100%; padding: 6px 8px; font-size: 11px; color: #fff;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
    border-radius: 0 0 4px 4px;
  }
</style>

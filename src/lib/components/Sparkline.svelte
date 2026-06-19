<script lang="ts">
  // Unicode block sparkline (btop-style). Pure, reusable across weather/markets.
  interface Props {
    values: number[];
    trend?: 'up' | 'down' | 'flat';
  }
  let { values, trend = 'flat' }: Props = $props();

  const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  let spark = $derived.by(() => {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((v) => BLOCKS[Math.round(((v - min) / span) * (BLOCKS.length - 1))])
      .join('');
  });
</script>

<span class="spark {trend}">{spark}</span>

<style>
  .spark { font-size: 13px; letter-spacing: 0; }
  .spark.up { color: var(--green); }
  .spark.down { color: var(--red); }
  .spark.flat { color: var(--orange); }
</style>

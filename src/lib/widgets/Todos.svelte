<script lang="ts">
  import { onMount } from 'svelte';
  import { type Todo, newTodo } from '$lib/todos-schema';

  let todos = $state<Todo[]>([]);
  let text = $state('');
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errMsg = $state('');

  let doneCount = $derived(todos.filter((t) => t.done).length);

  onMount(load);

  async function load() {
    try {
      const r = await fetch('/api/todos', { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      todos = (await r.json()) as Todo[];
      status = 'ready';
    } catch (e) {
      status = 'error';
      errMsg = String(e);
    }
  }

  async function persist(next: Todo[]) {
    const prev = todos;
    todos = next; // optimistic
    try {
      const r = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch {
      todos = prev; // revert — never silently lose a task
      flash('save failed — retrying does nothing, check connection');
    }
  }

  function flash(m: string) {
    errMsg = m;
    setTimeout(() => (errMsg = ''), 4000);
  }

  function add() {
    const t = text.trim();
    if (!t) return;
    persist([...todos, newTodo(t)]);
    text = '';
  }
  const toggle = (id: string) =>
    persist(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const del = (id: string) => persist(todos.filter((t) => t.id !== id));
</script>

<section class="pane">
  <div class="pane-h">
    <span class="pane-t"><span class="pre">~/</span><b>todo</b></span>
    <span class="tag">{doneCount}/{todos.length}</span>
  </div>
  <div class="pane-body">
    {#if status === 'loading'}
      <div class="muted">loading…</div>
    {:else if status === 'error'}
      <div class="err">⚠ {errMsg}</div>
    {:else}
      <div class="add">
        <span class="prompt">›</span>
        <input
          bind:value={text}
          placeholder="add a task…"
          onkeydown={(e) => e.key === 'Enter' && add()}
          aria-label="add a task"
        />
      </div>
      {#if todos.length === 0}
        <div class="muted">— nothing yet — <span class="hint">type above + Enter</span></div>
      {:else}
        <ul>
          {#each todos as t (t.id)}
            <li class:done={t.done}>
              <button class="ck" class:on={t.done} onclick={() => toggle(t.id)} aria-label="toggle">
                {t.done ? '[x]' : '[ ]'}
              </button>
              <span class="txt">{t.text}</span>
              <button class="del" onclick={() => del(t.id)} aria-label="delete">×</button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if errMsg}<div class="err">⚠ {errMsg}</div>{/if}
    {/if}
  </div>
</section>

<style>
  .add { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .prompt { color: var(--green); }
  input {
    flex: 1; background: var(--inset); border: 1px solid var(--line);
    color: var(--ink); font-family: var(--mono); font-size: 12px;
    padding: 4px 7px; border-radius: 4px;
  }
  input:focus { outline: none; border-color: var(--cyan); }
  ul { list-style: none; }
  li { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  li.done .txt { color: var(--faint); text-decoration: line-through; }
  .ck { background: none; border: 0; cursor: pointer; color: var(--faint); font-family: var(--mono); font-size: 12px; padding: 0; }
  .ck.on { color: var(--green); }
  .txt { flex: 1; color: var(--ink); }
  .del { background: none; border: 0; cursor: pointer; color: var(--faint); font-size: 14px; opacity: 0; padding: 0 2px; }
  li:hover .del { opacity: 1; }
  .del:hover { color: var(--red); }
  .muted { color: var(--faint); font-size: 11px; }
  .muted .hint { color: var(--dim); }
  .err { color: var(--red); font-size: 11px; margin-top: 6px; }
</style>

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStore } from '$lib/server/store';
import type { Todo } from '$lib/todos-schema';

export const prerender = false;

const KEY = 'todos';

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getStore(platform);
  const raw = await kv.get(KEY);
  const todos: Todo[] = raw ? (JSON.parse(raw) as Todo[]) : [];
  return json(todos);
};

// Whole-list write (single user, small list). A failed KV write MUST surface
// so the user never silently loses a task (critical failure mode, eng review).
export const PUT: RequestHandler = async ({ request, platform }) => {
  const kv = getStore(platform);
  const todos = (await request.json()) as Todo[];
  if (!Array.isArray(todos)) throw error(400, 'expected an array of todos');
  try {
    await kv.put(KEY, JSON.stringify(todos));
  } catch (e) {
    throw error(500, `failed to save todos: ${String(e)}`);
  }
  return json(todos);
};

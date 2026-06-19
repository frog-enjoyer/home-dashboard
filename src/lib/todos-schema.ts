export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export function newTodo(text: string): Todo {
  return { id: crypto.randomUUID(), text: text.trim(), done: false };
}

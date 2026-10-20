/**
 * Undo and redo for the cover's settings. Changes to the same setting in
 * quick succession (typing a title, dragging a slider) merge into one
 * step, so undo takes back the whole word or the whole drag.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** The setting the last change was to, while it can still merge. */
  group: string | null;
  /** When the last change happened, in ms. */
  at: number;
}

export type HistoryAction<T> =
  | { type: "set"; update: (value: T) => T; group?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

/** How many steps back undo can go. */
export const HISTORY_LIMIT = 100;
/** Changes to one setting closer together than this are one step. */
export const MERGE_MS = 1000;

export const startHistory = <T>(value: T): History<T> => ({
  at: 0,
  future: [],
  group: null,
  past: [],
  present: value,
});

export const historyReducer = <T>(
  history: History<T>,
  action: HistoryAction<T>
): History<T> => {
  const { past, present, future } = history;
  switch (action.type) {
    case "set": {
      const next = action.update(present);
      if (next === present) {
        return history;
      }
      const merge =
        action.group !== undefined &&
        action.group === history.group &&
        action.now - history.at < MERGE_MS;
      return {
        at: action.now,
        future: [],
        group: action.group ?? null,
        past: merge ? past : [...past, present].slice(-HISTORY_LIMIT),
        present: next,
      };
    }
    case "undo": {
      const previous = past.at(-1);
      if (previous === undefined) {
        return history;
      }
      return {
        at: 0,
        future: [present, ...future],
        group: null,
        past: past.slice(0, -1),
        present: previous,
      };
    }
    case "redo": {
      const [next, ...rest] = future;
      if (next === undefined) {
        return history;
      }
      return {
        at: 0,
        future: rest,
        group: null,
        past: [...past, present],
        present: next,
      };
    }
    case "reset": {
      return startHistory(action.value);
    }
    default: {
      return history;
    }
  }
};

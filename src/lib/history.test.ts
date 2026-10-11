import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  historyReducer,
  MERGE_MS,
  startHistory,
} from "./history";
import type { History, HistoryAction } from "./history";

type H = History<number>;
const run = (h: H, ...actions: HistoryAction<number>[]) =>
  actions.reduce(historyReducer<number>, h);
const set = (value: number, group?: string, now = 0) =>
  ({ group, now, type: "set", update: () => value }) as const;
const undo = { type: "undo" } as const;
const redo = { type: "redo" } as const;

describe("history", () => {
  it("steps back and forward through changes", () => {
    const h = run(startHistory(0), set(1), set(2), set(3));
    expect(run(h, undo).present).toBe(2);
    expect(run(h, undo, undo).present).toBe(1);
    expect(run(h, undo, undo, redo).present).toBe(2);
    expect(run(h, undo, undo, undo, undo, undo).present).toBe(0);
    expect(run(h, redo).present).toBe(3);
  });

  it("drops the redo steps once something new changes", () => {
    const h = run(startHistory(0), set(1), set(2), undo, set(5));
    expect(h.future).toEqual([]);
    expect(run(h, redo).present).toBe(5);
    expect(run(h, undo).present).toBe(1);
  });

  it("merges quick changes to the same setting into one step", () => {
    const h = run(
      startHistory(0),
      set(1, "title", 0),
      set(2, "title", MERGE_MS - 1),
      set(3, "title", 2 * MERGE_MS - 2)
    );
    expect(h.past).toEqual([0]);
    expect(run(h, undo).present).toBe(0);
  });

  it("keeps changes apart when they are slow, ungrouped or to different settings", () => {
    const slow = run(startHistory(0), set(1, "a", 0), set(2, "a", MERGE_MS));
    expect(slow.past).toEqual([0, 1]);
    const other = run(startHistory(0), set(1, "a", 0), set(2, "b", 10));
    expect(other.past).toEqual([0, 1]);
    const plain = run(
      startHistory(0),
      set(1, undefined, 0),
      set(2, undefined, 1)
    );
    expect(plain.past).toEqual([0, 1]);
  });

  it("starts a fresh step after an undo, even for the same setting", () => {
    const h = run(startHistory(0), set(1, "a", 0), set(2, "a", 10), undo);
    expect(run(h, set(7, "a", 20)).past).toEqual([0]);
    expect(run(h, set(7, "a", 20), undo).present).toBe(0);
  });

  it("ignores a change that changes nothing", () => {
    const h = run(startHistory(0), set(1));
    const same = historyReducer(h, { now: 5, type: "set", update: (v) => v });
    expect(same).toBe(h);
  });

  it(`remembers the last ${HISTORY_LIMIT} steps`, () => {
    const changes = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) =>
      set(i + 1)
    );
    const h = run(startHistory(0), ...changes);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(20);
  });

  it("starts over with no steps either way", () => {
    const h = run(startHistory(0), set(1), set(2), undo, {
      type: "reset",
      value: 9,
    });
    expect(h).toEqual(startHistory(9));
  });
});

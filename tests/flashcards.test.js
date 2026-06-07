import { test } from "node:test";
import assert from "node:assert/strict";
import { Flashcards } from "../assets/js/flashcards.js";

function makeFakeStorage() {
  const m = new Map();
  return {
    get: (k, d) => m.has(k) ? m.get(k) : d,
    set: (k, v) => { m.set(k, v); return true; },
    remove: (k) => { m.delete(k); },
  };
}

test("empty store: all() returns []", () => {
  const fc = new Flashcards(makeFakeStorage());
  assert.deepEqual(fc.all(), []);
});

test("add() returns card with id, persists", () => {
  const s = makeFakeStorage();
  const fc = new Flashcards(s);
  const c = fc.add({ front: "什么是 EV", back: "曝光值" });
  assert.ok(c.id);
  assert.equal(c.front, "什么是 EV");
  assert.equal(fc.all().length, 1);

  const fc2 = new Flashcards(s); // 重新加载验证持久化
  assert.equal(fc2.all().length, 1);
});

test("add() with explicit id is honored, dedupes by id", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "fc-001", front: "Q", back: "A" });
  fc.add({ id: "fc-001", front: "Q changed", back: "A changed" });
  assert.equal(fc.all().length, 1);
  assert.equal(fc.all()[0].front, "Q changed");
});

test("dueToday() filters by dueAt <= today", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "a", front: "a", back: "a", dueAt: "2026-06-05" });
  fc.add({ id: "b", front: "b", back: "b", dueAt: "2026-06-07" });
  fc.add({ id: "c", front: "c", back: "c", dueAt: "2026-06-10" });
  fc.add({ id: "d", front: "d", back: "d", dueAt: null }); // 新卡片立即到期
  const due = fc.dueToday("2026-06-07");
  assert.deepEqual(due.map(c => c.id).sort(), ["a", "b", "d"]);
});

test("dueToday() sorts oldest-first", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "newer", front: "x", back: "x", dueAt: "2026-06-05" });
  fc.add({ id: "older", front: "x", back: "x", dueAt: "2026-06-01" });
  const due = fc.dueToday("2026-06-07");
  assert.equal(due[0].id, "older");
  assert.equal(due[1].id, "newer");
});

test("update() merges partial state", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "x", front: "Q", back: "A", interval: 0 });
  fc.update("x", { interval: 7, dueAt: "2026-06-14" });
  const c = fc.all()[0];
  assert.equal(c.interval, 7);
  assert.equal(c.dueAt, "2026-06-14");
  assert.equal(c.front, "Q"); // 未改的字段保留
});

test("update() unknown id is no-op", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.update("missing", { interval: 99 });
  assert.equal(fc.all().length, 0);
});

test("remove() deletes card", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "x", front: "Q", back: "A" });
  fc.remove("x");
  assert.equal(fc.all().length, 0);
});

test("loadInitial() seeds cards but doesn't overwrite existing progress", () => {
  const s = makeFakeStorage();
  const fc = new Flashcards(s);
  // 用户已经复习过 fc-001
  fc.add({ id: "fc-001", front: "Q", back: "A", interval: 7, reps: 3, dueAt: "2026-06-14" });
  // 再 loadInitial 同样的卡（来自 week-1.json 种子）
  fc.loadInitial([
    { id: "fc-001", front: "Q new wording", back: "A new", tags: ["day-01"] },
    { id: "fc-002", front: "Another", back: "Yes" },
  ]);
  const a = fc.all().find(c => c.id === "fc-001");
  // 内容不覆盖，状态保留
  assert.equal(a.interval, 7);
  assert.equal(a.reps, 3);
  // 新卡加入
  assert.equal(fc.all().length, 2);
});

test("exportJSON / importJSON roundtrip", () => {
  const s = makeFakeStorage();
  const fc = new Flashcards(s);
  fc.add({ id: "x", front: "Q", back: "A", interval: 3 });
  const json = fc.exportJSON();

  const s2 = makeFakeStorage();
  const fc2 = new Flashcards(s2);
  fc2.importJSON(json);
  assert.equal(fc2.all().length, 1);
  assert.equal(fc2.all()[0].interval, 3);
});

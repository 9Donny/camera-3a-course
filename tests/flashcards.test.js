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

test("dueToday() filters by dueAt <= today; new cards (dueAt=null) excluded", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "a", front: "a", back: "a", dueAt: "2026-06-05" });
  fc.add({ id: "b", front: "b", back: "b", dueAt: "2026-06-07" });
  fc.add({ id: "c", front: "c", back: "c", dueAt: "2026-06-10" });
  // 新卡 dueAt=null：用户未学过对应 Day，不该出现在复习
  // 等用户完成对应 Day 后调 unlockBySrcDay 才被激活
  fc.add({ id: "d", front: "d", back: "d", dueAt: null });
  const due = fc.dueToday("2026-06-07");
  assert.deepEqual(due.map(c => c.id).sort(), ["a", "b"]);
});

test("unlockBySrcDay() activates new cards by srcDay", () => {
  const fc = new Flashcards(makeFakeStorage());
  fc.add({ id: "a", front: "a", back: "a", srcDay: "day-01", dueAt: null });
  fc.add({ id: "b", front: "b", back: "b", srcDay: "day-01", dueAt: null });
  fc.add({ id: "c", front: "c", back: "c", srcDay: "day-02", dueAt: null });
  // 完成 day-01 学习
  const unlocked = fc.unlockBySrcDay("day-01", "2026-06-10");
  assert.equal(unlocked, 2);
  // 现在 a, b 进入到期队列；c 仍在 day-02 待解锁
  const due = fc.dueToday("2026-06-10");
  assert.deepEqual(due.map(c => c.id).sort(), ["a", "b"]);
});

test("unlockBySrcDay() doesn't reset cards with existing dueAt", () => {
  const fc = new Flashcards(makeFakeStorage());
  // 卡已经评过分，dueAt 在未来
  fc.add({ id: "a", front: "a", back: "a", srcDay: "day-01", dueAt: "2026-07-01" });
  fc.unlockBySrcDay("day-01", "2026-06-10");
  const c = fc.all().find(c => c.id === "a");
  assert.equal(c.dueAt, "2026-07-01"); // 未被覆盖
});

test("resetUnlearnedCards() clears legacy bad state from unstudied days", () => {
  const fc = new Flashcards(makeFakeStorage());
  // 已学过 day-01，卡已评分
  fc.add({ id: "a", front: "a", back: "a", srcDay: "day-01", dueAt: "2026-06-10", reps: 2, interval: 7 });
  // 未学过 day-04，但旧 bug 让卡有 dueAt
  fc.add({ id: "b", front: "b", back: "b", srcDay: "day-04", dueAt: "2026-06-10", reps: 1, interval: 1 });
  // 未学过 day-50，旧 bug 给卡评分
  fc.add({ id: "c", front: "c", back: "c", srcDay: "day-50", dueAt: "2026-06-10", reps: 3, interval: 15 });
  // 用户卡（无 srcDay）—— 不动
  fc.add({ id: "u", front: "u", back: "u", srcDay: null, dueAt: "2026-06-10" });

  const reset = fc.resetUnlearnedCards(["day-01"]);
  assert.equal(reset, 2); // b, c 被重置

  // a（已学）保留状态
  assert.equal(fc.all().find(c => c.id === "a").dueAt, "2026-06-10");
  assert.equal(fc.all().find(c => c.id === "a").reps, 2);
  // b, c 重置
  assert.equal(fc.all().find(c => c.id === "b").dueAt, null);
  assert.equal(fc.all().find(c => c.id === "b").reps, 0);
  assert.equal(fc.all().find(c => c.id === "c").dueAt, null);
  // u（无 srcDay 用户卡）保留
  assert.equal(fc.all().find(c => c.id === "u").dueAt, "2026-06-10");

  // 复习队列只剩 a 和 u
  const due = fc.dueToday("2026-06-10");
  assert.deepEqual(due.map(c => c.id).sort(), ["a", "u"]);
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

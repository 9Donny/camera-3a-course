import { test } from "node:test";
import assert from "node:assert/strict";
import { Progress } from "../assets/js/progress.js";

test("default state at construction", () => {
  const p = new Progress();
  const s = p.getState();
  assert.equal(s.currentDay, 1);
  assert.deepEqual(s.completedDays, []);
  assert.equal(s.streak, 0);
});

test("isUnlocked: day 1 always unlocked", () => {
  const p = new Progress();
  assert.equal(p.isUnlocked(1), true);
});

test("isUnlocked: future days locked until prior completed", () => {
  const p = new Progress();
  assert.equal(p.isUnlocked(2), false);
  assert.equal(p.isUnlocked(7), false);
});

test("complete day 1 unlocks day 2", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-07");
  assert.equal(p.isUnlocked(2), true);
  assert.equal(p.isUnlocked(3), false);
  assert.equal(p.getState().currentDay, 2);
  assert.deepEqual(p.getState().completedDays, [1]);
});

test("completing same day twice is idempotent", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-07");
  p.completeDay(1, "2026-06-07");
  assert.deepEqual(p.getState().completedDays, [1]);
  assert.equal(p.getState().currentDay, 2);
});

test("cannot complete a locked day", () => {
  const p = new Progress();
  assert.throws(() => p.completeDay(5, "2026-06-07"), /locked/);
});

test("can complete multiple days same calendar day (weekend catch-up)", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-13");
  p.completeDay(2, "2026-06-13");
  p.completeDay(3, "2026-06-13");
  assert.equal(p.getState().currentDay, 4);
  assert.deepEqual(p.getState().completedDays, [1, 2, 3]);
});

test("streak: consecutive calendar days increments streak", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-07");
  assert.equal(p.getState().streak, 1);
  p.completeDay(2, "2026-06-08");
  assert.equal(p.getState().streak, 2);
});

test("streak: same day completion does not double-count", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-07");
  p.completeDay(2, "2026-06-07");
  assert.equal(p.getState().streak, 1);
});

test("streak: skipping a calendar day resets to 1", () => {
  const p = new Progress();
  p.completeDay(1, "2026-06-07");
  p.completeDay(2, "2026-06-09"); // skipped 06-08
  assert.equal(p.getState().streak, 1);
});

test("hydrate restores state", () => {
  const p = new Progress({ currentDay: 5, completedDays: [1,2,3,4], streak: 4, lastCompletedAt: "2026-06-10" });
  assert.equal(p.isUnlocked(5), true);
  assert.equal(p.isUnlocked(6), false);
  assert.equal(p.getState().streak, 4);
});

test("hydrate: corrupt state (missing completedDays) falls back to defaults", () => {
  const p = new Progress({ currentDay: 2 }); // missing completedDays
  const s = p.getState();
  assert.equal(s.currentDay, 1);
  assert.deepEqual(s.completedDays, []);
  assert.equal(s.streak, 0);
});

test("hydrate: completedDays not an array falls back to defaults", () => {
  const p = new Progress({ currentDay: 5, completedDays: "garbage", streak: 4 });
  const s = p.getState();
  assert.equal(s.currentDay, 1);
  assert.deepEqual(s.completedDays, []);
});

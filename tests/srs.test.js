import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule, INITIAL_CARD_STATE } from "../assets/js/srs.js";

const TODAY = "2026-06-07";

test("INITIAL_CARD_STATE has expected defaults", () => {
  assert.equal(INITIAL_CARD_STATE.interval, 0);
  assert.equal(INITIAL_CARD_STATE.ease, 2.5);
  assert.equal(INITIAL_CARD_STATE.reps, 0);
  assert.equal(INITIAL_CARD_STATE.dueAt, null);
});

test("new card + known → interval 1, due tomorrow, reps=1", () => {
  const card = { ...INITIAL_CARD_STATE };
  const next = schedule(card, "known", TODAY);
  assert.equal(next.interval, 1);
  assert.equal(next.reps, 1);
  assert.equal(next.dueAt, "2026-06-08");
  assert.equal(next.ease, 2.5);
});

test("new card + fuzzy → interval 0, due today, reps=1", () => {
  const card = { ...INITIAL_CARD_STATE };
  const next = schedule(card, "fuzzy", TODAY);
  assert.equal(next.interval, 0);
  assert.equal(next.dueAt, TODAY);
  assert.equal(next.reps, 1);
});

test("new card + forgot → interval 0, due today, ease unchanged at first", () => {
  const card = { ...INITIAL_CARD_STATE };
  const next = schedule(card, "forgot", TODAY);
  assert.equal(next.interval, 0);
  assert.equal(next.dueAt, TODAY);
  // first time, ease stays at 2.5 (avoid punishing brand new cards)
  assert.equal(next.ease, 2.5);
});

test("interval=1 + known → interval=3", () => {
  const next = schedule({ interval: 1, ease: 2.5, reps: 1, dueAt: TODAY }, "known", TODAY);
  assert.equal(next.interval, 3);
  assert.equal(next.dueAt, "2026-06-10");
});

test("interval=3 + known → interval=7", () => {
  const next = schedule({ interval: 3, ease: 2.5, reps: 2, dueAt: TODAY }, "known", TODAY);
  assert.equal(next.interval, 7);
});

test("interval=7 + known → interval=15", () => {
  const next = schedule({ interval: 7, ease: 2.5, reps: 3, dueAt: TODAY }, "known", TODAY);
  assert.equal(next.interval, 15);
});

test("interval=15 + known → interval=30", () => {
  const next = schedule({ interval: 15, ease: 2.5, reps: 4, dueAt: TODAY }, "known", TODAY);
  assert.equal(next.interval, 30);
});

test("interval=30 + known → interval capped at 30", () => {
  const next = schedule({ interval: 30, ease: 2.5, reps: 5, dueAt: TODAY }, "known", TODAY);
  assert.equal(next.interval, 30);
});

test("interval=15 + forgot → interval=0, ease decreases by 0.2 (min 1.3)", () => {
  const next = schedule({ interval: 15, ease: 2.5, reps: 4, dueAt: TODAY }, "forgot", TODAY);
  assert.equal(next.interval, 0);
  assert.equal(next.dueAt, TODAY);
  assert.equal(next.ease.toFixed(1), "2.3");
});

test("repeated forgot eventually clamps ease at 1.3", () => {
  let card = { interval: 5, ease: 1.4, reps: 3, dueAt: TODAY };
  card = schedule(card, "forgot", TODAY);
  assert.equal(card.ease.toFixed(1), "1.3"); // 1.4 - 0.2 = 1.2 clamped to 1.3
  card = schedule(card, "forgot", TODAY);
  assert.equal(card.ease.toFixed(1), "1.3"); // stays
});

test("interval=7 + fuzzy → keeps interval, slight ease decrease", () => {
  const next = schedule({ interval: 7, ease: 2.5, reps: 3, dueAt: TODAY }, "fuzzy", TODAY);
  assert.equal(next.interval, 7);
  assert.equal(next.dueAt, "2026-06-14");
  assert.equal(next.ease.toFixed(2), "2.40");
});

test("invalid rating throws", () => {
  assert.throws(() => schedule(INITIAL_CARD_STATE, "wat", TODAY), /rating/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { match } from "../assets/js/router.js";

test("match: fixed route with leading #", () => {
  assert.deepEqual(match("#/today", "#/today"), {});
  assert.deepEqual(match("#/overview", "#/overview"), {});
});

test("match: returns null for different fixed routes", () => {
  assert.equal(match("#/today", "#/notes"), null);
  assert.equal(match("#/notes", "#/quiz"), null);
});

test("match: parameterized route extracts param", () => {
  assert.deepEqual(match("#/notes/:dayId", "#/notes/day-01"), { dayId: "day-01" });
  assert.deepEqual(match("#/quiz/:quizId", "#/quiz/daily-day-05"), { quizId: "daily-day-05" });
});

test("match: parameterized route does not match shorter hash", () => {
  assert.equal(match("#/notes/:dayId", "#/notes"), null);
});

test("match: fixed route does not match longer hash", () => {
  assert.equal(match("#/notes", "#/notes/day-01"), null);
});

test("match: decodes URI components in params", () => {
  assert.deepEqual(match("#/notes/:dayId", "#/notes/day%2D01"), { dayId: "day-01" });
});

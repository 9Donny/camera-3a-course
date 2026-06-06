import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDay, validateQuiz, validateCurriculum } from "../assets/js/validators.js";

test("validateDay: passes minimal valid day", () => {
  const day = {
    id: "day-01", week: 1, module: "M1", title: "光学入门",
    estimatedMinutes: 240,
    sections: [{ id: "s1", title: "曝光", type: "concept", content: "..." }],
    references: [], dailyQuizId: "daily-day-01",
  };
  const r = validateDay(day);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("validateDay: missing required field", () => {
  const r = validateDay({ id: "day-01" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("title")));
});

test("validateDay: invalid section.type", () => {
  const day = {
    id: "day-01", week: 1, module: "M1", title: "x", estimatedMinutes: 60,
    sections: [{ id: "s1", title: "t", type: "bogus", content: "x" }],
    references: [], dailyQuizId: "daily-day-01",
  };
  const r = validateDay(day);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("type")));
});

test("validateQuiz: choice question must have answer in options", () => {
  const quiz = {
    id: "daily-day-01", module: "M1", scope: "daily",
    questions: [{ id: "q1", type: "choice", prompt: "?", options: ["A","B"], answer: "C" }],
  };
  const r = validateQuiz(quiz);
  assert.equal(r.ok, false);
  assert.ok(r.errors[0].includes("answer"));
});

test("validateQuiz: short-answer question requires referenceAnswer", () => {
  const quiz = {
    id: "daily-day-01", module: "M1", scope: "daily",
    questions: [{ id: "q1", type: "short", prompt: "?" }],
  };
  const r = validateQuiz(quiz);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("referenceAnswer")));
});

test("validateCurriculum: 60 days, weeks 1-8", () => {
  const c = { weeks: [], days: [] };
  for (let w = 1; w <= 8; w++) c.weeks.push({ id: `w${w}`, title: `Week ${w}`, days: [] });
  for (let d = 1; d <= 60; d++) {
    const w = Math.min(8, Math.ceil(d / 7));
    c.days.push({ id: `day-${String(d).padStart(2,"0")}`, week: w, module: "M1" });
    c.weeks[w-1].days.push(`day-${String(d).padStart(2,"0")}`);
  }
  const r = validateCurriculum(c);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("validateCurriculum: rejects when day count > 60", () => {
  const c = { weeks: [], days: [] };
  for (let w = 1; w <= 8; w++) c.weeks.push({ id: `w${w}`, title: `W${w}`, days: [] });
  for (let d = 1; d <= 61; d++) c.days.push({ id: `day-${d}`, week: 1, module: "M1" });
  const r = validateCurriculum(c);
  assert.equal(r.ok, false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeChoice, gradeFill, scoreQuizResults, summarizeByModule } from "../assets/js/quiz.js";

test("gradeChoice: exact match", () => {
  assert.equal(gradeChoice("B", "B"), true);
  assert.equal(gradeChoice("A", "B"), false);
});

test("gradeChoice: multi-select arrays compared as sets", () => {
  assert.equal(gradeChoice(["A","C"], ["C","A"]), true);
  assert.equal(gradeChoice(["A"], ["A","B"]), false);
});

test("gradeFill: trims and ignores case", () => {
  assert.equal(gradeFill("  Bayer  ", "bayer"), true);
  assert.equal(gradeFill("RGB", ["bayer", "rgb"]), true);
  assert.equal(gradeFill("xyz", ["a", "b"]), false);
});

test("scoreQuizResults: choice + fill auto, short uses self-rating", () => {
  const questions = [
    { id: "q1", type: "choice",  answer: "B" },
    { id: "q2", type: "fill",    answer: "Bayer" },
    { id: "q3", type: "short",   answer: "..." },
  ];
  const responses = [
    { qid: "q1", answer: "B" },
    { qid: "q2", answer: "bayer" },
    { qid: "q3", answer: "my reply", selfRated: "partial" },
  ];
  const result = scoreQuizResults(questions, responses);
  assert.equal(result.total, 3);
  assert.equal(result.score, 2.5); // 1 + 1 + 0.5
  assert.equal(result.entries.find(e => e.qid === "q3").points, 0.5);
});

test("scoreQuizResults: missing response counts as wrong", () => {
  const questions = [{ id: "q1", type: "choice", answer: "A" }];
  const result = scoreQuizResults(questions, []);
  assert.equal(result.score, 0);
  assert.equal(result.entries[0].correct, false);
});

test("summarizeByModule aggregates across many quizzes", () => {
  const records = [
    { module: "M1", score: 3, total: 5 },
    { module: "M1", score: 4, total: 5 },
    { module: "M2", score: 1, total: 5 },
  ];
  const summary = summarizeByModule(records);
  assert.equal(summary.M1.accuracy, 0.7);
  assert.equal(summary.M1.total, 10);
  assert.equal(summary.M2.accuracy, 0.2);
});

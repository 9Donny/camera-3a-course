import { test } from "node:test";
import assert from "node:assert/strict";
import { categorizeModules, recommendReview } from "../assets/js/weakness.js";

test("categorizeModules tags by accuracy bucket", () => {
  const summary = {
    M1: { accuracy: 0.95, total: 20, score: 19 },
    M2: { accuracy: 0.70, total: 10, score: 7 },
    M3: { accuracy: 0.50, total: 10, score: 5 },
    M4: { accuracy: 0,    total: 0,  score: 0 },
  };
  const out = categorizeModules(summary);
  assert.equal(out.M1.bucket, "mastered");
  assert.equal(out.M2.bucket, "partial");
  assert.equal(out.M3.bucket, "urgent");
  assert.equal(out.M4.bucket, "untested");
});

test("recommendReview: urgent module returns full module days", () => {
  const moduleIndex = { M3: { days: [15, 16, 17, 18, 19, 20, 21], title: "AEC 基础" } };
  const summary = { M3: { accuracy: 0.5, total: 10, score: 5 } };
  const recs = recommendReview(summary, moduleIndex);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].module, "M3");
  assert.deepEqual(recs[0].days, [15, 16, 17, 18, 19, 20, 21]);
  assert.equal(recs[0].reason, "正确率低于 60%");
});

test("recommendReview: partial module returns top-3 wrong subtopics", () => {
  const moduleIndex = {
    M3: {
      days: [15, 16, 17, 18, 19, 20, 21],
      subtopics: { "曝光表": [15], "Lux": [16], "亮度目标": [17], "收敛": [18] },
    },
  };
  const summary = { M3: { accuracy: 0.7, total: 10, score: 7 } };
  const subtopicWrongCounts = { "曝光表": 3, "Lux": 2, "亮度目标": 2, "收敛": 0 };
  const recs = recommendReview(summary, moduleIndex, subtopicWrongCounts);
  assert.equal(recs[0].subtopics.length, 3);
  assert.deepEqual(recs[0].subtopics.map(s => s.name), ["曝光表", "Lux", "亮度目标"]);
});

test("recommendReview: mastered module returns nothing", () => {
  const moduleIndex = { M1: { days: [1] } };
  const summary = { M1: { accuracy: 0.95, total: 10, score: 9.5 } };
  assert.deepEqual(recommendReview(summary, moduleIndex), []);
});

test("recommendReview: partial module with no subtopic data falls back to module days", () => {
  const moduleIndex = { M2: { days: [8, 9, 10, 11, 12, 13, 14], title: "ISP Pipeline" } };
  const summary = { M2: { accuracy: 0.7, total: 10, score: 7 } };
  const recs = recommendReview(summary, moduleIndex);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].module, "M2");
  assert.deepEqual(recs[0].days, [8, 9, 10, 11, 12, 13, 14]);
  assert.equal(recs[0].subtopics, undefined);
  assert.match(recs[0].reason, /60-80%/);
});

test("recommendReview: partial module with empty subtopic counts also falls back", () => {
  const moduleIndex = {
    M3: {
      days: [15, 16, 17],
      subtopics: { "曝光表": [15], "Lux": [16] },
      title: "AEC 基础",
    },
  };
  const summary = { M3: { accuracy: 0.65, total: 10, score: 6.5 } };
  // every subtopic wrong count is 0
  const subtopicWrongCounts = { "曝光表": 0, "Lux": 0 };
  const recs = recommendReview(summary, moduleIndex, subtopicWrongCounts);
  assert.equal(recs.length, 1);
  assert.deepEqual(recs[0].days, [15, 16, 17]);
});

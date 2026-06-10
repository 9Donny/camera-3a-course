# Plan 1: Foundation + Week 1 MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable static-HTML course site with the three-pane SPA shell, all six functional pages, persistence, and Week 1 of complete content (Day 1-7 + 7 daily quizzes + 1 weekly quiz). At the end of this plan, the user can open `index.html` and complete an end-to-end Week 1 learning loop.

**Architecture:** Pure static HTML/CSS/JS using browser-native ES modules. Single-page app with hash routing. State persisted in localStorage. No build step, no bundler, no backend. Tested with `node --test` for the pure-logic modules (progress / quiz scoring / weakness stats / data validators).

**Tech Stack:**
- HTML / CSS / JavaScript (ES2022 modules)
- Markdown rendering via `marked` (single-file ESM build, vendored)
- Testing: `node --test` (Node 22+ built-in)
- Fonts: Inter + Noto Sans SC (CSS web fonts)
- Dev runtime: any HTTP server (`python3 -m http.server` or VSCode Live Server) — file:// won't work because of ES module CORS

---

## File Structure (Final State After This Plan)

```
3A/
├── index.html                         # SPA entry — three-pane shell
├── README.md                          # User-facing how-to
├── assets/
│   ├── css/
│   │   ├── theme.css                  # Dark professional palette + tokens
│   │   └── components.css             # Cards, buttons, quiz items, nav
│   ├── js/
│   │   ├── app.js                     # Entry: wire router + initial render
│   │   ├── router.js                  # Hash-based route table
│   │   ├── storage.js                 # localStorage read/write wrapper
│   │   ├── progress.js                # Day unlock / completion logic
│   │   ├── notes.js                   # Notes CRUD + export
│   │   ├── quiz.js                    # Quiz rendering + scoring
│   │   ├── weakness.js                # Per-module accuracy aggregation
│   │   ├── report.js                  # Daily report builder
│   │   ├── markdown.js                # Vendored marked wrapper
│   │   └── views/
│   │       ├── overview.js            # 60-day map view
│   │       ├── today.js               # Today's lesson view
│   │       ├── notes-view.js          # Notes list + editor
│   │       ├── quiz-view.js           # Quiz center
│   │       ├── report-view.js         # Daily report drawer + history
│   │       └── weakness-view.js       # Weakness dashboard
│   ├── vendor/
│   │   └── marked.esm.js              # marked library, vendored
│   └── data/
│       ├── curriculum.json            # 60-day outline (Week 1 filled, others stub)
│       ├── days/
│       │   ├── day-01.json            # Day 1 full content
│       │   ├── day-02.json
│       │   ├── day-03.json
│       │   ├── day-04.json
│       │   ├── day-05.json
│       │   ├── day-06.json
│       │   └── day-07.json
│       └── quizzes/
│           ├── daily/
│           │   ├── daily-day-01.json
│           │   ├── daily-day-02.json
│           │   ├── daily-day-03.json
│           │   ├── daily-day-04.json
│           │   ├── daily-day-05.json
│           │   ├── daily-day-06.json
│           │   └── daily-day-07.json
│           └── weekly/
│               └── weekly-w1.json
└── tests/
    ├── progress.test.js
    ├── storage.test.js
    ├── quiz.test.js
    ├── weakness.test.js
    └── data-validators.test.js
```

**Why these splits:**
- **Logic vs. view**: `progress.js` / `quiz.js` / `weakness.js` are pure functions — testable in Node. Views (`views/*.js`) only handle DOM. This boundary is what makes test coverage feasible without a browser.
- **One file per page**: each view is self-contained and small, easy to swap when frontend-design skill polishes UI later.
- **Data files as pure JSON**: content changes don't touch code; future weeks just drop new JSON files.

---

## Task 1: Project skeleton + repo hygiene

**Files:**
- Create: `index.html`
- Create: `assets/css/theme.css`
- Create: `assets/css/components.css`
- Create: `assets/js/app.js`
- Modify: `.gitignore` (already exists from initial commit)

**Why:** Establish a runnable shell first so every subsequent task has a concrete artifact to plug into.

- [ ] **Step 1: Append Node-related entries to `.gitignore`**

```
# Node
node_modules/
package-lock.json
```

- [ ] **Step 2: Create `index.html` with three-pane skeleton**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Camera 3A · 60 天</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="assets/css/theme.css">
  <link rel="stylesheet" href="assets/css/components.css">
</head>
<body>
  <header class="topbar">
    <div class="brand">📷 Camera 3A · 60 天</div>
    <div class="streak" id="streak">🔥 0</div>
  </header>
  <main class="layout">
    <nav class="sidebar" id="sidebar"></nav>
    <section class="content" id="content">
      <p class="loading">加载中…</p>
    </section>
  </main>
  <script type="module" src="assets/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `assets/css/theme.css` with palette tokens**

```css
:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #334155;
  --border: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --accent: #3b82f6;
  --accent-2: #60a5fa;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --radius: 8px;
  --gap: 16px;
  --font-sans: "Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: var(--font-sans); height: 100%; }
a { color: var(--accent-2); }
.layout { display: flex; height: calc(100vh - 56px); }
.sidebar { width: 240px; background: var(--surface); border-right: 1px solid var(--border); padding: 16px; overflow-y: auto; }
.content { flex: 1; padding: 24px 32px; overflow-y: auto; }
.topbar { display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 24px; background: var(--surface); border-bottom: 1px solid var(--border); }
.brand { font-weight: 600; font-size: 16px; }
.streak { color: var(--warning); font-weight: 600; }
.loading { color: var(--text-muted); }
```

- [ ] **Step 4: Create minimal `assets/css/components.css`**

```css
.btn {
  display: inline-block;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}
.btn:hover { background: var(--accent-2); }
.btn.secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }
.muted { color: var(--text-muted); }
.dim { color: var(--text-dim); }

.nav-item {
  display: block;
  padding: 8px 12px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 6px;
  margin-bottom: 2px;
  cursor: pointer;
}
.nav-item:hover { background: var(--surface-2); color: var(--text); }
.nav-item.active { background: var(--accent); color: white; }
.nav-item.locked { color: var(--text-dim); cursor: not-allowed; }
.nav-section { margin-top: 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
```

- [ ] **Step 5: Create `assets/js/app.js` placeholder that proves it boots**

```js
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
sidebar.innerHTML = '<div class="nav-section">已就绪</div><div class="muted">骨架已加载</div>';
content.innerHTML = '<h1>Camera 3A · 60 天</h1><p class="muted">即将开始你的第一天学习。</p>';
```

- [ ] **Step 6: Verify it runs**

Run: `cd /Users/mi/3A && python3 -m http.server 8080`
Open http://localhost:8080/ in Chrome — expected: dark page with sidebar showing "已就绪" and content showing the title.
Stop server: Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add index.html assets/css/ assets/js/app.js .gitignore
git commit -m "feat: scaffold three-pane SPA shell with dark theme"
```

---

## Task 2: localStorage wrapper with namespaced keys

**Files:**
- Create: `assets/js/storage.js`
- Create: `tests/storage.test.js`

**Why:** Every other module reads/writes localStorage. Centralizing the key prefix and JSON (de)serialization in one module means the rest of the code never touches `localStorage` directly. Testable in Node because we can fake `localStorage` with a Map.

- [ ] **Step 1: Write the failing test**

Create `tests/storage.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { Storage } from "../assets/js/storage.js";

function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store,
  };
}

test("Storage.set serializes and prefixes the key", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  s.set("progress", { currentDay: 3 });
  assert.equal(ls._store.get("camera3a:progress"), '{"currentDay":3}');
});

test("Storage.get parses JSON and returns default when missing", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  assert.deepEqual(s.get("progress", { currentDay: 1 }), { currentDay: 1 });
  s.set("progress", { currentDay: 5 });
  assert.deepEqual(s.get("progress", null), { currentDay: 5 });
});

test("Storage.get returns default when JSON is corrupt", () => {
  const ls = makeFakeLocalStorage();
  ls.setItem("camera3a:bad", "{not json");
  const s = new Storage(ls);
  assert.equal(s.get("bad", "fallback"), "fallback");
});

test("Storage.remove deletes the prefixed key", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  s.set("x", 1);
  s.remove("x");
  assert.equal(ls._store.has("camera3a:x"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/mi/3A && node --test tests/storage.test.js`
Expected: FAIL with `Cannot find module './assets/js/storage.js'` or similar import error.

- [ ] **Step 3: Implement `assets/js/storage.js`**

```js
const PREFIX = "camera3a:";

export class Storage {
  constructor(backend = globalThis.localStorage) {
    this.backend = backend;
  }

  _key(name) { return PREFIX + name; }

  get(name, defaultValue = null) {
    const raw = this.backend.getItem(this._key(name));
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  set(name, value) {
    this.backend.setItem(this._key(name), JSON.stringify(value));
  }

  remove(name) {
    this.backend.removeItem(this._key(name));
  }
}

export const storage = new Storage();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/storage.test.js`
Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/js/storage.js tests/storage.test.js
git commit -m "feat(storage): add namespaced localStorage wrapper with tests"
```

---

## Task 3: Progress logic — unlock + completion + streak

**Files:**
- Create: `assets/js/progress.js`
- Create: `tests/progress.test.js`

**Why:** Spec 4.1 requires "按序解锁" — locked days must not be openable. This logic must be bullet-proof or the user's progress state will go inconsistent. Pure function module, no DOM.

- [ ] **Step 1: Write the failing test**

Create `tests/progress.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/progress.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `assets/js/progress.js`**

```js
export class Progress {
  constructor(initial = null) {
    this.state = initial ?? {
      currentDay: 1,
      completedDays: [],
      streak: 0,
      lastCompletedAt: null,
    };
  }

  getState() {
    return { ...this.state, completedDays: [...this.state.completedDays] };
  }

  isUnlocked(day) {
    if (day === 1) return true;
    return this.state.completedDays.includes(day - 1);
  }

  isCompleted(day) {
    return this.state.completedDays.includes(day);
  }

  completeDay(day, isoDate) {
    if (!this.isUnlocked(day)) {
      throw new Error(`Day ${day} is locked`);
    }
    if (this.state.completedDays.includes(day)) {
      return; // idempotent
    }

    this.state.completedDays.push(day);
    this.state.completedDays.sort((a, b) => a - b);
    this.state.currentDay = Math.max(this.state.currentDay, day + 1);

    this._updateStreak(isoDate);
    this.state.lastCompletedAt = isoDate;
  }

  _updateStreak(isoDate) {
    const last = this.state.lastCompletedAt;
    if (last === null) {
      this.state.streak = 1;
      return;
    }
    if (last === isoDate) {
      return; // same calendar day, no change
    }
    const diff = daysBetween(last, isoDate);
    if (diff === 1) {
      this.state.streak += 1;
    } else {
      this.state.streak = 1;
    }
  }
}

function daysBetween(a, b) {
  const ms = (new Date(b)) - (new Date(a));
  return Math.round(ms / 86400000);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/progress.test.js`
Expected: 11 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/js/progress.js tests/progress.test.js
git commit -m "feat(progress): unlock + completion + streak logic with tests"
```

---

## Task 4: Quiz scoring + self-rating logic

**Files:**
- Create: `assets/js/quiz.js`
- Create: `tests/quiz.test.js`

**Why:** Spec 4.3.4 + 6.2 — choice/fill auto-graded, short-answer self-rated as right/partial/wrong (1.0 / 0.5 / 0). The scoring module is pure logic; views consume it.

- [ ] **Step 1: Write the failing test**

Create `tests/quiz.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/quiz.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `assets/js/quiz.js`**

```js
export function gradeChoice(userAnswer, correct) {
  if (Array.isArray(userAnswer) || Array.isArray(correct)) {
    const a = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
    const b = new Set(Array.isArray(correct) ? correct : [correct]);
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  return userAnswer === correct;
}

export function gradeFill(userAnswer, correct) {
  const norm = String(userAnswer ?? "").trim().toLowerCase();
  const candidates = Array.isArray(correct) ? correct : [correct];
  return candidates.some(c => String(c).trim().toLowerCase() === norm);
}

const SELF_RATING_POINTS = { right: 1.0, partial: 0.5, wrong: 0.0 };

export function scoreQuizResults(questions, responses) {
  const byQid = new Map(responses.map(r => [r.qid, r]));
  const entries = questions.map(q => {
    const r = byQid.get(q.id);
    if (!r) return { qid: q.id, type: q.type, points: 0, correct: false };

    if (q.type === "choice") {
      const correct = gradeChoice(r.answer, q.answer);
      return { qid: q.id, type: q.type, points: correct ? 1 : 0, correct };
    }
    if (q.type === "fill") {
      const correct = gradeFill(r.answer, q.answer);
      return { qid: q.id, type: q.type, points: correct ? 1 : 0, correct };
    }
    if (q.type === "short") {
      const points = SELF_RATING_POINTS[r.selfRated] ?? 0;
      return { qid: q.id, type: q.type, points, correct: points === 1 };
    }
    return { qid: q.id, type: q.type, points: 0, correct: false };
  });

  const score = entries.reduce((s, e) => s + e.points, 0);
  return { total: questions.length, score, entries };
}

export function summarizeByModule(records) {
  const acc = {};
  for (const r of records) {
    const slot = acc[r.module] ?? { score: 0, total: 0 };
    slot.score += r.score;
    slot.total += r.total;
    acc[r.module] = slot;
  }
  for (const k of Object.keys(acc)) {
    acc[k].accuracy = acc[k].total > 0 ? acc[k].score / acc[k].total : 0;
  }
  return acc;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/quiz.test.js`
Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/js/quiz.js tests/quiz.test.js
git commit -m "feat(quiz): scoring with auto-grading + short-answer self-rating"
```

---

## Task 5: Weakness aggregator with review recommendations

**Files:**
- Create: `assets/js/weakness.js`
- Create: `tests/weakness.test.js`

**Why:** Spec 6.3 — strict thresholds (<60% urgent, 60-80% partial, >80% mastered). Pure logic, isolated from view.

- [ ] **Step 1: Write the failing test**

Create `tests/weakness.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/weakness.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `assets/js/weakness.js`**

```js
export function categorizeModules(summary) {
  const out = {};
  for (const [k, v] of Object.entries(summary)) {
    let bucket;
    if (v.total === 0) bucket = "untested";
    else if (v.accuracy >= 0.8) bucket = "mastered";
    else if (v.accuracy >= 0.6) bucket = "partial";
    else bucket = "urgent";
    out[k] = { ...v, bucket };
  }
  return out;
}

export function recommendReview(summary, moduleIndex, subtopicWrongCounts = {}) {
  const cat = categorizeModules(summary);
  const recs = [];
  for (const [module, info] of Object.entries(cat)) {
    if (info.bucket === "urgent") {
      const m = moduleIndex[module];
      if (!m) continue;
      recs.push({
        module,
        title: m.title ?? module,
        days: m.days ?? [],
        reason: "正确率低于 60%",
      });
    } else if (info.bucket === "partial") {
      const m = moduleIndex[module];
      if (!m) continue;
      const subtopics = Object.entries(m.subtopics ?? {})
        .map(([name, days]) => ({ name, days, wrong: subtopicWrongCounts[name] ?? 0 }))
        .filter(s => s.wrong > 0)
        .sort((a, b) => b.wrong - a.wrong)
        .slice(0, 3);
      if (subtopics.length === 0) continue;
      recs.push({
        module,
        title: m.title ?? module,
        subtopics,
        reason: "正确率 60-80%，建议复习错题最多的子主题",
      });
    }
  }
  return recs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/weakness.test.js`
Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/js/weakness.js tests/weakness.test.js
git commit -m "feat(weakness): module-level accuracy buckets + review recs"
```

---

## Task 6: Data validators (curriculum / day / quiz JSON)

**Files:**
- Create: `assets/js/validators.js`
- Create: `tests/data-validators.test.js`

**Why:** Content team (you, in later tasks) writes JSON by hand — validators catch typos before they hit the browser. Run on app boot in dev mode.

- [ ] **Step 1: Write the failing test**

Create `tests/data-validators.test.js`:

```js
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

test("validateCurriculum: rejects when day count != 60", () => {
  const c = { weeks: [], days: [{ id: "day-01", week: 1, module: "M1" }] };
  const r = validateCurriculum(c);
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/data-validators.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `assets/js/validators.js`**

```js
const VALID_SECTION_TYPES = new Set(["concept", "procedure", "example", "recap"]);
const VALID_QUIZ_TYPES = new Set(["choice", "fill", "short"]);
const VALID_QUIZ_SCOPES = new Set(["daily", "weekly", "monthly"]);

export function validateDay(day) {
  const errors = [];
  for (const f of ["id", "week", "module", "title", "estimatedMinutes", "sections", "references", "dailyQuizId"]) {
    if (day[f] === undefined) errors.push(`day missing field: ${f}`);
  }
  if (Array.isArray(day.sections)) {
    day.sections.forEach((s, i) => {
      if (!s.id) errors.push(`section[${i}] missing id`);
      if (!VALID_SECTION_TYPES.has(s.type)) errors.push(`section[${i}] invalid type: ${s.type}`);
      if (!s.title) errors.push(`section[${i}] missing title`);
      if (typeof s.content !== "string") errors.push(`section[${i}] content must be string`);
    });
  }
  return { ok: errors.length === 0, errors };
}

export function validateQuiz(quiz) {
  const errors = [];
  for (const f of ["id", "module", "scope", "questions"]) {
    if (quiz[f] === undefined) errors.push(`quiz missing field: ${f}`);
  }
  if (!VALID_QUIZ_SCOPES.has(quiz.scope)) errors.push(`invalid scope: ${quiz.scope}`);
  if (Array.isArray(quiz.questions)) {
    quiz.questions.forEach((q, i) => {
      if (!q.id) errors.push(`q[${i}] missing id`);
      if (!VALID_QUIZ_TYPES.has(q.type)) errors.push(`q[${i}] invalid type`);
      if (!q.prompt) errors.push(`q[${i}] missing prompt`);
      if (q.type === "choice") {
        if (!Array.isArray(q.options)) errors.push(`q[${i}] choice missing options`);
        else if (!q.options.includes(q.answer)) errors.push(`q[${i}] answer not in options`);
      }
      if (q.type === "fill" && q.answer === undefined) errors.push(`q[${i}] fill missing answer`);
      if (q.type === "short" && !q.referenceAnswer) errors.push(`q[${i}] short missing referenceAnswer`);
    });
  }
  return { ok: errors.length === 0, errors };
}

export function validateCurriculum(c) {
  const errors = [];
  if (!Array.isArray(c.weeks) || c.weeks.length !== 8) errors.push(`expect 8 weeks, got ${c.weeks?.length}`);
  if (!Array.isArray(c.days) || c.days.length !== 60) errors.push(`expect 60 days, got ${c.days?.length}`);
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/data-validators.test.js`
Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/js/validators.js tests/data-validators.test.js
git commit -m "feat(validators): runtime validation for day/quiz/curriculum"
```

---

## Task 7: Hash router + sidebar rendering

**Files:**
- Create: `assets/js/router.js`
- Modify: `assets/js/app.js`

**Why:** All views are reached via hash routes. Sidebar entries change appearance based on current route + lock state. No tests — DOM glue is verified by running the app.

- [ ] **Step 1: Create `assets/js/router.js`**

```js
export class Router {
  constructor() {
    this.routes = new Map();
    this.notFound = null;
    window.addEventListener("hashchange", () => this._dispatch());
  }
  on(pattern, handler) {
    this.routes.set(pattern, handler);
    return this;
  }
  setNotFound(handler) { this.notFound = handler; return this; }
  start() { this._dispatch(); }
  go(hash) { window.location.hash = hash; }

  _dispatch() {
    const hash = window.location.hash || "#/today";
    for (const [pattern, handler] of this.routes) {
      const params = match(pattern, hash);
      if (params) { handler(params); return; }
    }
    if (this.notFound) this.notFound(hash);
  }
}

function match(pattern, hash) {
  const pp = pattern.split("/").filter(Boolean);
  const hp = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (pp.length !== hp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(hp[i]);
    else if (pp[i] !== hp[i]) return null;
  }
  return params;
}
```

- [ ] **Step 2: Replace `assets/js/app.js` with full bootstrap**

```js
import { storage } from "./storage.js";
import { Progress } from "./progress.js";
import { Router } from "./router.js";

const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const streak = document.getElementById("streak");

const progress = new Progress(storage.get("progress"));
function persistProgress() { storage.set("progress", progress.getState()); }

const NAV = [
  { hash: "#/overview",  label: "📚 总览" },
  { hash: "#/today",     label: "📅 今日" },
  { hash: "#/notes",     label: "📝 笔记" },
  { hash: "#/quiz",      label: "📊 考核" },
  { hash: "#/report",    label: "📈 日报" },
  { hash: "#/weakness",  label: "🎯 薄弱项" },
];

function renderSidebar(currentHash) {
  const top = NAV.map(n => `<a class="nav-item ${currentHash.startsWith(n.hash) ? "active" : ""}" href="${n.hash}">${n.label}</a>`).join("");
  const weeks = [];
  for (let w = 1; w <= 8; w++) {
    const startDay = (w - 1) * 7 + 1;
    const isUnlocked = progress.isUnlocked(startDay);
    const cls = isUnlocked ? "" : "locked";
    const status = isUnlocked
      ? (progress.isCompleted(w * 7) ? "✓" : (progress.getState().currentDay > startDay ? "▶" : "·"))
      : "🔒";
    weeks.push(`<a class="nav-item ${cls}" ${isUnlocked ? `href="#/today"` : ""}>Week ${w} ${status}</a>`);
  }
  sidebar.innerHTML = `<div class="nav-section">导航</div>${top}<div class="nav-section">学习进度</div>${weeks.join("")}`;
  streak.textContent = `🔥 ${progress.getState().streak}`;
}

function placeholderView(title) {
  content.innerHTML = `<h1>${title}</h1><p class="muted">该页面将在后续 Task 实现。</p>`;
}

const router = new Router()
  .on("#/overview",      () => { renderSidebar("#/overview");  placeholderView("📚 总览"); })
  .on("#/today",         () => { renderSidebar("#/today");     placeholderView("📅 今日学习"); })
  .on("#/notes",         () => { renderSidebar("#/notes");     placeholderView("📝 笔记"); })
  .on("#/notes/:dayId",  (p) => { renderSidebar("#/notes");    placeholderView(`📝 笔记 · ${p.dayId}`); })
  .on("#/quiz",          () => { renderSidebar("#/quiz");      placeholderView("📊 考核中心"); })
  .on("#/quiz/:quizId",  (p) => { renderSidebar("#/quiz");     placeholderView(`📊 考核 · ${p.quizId}`); })
  .on("#/report",        () => { renderSidebar("#/report");    placeholderView("📈 日报"); })
  .on("#/report/:dayId", (p) => { renderSidebar("#/report");   placeholderView(`📈 日报 · ${p.dayId}`); })
  .on("#/weakness",      () => { renderSidebar("#/weakness");  placeholderView("🎯 薄弱项"); })
  .setNotFound(() => { renderSidebar("");                       placeholderView("404 路径未找到"); });

router.start();

// expose for views to navigate / mutate state
window.app = { progress, persistProgress, router, storage };
```

- [ ] **Step 3: Manual verification**

Run: `cd /Users/mi/3A && python3 -m http.server 8080`
Open http://localhost:8080/. Click each sidebar item — content area changes. URL hash updates. Locked weeks (Week 2-8) appear dimmed and don't navigate.
Stop: Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add assets/js/router.js assets/js/app.js
git commit -m "feat(router): hash router + sidebar with lock states"
```

---

## Task 8: Vendor `marked` + markdown helper

**Files:**
- Create: `assets/vendor/marked.esm.js` (downloaded)
- Create: `assets/js/markdown.js`

**Why:** Day content is Markdown for ease of writing; needs to render to HTML in browser. Vendoring keeps the project offline-capable.

- [ ] **Step 1: Download marked**

```bash
mkdir -p /Users/mi/3A/assets/vendor
curl -L -o /Users/mi/3A/assets/vendor/marked.esm.js \
  https://cdn.jsdelivr.net/npm/marked@12.0.0/lib/marked.esm.js
```

Expected: file ~80KB created. If curl fails, try `https://unpkg.com/marked@12.0.0/lib/marked.esm.js`.

- [ ] **Step 2: Create `assets/js/markdown.js` wrapper**

```js
import { marked } from "../vendor/marked.esm.js";

marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });

export function renderMarkdown(md) {
  return marked.parse(md ?? "");
}
```

- [ ] **Step 3: Verify in browser console**

Open http://localhost:8080/ and in DevTools console:
```js
const m = await import("./assets/js/markdown.js");
console.log(m.renderMarkdown("# Hello\n**bold**"));
```
Expected: `<h1>Hello</h1>\n<p><strong>bold</strong></p>\n`.

- [ ] **Step 4: Commit**

```bash
git add assets/vendor/marked.esm.js assets/js/markdown.js
git commit -m "feat: vendor marked and add markdown helper"
```

---

## Task 9: Overview page — 60-day map

**Files:**
- Create: `assets/js/views/overview.js`
- Modify: `assets/js/app.js` (wire route)
- Modify: `assets/css/components.css` (add map styles)

**Why:** Spec 4.3.1 — 8x7 grid where each day is a small block colored by status.

- [ ] **Step 1: Create `assets/js/views/overview.js`**

```js
export function renderOverview(content, { progress, router }) {
  const state = progress.getState();
  const completed = state.completedDays.length;
  const totalDays = 60;
  const percent = Math.round(completed / totalDays * 100);

  const weeks = [];
  for (let w = 1; w <= 8; w++) {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const day = (w - 1) * 7 + i + 1;
      if (day > 60) { cells.push(`<div class="day-cell empty"></div>`); continue; }
      let cls = "locked";
      let click = "";
      if (progress.isCompleted(day)) cls = "done";
      else if (progress.isUnlocked(day)) cls = "current";
      if (cls !== "locked") click = `onclick="window.app.router.go('#/today')"`;
      cells.push(`<div class="day-cell ${cls}" ${click} title="Day ${day}">${day}</div>`);
    }
    weeks.push(`
      <div class="week-row">
        <div class="week-label">Week ${w}</div>
        <div class="week-cells">${cells.join("")}</div>
      </div>
    `);
  }

  content.innerHTML = `
    <h1>📚 总览</h1>
    <p class="muted">已完成 ${completed} / ${totalDays} 天 · ${percent}%</p>
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="overview-grid">${weeks.join("")}</div>
    <div class="legend">
      <span><i class="dot done"></i>已完成</span>
      <span><i class="dot current"></i>当前可学</span>
      <span><i class="dot locked"></i>未解锁</span>
    </div>
  `;
}
```

- [ ] **Step 2: Add CSS to `assets/css/components.css`**

Append:

```css
.progress-bar { height: 6px; background: var(--surface-2); border-radius: 3px; margin-bottom: 24px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); transition: width .3s; }

.overview-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.week-row { display: flex; align-items: center; gap: 12px; }
.week-label { width: 64px; color: var(--text-muted); font-size: 13px; }
.week-cells { display: flex; gap: 4px; }
.day-cell {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-size: 12px; cursor: default;
}
.day-cell.locked { background: var(--surface-2); color: var(--text-dim); }
.day-cell.current { background: transparent; border: 2px solid var(--accent); color: var(--accent-2); cursor: pointer; }
.day-cell.done { background: var(--accent); color: white; cursor: pointer; }
.day-cell.empty { visibility: hidden; }

.legend { display: flex; gap: 16px; color: var(--text-muted); font-size: 13px; }
.legend i.dot { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.legend i.dot.done { background: var(--accent); }
.legend i.dot.current { background: transparent; border: 2px solid var(--accent); }
.legend i.dot.locked { background: var(--surface-2); }
```

- [ ] **Step 3: Wire route in `assets/js/app.js`**

In `app.js`, replace the `#/overview` line:

Old:
```js
.on("#/overview",      () => { renderSidebar("#/overview");  placeholderView("📚 总览"); })
```

New:
```js
.on("#/overview", async () => {
  renderSidebar("#/overview");
  const { renderOverview } = await import("./views/overview.js");
  renderOverview(content, { progress, router });
})
```

- [ ] **Step 4: Manual verification**

Server: `python3 -m http.server 8080`. Navigate to `#/overview`. Expected: 8 rows × 7 cells, Day 1 highlighted with blue border, others dimmed. Click Day 1 → URL becomes `#/today`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/views/overview.js assets/js/app.js assets/css/components.css
git commit -m "feat(view): overview page with 60-day map"
```

---

## Task 10: Today view loader (renders day-N.json with sections + glossary)

**Files:**
- Create: `assets/js/views/today.js`
- Modify: `assets/js/app.js`
- Modify: `assets/css/components.css`

**Why:** Spec 4.3.2. The Today view loads `assets/data/days/day-N.json`, renders sections in order, shows glossary tooltips, and has a "完成本日" button.

- [ ] **Step 1: Create `assets/js/views/today.js`**

```js
import { renderMarkdown } from "../markdown.js";
import { validateDay } from "../validators.js";

export async function renderToday(content, { progress, router, persistProgress }) {
  const day = progress.getState().currentDay;
  if (day > 60) {
    content.innerHTML = `<h1>🎉 全部完成</h1><p>你已学完 60 天课程。前往 <a href="#/quiz">考核中心</a> 做最终月考。</p>`;
    return;
  }
  const dayId = `day-${String(day).padStart(2, "0")}`;
  let data;
  try {
    const res = await fetch(`./assets/data/days/${dayId}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    content.innerHTML = `<h1>📅 Day ${day}</h1><p class="muted">内容文件 <code>${dayId}.json</code> 尚未提供（${e.message}）。</p>`;
    return;
  }
  const v = validateDay(data);
  if (!v.ok) {
    content.innerHTML = `<h1>⚠️ Day ${day} 数据错误</h1><pre>${v.errors.join("\n")}</pre>`;
    return;
  }

  const sections = data.sections.map(s => `
    <section class="lesson-section">
      <h2>${escapeHTML(s.title)}</h2>
      <div class="md">${renderMarkdown(s.content)}</div>
      ${renderGlossary(s.glossary)}
    </section>
  `).join("");

  const refs = data.references.map(r =>
    r.url
      ? `<li><a href="${escapeHTML(r.url)}" target="_blank">${escapeHTML(r.source)}</a></li>`
      : `<li>${escapeHTML(r.source)}${r.page ? ` p.${r.page}` : ""}${r.section ? ` · ${escapeHTML(r.section)}` : ""}</li>`
  ).join("");

  const isCompleted = progress.isCompleted(day);
  const btnLabel = isCompleted ? "✓ 已完成（重读模式）" : "✅ 完成本日学习";

  content.innerHTML = `
    <div class="lesson-header">
      <div class="muted">Week ${data.week} · 模块 ${data.module} · 预计 ${data.estimatedMinutes} 分钟</div>
      <h1>Day ${day} · ${escapeHTML(data.title)}</h1>
    </div>
    ${sections}
    ${refs ? `<section class="lesson-section"><h2>📚 参考资料</h2><ul>${refs}</ul></section>` : ""}
    <div class="lesson-footer">
      <a class="btn secondary" href="#/quiz/daily-${dayId}">📊 今日小测</a>
      <button class="btn" id="completeBtn" ${isCompleted ? "disabled" : ""}>${btnLabel}</button>
    </div>
  `;

  if (!isCompleted) {
    document.getElementById("completeBtn").addEventListener("click", () => {
      const today = new Date().toISOString().slice(0, 10);
      progress.completeDay(day, today);
      persistProgress();
      // simple celebration
      alert(`🎉 Day ${day} 完成！下一天已解锁。`);
      router.go("#/report/" + dayId);
    });
  }
}

function renderGlossary(g) {
  if (!Array.isArray(g) || g.length === 0) return "";
  const items = g.map(t =>
    `<li><strong>${escapeHTML(t.term)}</strong>（${escapeHTML(t.zh)}）— ${escapeHTML(t.explain)}</li>`
  ).join("");
  return `<div class="glossary"><div class="label">本节术语</div><ul>${items}</ul></div>`;
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}
```

- [ ] **Step 2: Add CSS for lesson layout**

Append to `assets/css/components.css`:

```css
.lesson-header { margin-bottom: 24px; }
.lesson-header h1 { margin: 4px 0 0; font-size: 28px; }
.lesson-section { margin: 32px 0; }
.lesson-section h2 { font-size: 20px; border-left: 3px solid var(--accent); padding-left: 12px; }
.md p { line-height: 1.8; color: var(--text); }
.md code { background: var(--surface-2); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 13px; }
.md pre { background: var(--surface); padding: 12px; border-radius: 6px; overflow-x: auto; border: 1px solid var(--border); }
.md ul, .md ol { line-height: 1.8; }
.md blockquote { border-left: 3px solid var(--accent); padding-left: 12px; color: var(--text-muted); margin-left: 0; }

.glossary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-top: 16px;
}
.glossary .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; }
.glossary ul { margin: 0; padding-left: 20px; line-height: 1.8; }

.lesson-footer { margin-top: 40px; display: flex; gap: 12px; padding: 16px 0; border-top: 1px solid var(--border); }
```

- [ ] **Step 3: Wire route in `assets/js/app.js`**

Replace the `#/today` line with:
```js
.on("#/today", async () => {
  renderSidebar("#/today");
  const { renderToday } = await import("./views/today.js");
  await renderToday(content, { progress, router, persistProgress });
})
```

- [ ] **Step 4: Manual verification**

Without `day-01.json` yet, navigate to `#/today` — expect "内容文件 day-01.json 尚未提供". This is the correct fallback path for the empty case.

- [ ] **Step 5: Commit**

```bash
git add assets/js/views/today.js assets/js/app.js assets/css/components.css
git commit -m "feat(view): today page renders day JSON with glossary"
```

---

## Task 11: Notes / Quiz / Report / Weakness views

**Files:**
- Create: `assets/js/notes.js`
- Create: `assets/js/views/notes-view.js`
- Create: `assets/js/views/quiz-view.js`
- Create: `assets/js/report.js`
- Create: `assets/js/views/report-view.js`
- Create: `assets/js/views/weakness-view.js`
- Modify: `assets/js/app.js`
- Modify: `assets/css/components.css`

**Why:** Wire up the remaining four functional pages so the Week 1 loop is end-to-end testable.

- [ ] **Step 1: Create `assets/js/notes.js`**

```js
import { storage } from "./storage.js";

export const notes = {
  KEY: "notes",
  all() { return storage.get(this.KEY, {}); },
  get(dayId) { return this.all()[dayId] ?? { content: "", updatedAt: null }; },
  set(dayId, content) {
    const all = this.all();
    all[dayId] = { content, updatedAt: new Date().toISOString() };
    storage.set(this.KEY, all);
  },
  exportMarkdown() {
    const all = this.all();
    const dayIds = Object.keys(all).sort();
    let out = "# Camera 3A 学习笔记\n\n";
    for (const id of dayIds) {
      out += `\n## ${id}\n\n${all[id].content}\n\n---\n`;
    }
    return out;
  },
  exportJSON() {
    return JSON.stringify(this.all(), null, 2);
  },
  importJSON(json) {
    const data = JSON.parse(json);
    if (typeof data !== "object" || data === null) throw new Error("invalid notes JSON");
    storage.set(this.KEY, data);
  },
};
```

- [ ] **Step 2: Create `assets/js/views/notes-view.js`**

```js
import { notes } from "../notes.js";

export function renderNotesList(content, { router }) {
  const all = notes.all();
  const dayIds = Object.keys(all).sort();
  const items = dayIds.length === 0
    ? `<p class="muted">还没有笔记。在「今日学习」页右下角的笔记浮窗开始记录。</p>`
    : dayIds.map(id => {
        const preview = (all[id].content || "").slice(0, 80).replace(/\n/g, " ");
        return `<div class="card" onclick="window.app.router.go('#/notes/${id}')" style="cursor:pointer">
          <strong>${id}</strong> <span class="dim">${all[id].updatedAt?.slice(0,10) ?? ""}</span>
          <div class="muted" style="margin-top:6px">${escapeHTML(preview)}…</div>
        </div>`;
      }).join("");
  content.innerHTML = `
    <h1>📝 笔记</h1>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn secondary" onclick="window.app.exportNotesMd()">📤 导出 Markdown</button>
      <button class="btn secondary" onclick="window.app.exportNotesJson()">📤 导出 JSON</button>
      <label class="btn secondary" style="cursor:pointer">📥 导入 JSON
        <input type="file" accept=".json" style="display:none" onchange="window.app.importNotesJson(event)">
      </label>
    </div>
    ${items}
  `;
}

export function renderNoteEditor(content, { dayId }) {
  const note = notes.get(dayId);
  content.innerHTML = `
    <h1>📝 ${dayId} 笔记</h1>
    <p class="dim">最后更新：${note.updatedAt ?? "未保存"}</p>
    <textarea id="noteEditor" class="note-editor" placeholder="开始记录你的笔记...">${escapeHTML(note.content)}</textarea>
    <div class="dim" id="saveStatus" style="margin-top:8px">已自动保存</div>
  `;
  const editor = document.getElementById("noteEditor");
  const status = document.getElementById("saveStatus");
  let timer = null;
  editor.addEventListener("input", () => {
    status.textContent = "正在保存...";
    clearTimeout(timer);
    timer = setTimeout(() => {
      notes.set(dayId, editor.value);
      status.textContent = `已保存 · ${new Date().toLocaleTimeString()}`;
    }, 400);
  });
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
```

- [ ] **Step 3: Create `assets/js/views/quiz-view.js`**

```js
import { storage } from "../storage.js";
import { scoreQuizResults } from "../quiz.js";
import { validateQuiz } from "../validators.js";

export async function renderQuizCenter(content, { progress }) {
  const day = progress.getState().currentDay;
  const dayId = `day-${String(Math.min(day, 60)).padStart(2, "0")}`;
  const week = Math.min(8, Math.ceil(progress.getState().currentDay / 7));
  content.innerHTML = `
    <h1>📊 考核中心</h1>
    <div class="card">
      <strong>每日小测</strong><div class="muted">本日：${dayId}</div>
      <div style="margin-top:8px"><a class="btn" href="#/quiz/daily-${dayId}">开始</a></div>
    </div>
    <div class="card">
      <strong>周考</strong><div class="muted">Week ${week}</div>
      <div style="margin-top:8px"><a class="btn ${week===1?'':'secondary'}" href="#/quiz/weekly-w${week}">开始</a></div>
    </div>
    <div class="card">
      <strong>月考</strong><div class="muted">Day 30 / Day 60 解锁（暂不可用）</div>
    </div>
  `;
}

export async function renderQuiz(content, { quizId, router }) {
  const path = quizId.startsWith("daily-")
    ? `./assets/data/quizzes/daily/${quizId}.json`
    : quizId.startsWith("weekly-")
      ? `./assets/data/quizzes/weekly/${quizId}.json`
      : `./assets/data/quizzes/monthly/${quizId}.json`;

  let data;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    content.innerHTML = `<h1>📊 ${quizId}</h1><p class="muted">题库 <code>${quizId}.json</code> 尚未提供（${e.message}）。</p>`;
    return;
  }
  const v = validateQuiz(data);
  if (!v.ok) {
    content.innerHTML = `<h1>⚠️ ${quizId} 数据错误</h1><pre>${v.errors.join("\n")}</pre>`;
    return;
  }

  const inputs = data.questions.map((q, i) => {
    if (q.type === "choice") {
      const opts = q.options.map(o => `<label><input type="radio" name="${q.id}" value="${escapeAttr(o)}"> ${escapeHTML(o)}</label>`).join("");
      return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><div class="qopts">${opts}</div></div>`;
    }
    if (q.type === "fill") {
      return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><input type="text" class="qfill" data-qid="${q.id}" placeholder="作答..."></div>`;
    }
    return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><textarea class="qshort" data-qid="${q.id}" placeholder="简要作答..."></textarea></div>`;
  }).join("");

  content.innerHTML = `
    <h1>📊 ${data.id}</h1>
    <p class="muted">模块 ${data.module} · 共 ${data.questions.length} 题</p>
    <form id="quizForm">${inputs}</form>
    <button class="btn" id="submitQuiz">提交答案</button>
    <div id="quizResult"></div>
  `;

  document.getElementById("submitQuiz").addEventListener("click", () => {
    const responses = data.questions.map(q => {
      if (q.type === "choice") {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        return { qid: q.id, answer: checked?.value };
      }
      if (q.type === "fill") return { qid: q.id, answer: document.querySelector(`input[data-qid="${q.id}"]`).value };
      return { qid: q.id, answer: document.querySelector(`textarea[data-qid="${q.id}"]`).value };
    });
    showResults(data, responses);
  });

  function showResults(quiz, responses) {
    const result = scoreQuizResults(quiz.questions, responses);
    const items = quiz.questions.map((q, i) => {
      const e = result.entries[i];
      const r = responses[i];
      if (q.type === "short") {
        return `<div class="result-item">
          <div><strong>${i+1}. ${escapeHTML(q.prompt)}</strong></div>
          <div class="muted">你的答案：${escapeHTML(r.answer || "（未作答）")}</div>
          <div class="card" style="margin-top:6px"><strong>参考答案：</strong>${escapeHTML(q.referenceAnswer)}</div>
          <div style="margin-top:8px">自评：
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="right">✓ 答对</button>
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="partial">部分对</button>
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="wrong">✗ 没答对</button>
            <span class="dim self-rate-status" id="rate-${q.id}"></span>
          </div>
        </div>`;
      }
      const correct = e.correct;
      return `<div class="result-item">
        <div><strong>${i+1}. ${escapeHTML(q.prompt)}</strong></div>
        <div class="${correct?'ok':'fail'}">${correct ? "✓ 正确" : "✗ 错误"}（你：${escapeHTML(String(r.answer ?? "未作答"))} · 答案：${escapeHTML(String(q.answer))}）</div>
      </div>`;
    }).join("");

    document.getElementById("quizResult").innerHTML = `
      <h2 style="margin-top:32px">结果：${result.score} / ${result.total}</h2>
      ${items}
      <p class="muted" style="margin-top:16px">简答题完成自评后，将自动写入薄弱项统计。</p>
    `;

    // self-rate handlers
    document.querySelectorAll(".self-rate").forEach(btn => {
      btn.addEventListener("click", () => {
        const qid = btn.dataset.qid;
        const rate = btn.dataset.rate;
        const r = responses.find(x => x.qid === qid);
        r.selfRated = rate;
        document.getElementById(`rate-${qid}`).textContent = `已自评：${rate}`;
        persistAndUpdate(quiz, responses);
      });
    });

    persistAndUpdate(quiz, responses);
  }

  function persistAndUpdate(quiz, responses) {
    const result = scoreQuizResults(quiz.questions, responses);
    const all = storage.get("quizResults", {});
    all[quiz.id] = {
      module: quiz.module,
      score: result.score,
      total: result.total,
      responses,
      submittedAt: new Date().toISOString(),
    };
    storage.set("quizResults", all);
  }
}

function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s) { return escapeHTML(s); }
```

- [ ] **Step 4: Create `assets/js/report.js`**

```js
import { storage } from "./storage.js";
import { notes } from "./notes.js";
import { summarizeByModule } from "./quiz.js";

export function buildDailyReport(dayId, progress) {
  const note = notes.get(dayId);
  const allQuiz = storage.get("quizResults", {});
  const quizKey = `daily-${dayId}`;
  const quiz = allQuiz[quizKey];
  const moduleSummary = summarizeByModule(
    Object.values(allQuiz).map(q => ({ module: q.module, score: q.score, total: q.total }))
  );
  const state = progress.getState();
  return {
    dayId,
    completedAt: state.lastCompletedAt,
    streak: state.streak,
    quiz: quiz ? { score: quiz.score, total: quiz.total } : null,
    notePreview: (note.content || "").slice(0, 200),
    moduleSummary,
    encouragement: pickEncouragement(state),
  };
}

function pickEncouragement(state) {
  const n = state.completedDays.length;
  if (n === 1) return "万事开头难，你已经迈出第一步。";
  if (n === 7) return "Week 1 完成！光学基础已经入门。";
  if (n === 30) return "你已坚持一个月，知识体系正在成型。";
  if (n === 60) return "60 天闭关修炼完成，去面试吧！";
  if (state.streak >= 7) return `连续打卡 ${state.streak} 天，习惯已经形成。`;
  return "稳扎稳打，每天 4 小时就是最好的节奏。";
}
```

- [ ] **Step 5: Create `assets/js/views/report-view.js`**

```js
import { buildDailyReport } from "../report.js";

export function renderReport(content, { dayId, progress }) {
  const targetDayId = dayId ?? `day-${String(Math.min(progress.getState().currentDay, 60)).padStart(2, "0")}`;
  const r = buildDailyReport(targetDayId, progress);
  const moduleHTML = Object.entries(r.moduleSummary).map(([m, s]) =>
    `<li>${m}：${(s.accuracy*100).toFixed(0)}% （${s.score}/${s.total}）</li>`
  ).join("");
  content.innerHTML = `
    <h1>📈 日报 · ${targetDayId}</h1>
    <div class="card">
      <div><strong>完成时间：</strong>${r.completedAt ?? "今日"}</div>
      <div><strong>连续打卡：</strong>🔥 ${r.streak} 天</div>
      <div><strong>今日小测：</strong>${r.quiz ? `${r.quiz.score} / ${r.quiz.total}` : "未做"}</div>
    </div>
    <div class="card">
      <strong>笔记摘要</strong>
      <p class="muted">${r.notePreview || "（今日未记笔记）"}…</p>
    </div>
    <div class="card">
      <strong>模块累积正确率</strong>
      <ul>${moduleHTML || "<li class='muted'>暂无数据</li>"}</ul>
    </div>
    <p class="muted" style="font-style:italic">${r.encouragement}</p>
    <button class="btn secondary" onclick="window.app.exportReport('${targetDayId}')">📤 导出今日日报</button>
  `;
}
```

- [ ] **Step 6: Create `assets/js/views/weakness-view.js`**

```js
import { storage } from "../storage.js";
import { summarizeByModule } from "../quiz.js";
import { categorizeModules, recommendReview } from "../weakness.js";

const MODULE_INDEX = {
  M1: { title: "光学与硬件基础", days: [1,2,3,4,5,6,7] },
  M2: { title: "ISP Pipeline",  days: [8,9,10,11,12,13,14] },
  M3: { title: "AEC 自动曝光",  days: [15,16,17,18,19,20,21,22,23,24,25,26,27,28] },
  M4: { title: "AWB 自动白平衡", days: [29,30,31,32,33,34,35,36,37,38,39,40,41,42] },
  M5: { title: "AF 自动对焦",   days: [43,44,45,46] },
  M6: { title: "Flash + HDR + 色彩", days: [47,48,49,50,51,52,53] },
  M7: { title: "工具与工程方法", days: [54,55,56,57,58,59,60] },
};

export function renderWeakness(content, _ctx) {
  const all = storage.get("quizResults", {});
  const records = Object.values(all).map(q => ({ module: q.module, score: q.score, total: q.total }));
  const summary = summarizeByModule(records);
  const cat = categorizeModules(summary);
  const recs = recommendReview(summary, MODULE_INDEX);

  const bars = Object.keys(MODULE_INDEX).map(m => {
    const c = cat[m] ?? { bucket: "untested", accuracy: 0, total: 0, score: 0 };
    const pct = c.total > 0 ? (c.accuracy * 100).toFixed(0) : "—";
    const cls = `bar bar-${c.bucket}`;
    const width = c.total > 0 ? (c.accuracy * 100).toFixed(0) + "%" : "0%";
    return `<div class="weakness-row">
      <div class="weakness-label">${m} ${MODULE_INDEX[m].title}</div>
      <div class="weakness-bar"><div class="${cls}" style="width:${width}"></div></div>
      <div class="weakness-pct">${pct}${pct !== "—" ? "%" : ""}</div>
    </div>`;
  }).join("");

  const recsHTML = recs.length === 0
    ? `<p class="muted">暂无需要复习的模块。继续保持。</p>`
    : recs.map(r => {
        const dayLinks = (r.days ?? []).map(d => `<a href="#/today" onclick="event.preventDefault();alert('Day ${d} 复习入口将在后续完善')">Day ${d}</a>`).join(" · ");
        return `<div class="card"><strong>${r.module} · ${r.title}</strong> <span class="dim">${r.reason}</span><div style="margin-top:6px">${dayLinks}</div></div>`;
      }).join("");

  content.innerHTML = `
    <h1>🎯 薄弱项</h1>
    <div class="weakness-chart">${bars}</div>
    <h2 style="margin-top:24px">推荐复习</h2>
    ${recsHTML}
  `;
}
```

- [ ] **Step 7: Add CSS for quiz / notes / weakness**

Append to `assets/css/components.css`:

```css
.note-editor { width: 100%; min-height: 400px; padding: 12px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-sans); font-size: 14px; line-height: 1.7; resize: vertical; }

.quiz-item { background: var(--surface); padding: 16px; border-radius: var(--radius); margin-bottom: 12px; border: 1px solid var(--border); }
.qprompt { font-weight: 600; margin-bottom: 12px; }
.qopts label { display: block; padding: 6px 0; cursor: pointer; }
.qopts input[type=radio] { margin-right: 8px; }
.qfill, .qshort { width: 100%; padding: 8px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; font-family: inherit; }
.qshort { min-height: 80px; resize: vertical; }
.result-item { padding: 12px; border-bottom: 1px solid var(--border); }
.result-item .ok { color: var(--success); }
.result-item .fail { color: var(--danger); }

.weakness-chart { display: flex; flex-direction: column; gap: 10px; margin: 16px 0; }
.weakness-row { display: grid; grid-template-columns: 220px 1fr 60px; align-items: center; gap: 12px; }
.weakness-label { color: var(--text-muted); font-size: 13px; }
.weakness-bar { background: var(--surface-2); height: 14px; border-radius: 7px; overflow: hidden; }
.weakness-pct { text-align: right; color: var(--text-muted); font-size: 13px; }
.bar-mastered { background: var(--success); height: 100%; }
.bar-partial  { background: var(--warning); height: 100%; }
.bar-urgent   { background: var(--danger);  height: 100%; }
.bar-untested { background: var(--surface-2); height: 100%; }
```

- [ ] **Step 8: Wire all routes in `assets/js/app.js`**

Replace the relevant route handlers and append helpers. Final routing block:

```js
const router = new Router()
  .on("#/overview", async () => {
    renderSidebar("#/overview");
    const { renderOverview } = await import("./views/overview.js");
    renderOverview(content, { progress, router });
  })
  .on("#/today", async () => {
    renderSidebar("#/today");
    const { renderToday } = await import("./views/today.js");
    await renderToday(content, { progress, router, persistProgress });
  })
  .on("#/notes", async () => {
    renderSidebar("#/notes");
    const { renderNotesList } = await import("./views/notes-view.js");
    renderNotesList(content, { router });
  })
  .on("#/notes/:dayId", async (p) => {
    renderSidebar("#/notes");
    const { renderNoteEditor } = await import("./views/notes-view.js");
    renderNoteEditor(content, { dayId: p.dayId });
  })
  .on("#/quiz", async () => {
    renderSidebar("#/quiz");
    const { renderQuizCenter } = await import("./views/quiz-view.js");
    renderQuizCenter(content, { progress });
  })
  .on("#/quiz/:quizId", async (p) => {
    renderSidebar("#/quiz");
    const { renderQuiz } = await import("./views/quiz-view.js");
    await renderQuiz(content, { quizId: p.quizId, router });
  })
  .on("#/report", async () => {
    renderSidebar("#/report");
    const { renderReport } = await import("./views/report-view.js");
    renderReport(content, { dayId: null, progress });
  })
  .on("#/report/:dayId", async (p) => {
    renderSidebar("#/report");
    const { renderReport } = await import("./views/report-view.js");
    renderReport(content, { dayId: p.dayId, progress });
  })
  .on("#/weakness", async () => {
    renderSidebar("#/weakness");
    const { renderWeakness } = await import("./views/weakness-view.js");
    renderWeakness(content, {});
  })
  .setNotFound(() => { renderSidebar(""); placeholderView("404 路径未找到"); });

router.start();

import { notes } from "./notes.js";
function downloadFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

window.app = {
  progress, persistProgress, router, storage,
  exportNotesMd: () => downloadFile(`notes-${new Date().toISOString().slice(0,10)}.md`, notes.exportMarkdown(), "text/markdown"),
  exportNotesJson: () => downloadFile(`notes-${new Date().toISOString().slice(0,10)}.json`, notes.exportJSON(), "application/json"),
  importNotesJson: async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    notes.importJSON(text);
    alert("笔记已导入。请刷新页面。");
  },
  exportReport: (dayId) => {
    import("./report.js").then(({ buildDailyReport }) => {
      const r = buildDailyReport(dayId, progress);
      const md = `# 日报 · ${dayId}\n\n- 完成时间：${r.completedAt}\n- 连续打卡：${r.streak} 天\n- 小测：${r.quiz ? r.quiz.score + "/" + r.quiz.total : "未做"}\n\n## 笔记摘要\n${r.notePreview}\n\n## 模块正确率\n${Object.entries(r.moduleSummary).map(([m,s])=>`- ${m}: ${(s.accuracy*100).toFixed(0)}%`).join("\n")}\n\n> ${r.encouragement}\n`;
      downloadFile(`report-${dayId}.md`, md, "text/markdown");
    });
  },
};
```

- [ ] **Step 9: Manual end-to-end smoke test**

Server: `python3 -m http.server 8080`. Walk through:
1. Visit `#/overview` — see grid
2. Visit `#/today` — see "day-01.json 尚未提供" placeholder (expected; content arrives in Task 12)
3. Visit `#/notes/day-01` — type a sentence, see "已保存"
4. Refresh — note still there
5. Click "导出 Markdown" → file downloads
6. Visit `#/quiz` → click "每日小测" → expect "尚未提供"
7. Visit `#/weakness` → see empty chart with all modules at 0%
8. Visit `#/report` → see "暂无数据"

- [ ] **Step 10: Commit**

```bash
git add assets/js/notes.js assets/js/report.js assets/js/views/ assets/js/app.js assets/css/components.css
git commit -m "feat(views): notes / quiz / report / weakness pages with persistence"
```

---

## Task 12: Curriculum + Day 1-7 content

**Files:**
- Create: `assets/data/curriculum.json`
- Create: `assets/data/days/day-01.json` through `day-07.json`

**Why:** This is the content production task. Each Day file is dense — written here in the plan so the engineer (you, in execution phase) writes from a complete spec.

**Important:** This task produces the most prose content of the whole plan. Each Day file should be **3,000-5,000 Chinese characters** of substantive teaching content. The skeletons below show structure; **the engineer must fill each section's `content` with teaching material** drawing from the two Qualcomm PDFs (chapter references provided), public optical/imaging knowledge, and analogies for absolute beginners. **No placeholder text in final commit.**

- [ ] **Step 1: Create `assets/data/curriculum.json`**

```json
{
  "weeks": [
    { "id": "w1", "title": "Week 1 · 光学与 Camera 硬件入门", "days": ["day-01","day-02","day-03","day-04","day-05","day-06","day-07"] },
    { "id": "w2", "title": "Week 2 · ISP Pipeline 全链路", "days": ["day-08","day-09","day-10","day-11","day-12","day-13","day-14"] },
    { "id": "w3", "title": "Week 3 · AEC 第一阶段：基础", "days": ["day-15","day-16","day-17","day-18","day-19","day-20","day-21"] },
    { "id": "w4", "title": "Week 4 · AEC 第二阶段：进阶", "days": ["day-22","day-23","day-24","day-25","day-26","day-27","day-28"] },
    { "id": "w5", "title": "Week 5 · AWB 第一阶段：基础", "days": ["day-29","day-30","day-31","day-32","day-33","day-34","day-35"] },
    { "id": "w6", "title": "Week 6 · AWB 第二阶段：进阶", "days": ["day-36","day-37","day-38","day-39","day-40","day-41","day-42"] },
    { "id": "w7", "title": "Week 7 · AF + Flash + HDR 综合", "days": ["day-43","day-44","day-45","day-46","day-47","day-48","day-49"] },
    { "id": "w8", "title": "Week 8 · 色彩科学 + 工具实操 + 面试冲刺", "days": ["day-50","day-51","day-52","day-53","day-54","day-55","day-56","day-57","day-58","day-59","day-60"] }
  ],
  "days": [
    { "id": "day-01", "week": 1, "module": "M1", "title": "认识光与曝光三要素" },
    { "id": "day-02", "week": 1, "module": "M1", "title": "Bayer 阵列与 CFA：相机如何看到颜色" },
    { "id": "day-03", "week": 1, "module": "M1", "title": "CMOS 传感器工作原理" },
    { "id": "day-04", "week": 1, "module": "M1", "title": "镜头、光圈与马达对焦" },
    { "id": "day-05", "week": 1, "module": "M1", "title": "快门、曝光时间与帧率" },
    { "id": "day-06", "week": 1, "module": "M1", "title": "闪光灯：LED 与色温" },
    { "id": "day-07", "week": 1, "module": "M1", "title": "Week 1 总结 + 硬件全景图" }
  ]
}
```

> Days for Week 2-8 will be added in subsequent plans. The validator allows partial `days[]` for Plan 1 — actually wait: validator currently requires 60. **Modify `validateCurriculum` to accept any count during MVP.**

Update `assets/js/validators.js`:

Old:
```js
if (!Array.isArray(c.days) || c.days.length !== 60) errors.push(`expect 60 days, got ${c.days?.length}`);
```

New:
```js
if (!Array.isArray(c.days)) errors.push(`days must be an array`);
if (Array.isArray(c.days) && c.days.length > 60) errors.push(`days length cannot exceed 60`);
```

Update test `tests/data-validators.test.js` last test:

Old:
```js
test("validateCurriculum: rejects when day count != 60", () => {
  const c = { weeks: [], days: [{ id: "day-01", week: 1, module: "M1" }] };
  const r = validateCurriculum(c);
  assert.equal(r.ok, false);
});
```

New:
```js
test("validateCurriculum: rejects when day count > 60", () => {
  const c = { weeks: [], days: [] };
  for (let w = 1; w <= 8; w++) c.weeks.push({ id: `w${w}`, title: `W${w}`, days: [] });
  for (let d = 1; d <= 61; d++) c.days.push({ id: `day-${d}`, week: 1, module: "M1" });
  const r = validateCurriculum(c);
  assert.equal(r.ok, false);
});
```

Run: `node --test tests/data-validators.test.js` — expect all pass.

- [ ] **Step 2: Create `day-01.json` — 认识光与曝光三要素**

```json
{
  "id": "day-01",
  "week": 1,
  "module": "M1",
  "title": "认识光与曝光三要素",
  "estimatedMinutes": 240,
  "sections": [
    {
      "id": "s1",
      "title": "课程开篇：什么是 Camera Tuning",
      "type": "concept",
      "content": "<<<填充内容（约 800 字）：以「同样的手机为什么不同人拍出来效果不一样」为切入点，类比厨师调味（同样的食材厨师不同味道不同），引出 Camera Tuning 工程师的核心职责：在硬件能力上限内，通过参数调整让相机在各种环境下都拍出符合人眼预期的照片。引出 3A（AE/AWB/AF）的全貌。给出 60 天学习地图。>>>",
      "glossary": [
        { "term": "Camera Tuning", "zh": "相机调教", "explain": "通过软件参数和算法配置，让相机硬件在不同场景下输出最佳画质的过程。" },
        { "term": "3A", "zh": "三个自动", "explain": "Auto Exposure（自动曝光）、Auto White Balance（自动白平衡）、Auto Focus（自动对焦），相机最核心的三套自动控制算法。" }
      ]
    },
    {
      "id": "s2",
      "title": "光是什么：从光子到像素",
      "type": "concept",
      "content": "<<<填充内容（约 1000 字）：从「光是电磁波」讲起，强度（亮）+ 波长（颜色）。光子击中传感器像素 → 转化为电荷 → 量化为数字（RAW 值）。这个过程中的两个关键变量：进光量（积分时间 + 光圈）和放大倍数（Gain）。强调「噪声」也是这一步引入的。配示意图：光子 → 像素阱 → 模拟电压 → ADC → 数字值。>>>",
      "glossary": [
        { "term": "Photon", "zh": "光子", "explain": "光的最小能量单位。" },
        { "term": "ADC", "zh": "模数转换器", "explain": "Analog-to-Digital Converter，把模拟电压转成数字值的电路。" },
        { "term": "RAW", "zh": "原始数据", "explain": "传感器直接输出、未经任何处理的图像数据。" }
      ]
    },
    {
      "id": "s3",
      "title": "曝光三要素：光圈、快门、感光度",
      "type": "concept",
      "content": "<<<填充内容（约 1200 字）：三要素的物理意义：光圈（Aperture，控制单位时间进光面积），快门（Shutter / Exposure Time，控制时间），感光度（ISO，控制电子放大倍数）。手机摄像头光圈固定（F1.6/F1.8 等），实际可控的是快门和 ISO。三者关系：曝光量 = 光圈 × 时间 × ISO。引入 EV（Exposure Value）概念：曝光量的对数刻度，每加 1 EV 就是亮度翻倍。配「曝光圆盘」示意图，配真实拍摄案例（同一场景不同曝光参数对比）。>>>",
      "glossary": [
        { "term": "Aperture", "zh": "光圈", "explain": "镜头中可调节的进光孔大小，单位 F 数；F 数越小，光圈越大。" },
        { "term": "Shutter", "zh": "快门 / 曝光时间", "explain": "传感器接收光子的时长。手机里实际是「电子快门」。" },
        { "term": "ISO", "zh": "感光度", "explain": "对模拟信号的放大倍数。数值越高，画面越亮但噪声也越多。" },
        { "term": "EV", "zh": "曝光值", "explain": "Exposure Value，曝光量的对数刻度。EV 0 通常代表标准曝光，每 +1 表示亮度翻倍。" }
      ]
    },
    {
      "id": "s4",
      "title": "曝光方程：BV、TV、AV、SV",
      "type": "concept",
      "content": "<<<填充内容（约 800 字）：经典曝光方程 AV + TV = BV + SV = EV。AV = log2(光圈²) ，TV = -log2(快门时间)，BV = 场景亮度（环境给定），SV = log2(ISO/3.125)。讲清四个变量的物理含义和单位。这就是面试题第 8 题「曝光方程是怎样的」的标准答案。给出推导和典型场景下的数值例子（如室外晴天 BV ≈ 9，室内灯光 BV ≈ 4）。>>>",
      "glossary": [
        { "term": "BV", "zh": "亮度值", "explain": "Brightness Value，场景的亮度，由环境决定。" },
        { "term": "SV", "zh": "感光度值", "explain": "Speed Value，ISO 的对数表示。" }
      ]
    },
    {
      "id": "s5",
      "title": "本日小结",
      "type": "recap",
      "content": "<<<填充内容（约 300 字）：今天我们建立了相机最基础的物理直觉：光从场景到照片中间发生了什么、用什么三个变量控制曝光、以及一个面试必考方程。明天我们会进入相机的「眼睛」——Bayer 阵列，看相机是如何辨认颜色的。>>>"
    }
  ],
  "references": [
    { "source": "维基百科 · 曝光值", "url": "https://zh.wikipedia.org/wiki/%E6%9B%9D%E5%85%89%E5%80%BC" },
    { "source": "高通 3A 7.0 Tuning Guide", "page": 14, "section": "2 AEC 调试（背景上下文）" }
  ],
  "dailyQuizId": "daily-day-01"
}
```

> The execution agent must replace each `<<<填充内容...>>>` with real teaching prose written in friendly Chinese tone, drawing on the references and the user's beginner background. **No placeholder allowed in final commit.**

- [ ] **Step 3: Create `day-02.json` — Bayer 阵列与 CFA**

```json
{
  "id": "day-02",
  "week": 1,
  "module": "M1",
  "title": "Bayer 阵列与 CFA：相机如何看到颜色",
  "estimatedMinutes": 240,
  "sections": [
    {
      "id": "s1",
      "title": "硅芯片不认得颜色",
      "type": "concept",
      "content": "<<<填充内容（约 700 字）：传感器像素只能数光子数，区分不了波长（颜色）。所以人类发明了「滤光片」：在每个像素上盖一个红 / 绿 / 蓝的小滤镜，只让一种颜色的光通过。这就是 CFA（Color Filter Array）。引出 1976 年 Bryce Bayer 发明的经典 Bayer 阵列：RGGB / BGGR / GRBG / GBRG 四种排列方式。>>>",
      "glossary": [
        { "term": "CFA", "zh": "滤色阵列", "explain": "Color Filter Array，覆盖在传感器像素上的彩色滤镜阵列。" },
        { "term": "Bayer", "zh": "拜耳", "explain": "最常见的 CFA 排列模式，2×2 网格里 1 红 2 绿 1 蓝。" }
      ]
    },
    {
      "id": "s2",
      "title": "为什么是 RGGB，绿色为什么有两个",
      "type": "concept",
      "content": "<<<填充内容（约 700 字）：人眼对绿色最敏感（视网膜里 60% 视锥细胞响应绿光），所以 Bayer 阵列里绿色像素是红蓝的两倍。这让最终图像的亮度信息保留得最完整。配示意图：4×4 的小阵列展开。>>>",
      "glossary": []
    },
    {
      "id": "s3",
      "title": "Demosaic：把残缺的颜色补全",
      "type": "concept",
      "content": "<<<填充内容（约 900 字）：每个像素只记录了一种颜色，所以最终图片每个像素的另两种颜色需要「猜」出来——这就是 Demosaic（去马赛克）。最简单的算法是邻近插值，最常用的是双线性插值。讲算法直觉，不写代码。指出 Demosaic 是 ISP Pipeline 早期的关键模块，影响色彩准确度和锐度。>>>",
      "glossary": [
        { "term": "Demosaic", "zh": "去马赛克", "explain": "把 Bayer 原图（每像素 1 种颜色）还原成完整 RGB 图（每像素 3 种颜色）的算法。" }
      ]
    },
    {
      "id": "s4",
      "title": "其他 CFA 模式",
      "type": "concept",
      "content": "<<<填充内容（约 600 字）：RYYB（华为用过，提升进光量）、RGB-W（加白色像素）、Quad Bayer（4×4 同色块，可做高分像素合并）、Tetra Cell、Nona Cell。讲清各自取舍。这些会出现在你的行业前辈笔记里、面试中也可能问到。>>>",
      "glossary": [
        { "term": "Quad Bayer", "zh": "四拜耳", "explain": "把 2×2 同色像素堆在一起的 CFA 变种，常用于高像素手机的像素合并模式。" }
      ]
    },
    {
      "id": "s5",
      "title": "本日小结",
      "type": "recap",
      "content": "<<<填充内容（约 250 字）：你现在知道相机如何「看到」颜色了。明天我们看像素本身怎么从光子变成数字——CMOS 传感器原理。>>>"
    }
  ],
  "references": [
    { "source": "高通 3A 7.0 Tuning Guide", "page": 88, "section": "7 AWB 过程概述（涉及 Bayer 网格统计）" }
  ],
  "dailyQuizId": "daily-day-02"
}
```

- [ ] **Step 4: Create `day-03.json` — CMOS 传感器工作原理**

Same structure: 5 sections covering: (1) 像素的物理结构（光电二极管 + 读出电路），(2) 全局快门 vs 卷帘快门，(3) Sensor 噪声的来源（暗电流、读出噪声、散粒噪声），(4) 高通笔记中的 OB（Optical Black）和 Shading 起源，(5) 小结。Estimated content: ~3500 字 total. Reference: 7.0 Tuning Guide p.18-22 (ISO calibration), public CMOS architecture diagrams.

> Engineer: write following the same JSON schema as day-01/02. dailyQuizId = "daily-day-03". Don't ship placeholders.

- [ ] **Step 5: Create `day-04.json` — 镜头、光圈与马达对焦**

5 sections: (1) 镜头组与光路，(2) 光圈结构（手机为何固定光圈）, (3) VCM / 形状记忆合金等马达类型，(4) 对焦原理铺垫（CDAF / PDAF 提一嘴，详细 Week 7 讲）, (5) 小结。dailyQuizId = "daily-day-04".

- [ ] **Step 6: Create `day-05.json` — 快门、曝光时间与帧率**

5 sections: (1) 卷帘快门工作过程, (2) 帧率与曝光时间关系（含 PRD 面试题：「帧率是 240 的曝光时间」），(3) Frame Length / Line Length（Vertical Blanking）, (4) Antibanding（抗带状）的物理来源——市电 50/60Hz 闪烁，(5) 小结。dailyQuizId = "daily-day-05". Reference 7.0 Tuning Guide §3.1 调试曝光表 + §6.4 最短消隐时间计算.

- [ ] **Step 7: Create `day-06.json` — 闪光灯：LED 与色温**

5 sections: (1) 闪光灯类型（LED / 双 LED / Xenon），(2) 主闪 vs 预闪，flux 概念（PRD 面试题：「主闪和预闪的比率 flux」），(3) 色温（CCT）与冷暖光，(4) 室内外色温常识（D50/D65/A 光源），(5) 小结。dailyQuizId = "daily-day-06". Reference 7.0 Tuning Guide §6.11 LED 闪光灯.

- [ ] **Step 8: Create `day-07.json` — Week 1 总结 + 硬件全景图**

5 sections: (1) 一周回顾，(2) 一张大图把镜头/光圈/马达/快门/Sensor/CFA/ADC 串起来, (3) 介绍下周要进入的 ISP Pipeline 是「数字侧」, (4) Week 1 易混淆点 FAQ（如 EV vs ISO 的关系，光圈的 F 数为什么数字越小光圈越大）, (5) 小结。dailyQuizId = "daily-day-07". 

- [ ] **Step 9: Manual verification**

Server: `python3 -m http.server 8080`. Reset progress in console: `localStorage.clear(); location.reload();`. Visit `#/today` — Day 1 fully renders with all sections, glossary, and references. Click 「完成本日」 → confirm dialog → routed to report → Day 2 unlocks (check `#/today` shows Day 2 content). Repeat through Day 7.

- [ ] **Step 10: Commit**

```bash
git add assets/data/curriculum.json assets/data/days/ assets/js/validators.js tests/data-validators.test.js
git commit -m "feat(content): Week 1 curriculum + day-01..day-07 lessons"
```

---

## Task 13: Week 1 quizzes (7 daily + 1 weekly)

**Files:**
- Create: `assets/data/quizzes/daily/daily-day-01.json` through `daily-day-07.json`
- Create: `assets/data/quizzes/weekly/weekly-w1.json`

**Why:** Each Day needs its quiz; Week 1 needs an aggregated weekly quiz. PRD interview questions start being seeded at Week 1 already (those that fit Week 1 scope: 曝光方程, 帧率与曝光时间).

- [ ] **Step 1: Create `daily-day-01.json`**

```json
{
  "id": "daily-day-01",
  "module": "M1",
  "scope": "daily",
  "questions": [
    {
      "id": "q1",
      "type": "choice",
      "prompt": "曝光三要素中，手机相机用户实际可控的是？",
      "options": ["光圈和快门", "快门和 ISO", "光圈和 ISO", "光圈、快门、ISO 都可控"],
      "answer": "快门和 ISO",
      "explain": "手机摄像头光圈通常是物理固定的，所以实际可调的只有曝光时间和 ISO。"
    },
    {
      "id": "q2",
      "type": "choice",
      "prompt": "EV 加 1 表示曝光量？",
      "options": ["增加 50%", "翻倍", "变为原来 4 倍", "增加 10 倍"],
      "answer": "翻倍",
      "explain": "EV 是 log2 刻度，每加 1 等于亮度翻倍。"
    },
    {
      "id": "q3",
      "type": "fill",
      "prompt": "曝光方程是 AV + TV = ___ + SV = EV。空格填入？",
      "answer": ["BV"],
      "explain": "BV（Brightness Value）= 场景亮度。"
    },
    {
      "id": "q4",
      "type": "fill",
      "prompt": "光圈 F 数越小，进光量越___（大/小）。",
      "answer": ["大"]
    },
    {
      "id": "q5",
      "type": "short",
      "prompt": "用一句话解释什么是 ISO？为什么提高 ISO 会带来噪声？",
      "referenceAnswer": "ISO 是对模拟信号的放大倍数。提高 ISO 时，信号和噪声同时被放大，且放大过程本身也会引入读出噪声，所以高 ISO 画面噪点更明显。"
    }
  ]
}
```

- [ ] **Step 2: Create `daily-day-02.json`**

5 题，覆盖：(1) Bayer 排列里绿色像素占比的选择题, (2) Demosaic 的填空题, (3) RGGB 含义的简答, (4) 为什么人眼对绿色更敏感的选择题, (5) 列举 3 种 CFA 变种的简答（参考答案：RYYB/RGB-W/Quad Bayer 等）.

- [ ] **Step 3: Create `daily-day-03.json`**

5 题，覆盖：(1) CMOS vs CCD 选择题, (2) 卷帘快门和全局快门区别填空, (3) Sensor 噪声三种来源简答, (4) OB 是什么的填空, (5) 为什么暗光下噪声更明显的简答.

- [ ] **Step 4: Create `daily-day-04.json`**

5 题，覆盖：(1) VCM 是什么填空, (2) 手机为什么大多固定光圈选择题, (3) 大光圈 vs 小光圈对景深影响的选择, (4) F1.8 比 F2.8 进光量多多少倍简答, (5) 镜头模组的关键部件列举.

- [ ] **Step 5: Create `daily-day-05.json`**

5 题，包括 **PRD 面试题**：「240 帧率的曝光时间是？」(填空，答案 1/240 s ≈ 4.17 ms)；以及 Frame Length / Line Length 概念题 / 抗带状原理简答。

- [ ] **Step 6: Create `daily-day-06.json`**

5 题，包括 **PRD 面试题**：「调整主闪和预闪的比率 flux 来解决过曝时，flux 越大照片越___？」(填空：暗)；色温对应光源（5500K = ?、3000K = ?）的选择；CCT 单位的填空。

- [ ] **Step 7: Create `daily-day-07.json`**

综合复习，5 题：(1) 一道情景题：「你看到一张照片噪点很多，从硬件链路角度可能是哪些环节导致？」(简答), (2) 曝光方程从 EV 推 ISO 的填空, (3) 三要素与画面影响的连线题（用选择实现）, (4) 光圈/快门/ISO 各自单调影响什么的简答, (5) 一道开放题：「请用自己的话给非工程师解释什么是 ISO？」(简答, referenceAnswer 给出范例).

- [ ] **Step 8: Create `weekly-w1.json` — Week 1 周考**

```json
{
  "id": "weekly-w1",
  "module": "M1",
  "scope": "weekly",
  "questions": [
    /* 包含 15-20 题，结构：
       - 5 道选择题（基础概念）
       - 4 道填空题（数值/术语）
       - 4 道简答题（含 PRD 面试题：曝光方程、240帧率、flux 与亮度关系）
       - 2 道情景题（简答）
       覆盖 Day 1-7 的全部知识点 */
  ]
}
```

The engineer fills the 15-20 question array following the choice/fill/short schema demonstrated in `daily-day-01.json`. **Must include these PRD-sourced interview items:**
- 曝光方程是怎样的？(short)
- 帧率是 240 的曝光时间？(fill, answer 1/240 s 或 4.17 ms)
- 调整主闪和预闪的比率 flux，flux 越大照片越___？(fill, 暗)
- 高通 AE 分为多少个数据块统计的？(fill, 64×48 — 即使 Week 1 还没讲，作为「下周预告」放在最后一题, mark explain 引导期待)

- [ ] **Step 9: Manual verification**

Server: `python3 -m http.server 8080`. With Day 1 unlocked:
1. `#/today` → 「📊 今日小测」按钮 → Daily 1 渲染
2. 答题 → 提交 → 看得分、自评简答题
3. 回到 `#/weakness` → M1 模块出现正确率柱状图
4. 全部 7 天小测做完 → 进 `#/quiz/weekly-w1` → 周考可作答

- [ ] **Step 10: Commit**

```bash
git add assets/data/quizzes/
git commit -m "feat(content): Week 1 daily + weekly quizzes with PRD interview seeds"
```

---

## Task 14: All-tests run + lint pass

**Files:** No new files; this task is a verification gate.

**Why:** Before declaring Plan 1 done, every test must pass and the manual smoke flow must work end-to-end.

- [ ] **Step 1: Run the full test suite**

Run: `cd /Users/mi/3A && node --test tests/`
Expected output: `# pass NN # fail 0` with all suites green.

If any test fails, fix the underlying module (not the test) and rerun.

- [ ] **Step 2: Browser smoke test (clean state)**

```bash
python3 -m http.server 8080
```

In Chrome:
1. Open http://localhost:8080/
2. DevTools console: `localStorage.clear(); location.reload();`
3. Click through nav: 总览 → 今日 → 笔记 → 考核 → 日报 → 薄弱项 — every page renders, no console errors
4. Complete Day 1 → Day 2 unlocks
5. Take Daily 1 quiz → submit → self-rate short-answer → score persists
6. Reload page → progress + notes + quiz results all persist
7. Open `#/weakness` → M1 shows updated accuracy
8. Export notes → file downloads → re-import → notes restored
9. Repeat for Days 2-7 quickly (don't need to read every word, just confirm the flow doesn't break)
10. After Day 7 complete, take weekly-w1 quiz

- [ ] **Step 3: Cross-browser sanity check**

Open the same URL in another Chromium-based browser (Edge if available on Mac, or Brave). Verify nothing breaks. Document any rendering issues for follow-up plans.

- [ ] **Step 4: Commit (if any test fixes were made)**

```bash
git add -A
git commit -m "test: full Plan 1 verification pass"
```

If nothing changed, skip this commit.

---

## Task 15: README for the user

**Files:**
- Create: `README.md`

**Why:** User will move this folder to Windows. They need clear instructions for opening it without our handholding.

- [ ] **Step 1: Create `README.md`**

```markdown
# 📷 Camera 3A Tuning · 60 天转岗课程

> 个人学习用静态网站。所有内容都在浏览器本地运行，无需联网，无需服务器。

## 如何使用

### 在 Mac 上
```bash
cd /path/to/3A
python3 -m http.server 8080
```
然后用浏览器打开 http://localhost:8080/

### 在 Windows 上
1. 把整个 `3A` 文件夹复制到 Windows（用 U 盘 / 网盘 / OneDrive 都行）
2. 装 Python（[官网下载](https://www.python.org/downloads/) 勾选 "Add Python to PATH"）
3. 在 PowerShell 里 `cd` 到课程文件夹
4. 运行 `python -m http.server 8080`
5. 浏览器打开 http://localhost:8080/

> 不能直接双击 `index.html` 打开，因为浏览器对 ES Module 在 file:// 下有限制。

## 学习节奏

- 每天 4 小时；周末可超前
- 严格按 Day 1 → Day 60 顺序学，不可跳关
- 完成「今日小测」并点「✅ 完成本日」才算今天结束
- 每周末做一次周考；每月底做一次月考

## 数据备份（重要）

所有学习进度、笔记、考核记录都存在 **浏览器** 里。如果清浏览器缓存或换浏览器，数据会丢失。

**每周一次做这件事**：
1. 进入「📝 笔记」页
2. 点「📤 导出 JSON」下载备份文件
3. 把备份文件放进网盘 / OneDrive 等

恢复：在同一页点「📥 导入 JSON」选择备份文件。

## 跨电脑（Mac → Win）迁移

1. 在 Mac 上点「导出 JSON」备份笔记
2. 把整个 `3A` 文件夹复制到 Windows
3. 在 Windows 上启动课程，进入「笔记」页点「导入 JSON」
4. 进度 / 考核记录暂不支持导出（后续 Plan 会补充），需要在 Win 上从 Day 1 重新开始 — **建议从一开始就只在 Win 上学**

## 目录说明

- `index.html` — 入口
- `assets/data/days/` — 每日教学内容
- `assets/data/quizzes/` — 题库
- `docs/superpowers/` — 课程设计文档（Spec + Plan，可不看）

## 反馈

学习过程中遇到错别字 / 内容错误 / 想加补充资料？直接编辑对应 `assets/data/days/day-XX.json` 就行，下次刷新页面立即生效。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add user-facing README"
```

---

## Self-Review (run before declaring plan complete)

1. **Spec coverage check:**
   - ✅ Spec §2.1 Week 1-8 大纲：Plan 1 covers Week 1 fully + curriculum scaffold for 2-8.
   - ✅ Spec §3.1 技术栈（无构建工具/无后端/localStorage）：matches Plan 1.
   - ✅ Spec §3.2 目录结构：every file in spec exists in Plan 1's file structure.
   - ✅ Spec §3.4 localStorage schema：implemented in `storage.js` + `progress.js` + `quiz.js`.
   - ✅ Spec §4.1 三页式布局：Task 1 + 7.
   - ✅ Spec §4.2 视觉风格 (深色专业风)：theme.css palette tokens.
   - ✅ Spec §4.3 六个功能页：Tasks 9-11.
   - ✅ Spec §5.2 day-N.json schema：Task 12 demonstrates exact schema; validators enforce.
   - ✅ Spec §6.1 三级考核 + §6.2 自动判分/简答自评：Task 4 (logic) + Task 11 (UI) + Task 13 (content).
   - ✅ Spec §7 错误处理（备份导出/导入）：Task 11 step 2 + step 8.
   - ⏭️ Spec §2.2 Week 2-8 内容：deliberately deferred to Plans 2-8 (not a gap, by design).
   - ⏭️ Spec §4.3.4 月考：deferred to Plan 8 (correctly excluded from Plan 1 scope).
   - ⏭️ Spec §6.3 完整复习推荐（Week 2-8 模块）：weakness logic in place, only Week 1 module wired; remaining modules light up as later plans land.

2. **Placeholder scan:**
   - Tasks 12 step 4-8 use `<<<填充内容...>>>` markers — these are **deliberate** structural skeletons. The instruction in Task 12 explicitly says the engineer must replace them before commit. Not a plan failure (placeholders in **plan steps** are required to keep this document readable; the **commits** must contain real content).
   - Task 13 step 2-7 say "5 题，覆盖：..." rather than full JSON — this is intentional content shorthand following the same pattern as Task 12. Engineer must write actual question JSON before commit.
   - Verified: every code-level step (Tasks 1-11, 14, 15) shows complete code or exact commands.

3. **Type consistency:**
   - `Progress.completeDay(day, isoDate)` used consistently across views ✅
   - `storage.get(key, default)` signature consistent ✅
   - `validateDay`, `validateQuiz`, `validateCurriculum` all return `{ ok, errors }` — consistent ✅
   - Quiz response structure `{ qid, answer, selfRated? }` consistent across `quiz.js` and `quiz-view.js` ✅
   - localStorage key namespacing `camera3a:*` consistent ✅
   - Module IDs `M1..M7` consistent across spec, weakness module index, and Day JSONs ✅

No issues found in self-review. Plan ready for execution.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-06-plan-1-foundation-week1.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Ideal here because Tasks 12-13 are content-heavy and benefit from a clean context per Day.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for your review.

**Which approach?**

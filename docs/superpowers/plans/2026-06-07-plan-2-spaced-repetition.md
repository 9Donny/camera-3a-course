# Plan 2: Spaced Repetition (Ebbinghaus) Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Ebbinghaus-curve flashcard system. Each day has 5-15 cards extracted from lessons. Before opening 今日学习, due cards must be reviewed. Three-choice rating (忘了/模糊/记得) drives an SM-2-simplified scheduler.

**Architecture:**
- New module `srs.js`: pure scheduler logic (next due date based on rating + ease + interval)
- New module `flashcards.js`: CRUD on cards, persistence, query "due today"
- New view `views/review-view.js`: card front/back, rating buttons, progress bar
- Hook into today route: redirect to `#/review` if due > 0
- Auto-extract initial cards from Week 1 content (glossary terms + FAQ + interview-style)

**Tech Stack:**
- Same as Plan 1 (vanilla ES modules, localStorage, node:test)

---

## File Structure (final state)

```
assets/js/
├── srs.js                      # Scheduler: next-due algorithm
├── flashcards.js               # Card store: CRUD + due query
├── app.js                      # Add #/review route + today guard
└── views/
    └── review-view.js          # Review UI

assets/data/
└── flashcards/
    └── week-1.json             # Initial cards extracted from Day 1-7

tests/
├── srs.test.js
└── flashcards.test.js
```

---

## Task 1: SRS scheduler module + tests

Files: `assets/js/srs.js`, `tests/srs.test.js`

Algorithm: simplified SM-2 with 3 grades.
- forgot (忘了): reset interval to 0, increase difficulty
- fuzzy (模糊): keep interval, slightly increase difficulty
- known (记得): grow interval (1d → 3d → 7d → 15d → 30d → cap), reduce difficulty

Card state: `{ id, ease: 2.5, interval: 0, dueAt: ISOdate, reps: 0 }`

Pure function: `schedule(card, rating, today)` returns new card state.

- [ ] Write `tests/srs.test.js` with 8+ tests covering all transitions, then implement `srs.js` to pass.
- [ ] Test cases:
  - new card (reps=0) + known → interval=1, dueAt=tomorrow
  - new card + fuzzy → interval=0, dueAt=today
  - new card + forgot → interval=0, dueAt=today, ease decreases
  - card with interval=1 + known → interval=3
  - card with interval=3 + known → interval=7
  - card with interval=7 + known → interval=15
  - card with interval=30 + known → interval=30 (capped)
  - card with interval=15 + forgot → interval=0, ease=max(1.3, ease-0.2)

## Task 2: Flashcard store

Files: `assets/js/flashcards.js`, `tests/flashcards.test.js`

API:
- `flashcards.all()` → all cards
- `flashcards.dueToday(today)` → cards where dueAt ≤ today
- `flashcards.add({ id, front, back, tags, dayId })` — id auto if absent
- `flashcards.update(id, partial)` — partial merge (state + content)
- `flashcards.remove(id)`
- `flashcards.exportJSON()` / `importJSON(s)`

Persistence via storage.js. Tests: round-trip through fake localStorage, dueToday filtering, etc.

## Task 3: Review view

File: `assets/js/views/review-view.js`

UI flow:
1. Show "今天有 N 张卡到期" + 进度 0/N
2. Card front (问题)
3. Click "翻面" → reveal back (答案)
4. Three buttons: 忘了 / 模糊 / 记得
5. Click → schedule, persist, advance
6. After last card → "复习完成 🎉" + "进入今日学习"

Style: large card centered, big tap targets, keyboard 1/2/3 shortcuts.

## Task 4: Wire route + today guard

File: `assets/js/app.js`

When user navigates to `#/today`:
- Check `flashcards.dueToday(today).length`
- If > 0 and **not** opted-out, redirect to `#/review` with redirect-back query
- After review complete, return to `#/today`

Sidebar: add "🧠 复习" entry showing due count badge.

Provide a "skip today's review" link in the review view (records skip in storage with timestamp; allows reading without review for emergencies).

## Task 5: Initial card extraction

File: `assets/data/flashcards/week-1.json`

Manually curated 35-50 cards covering Day 1-7:
- All glossary terms (term ↔ Chinese explanation): ~20 cards
- Key formulas: 曝光方程, 帧率/曝光时间, F-number 公式: 5 cards
- Numerical facts: 64×48 数据块, D65=6504K, 240fps→4.17ms: 5 cards
- Interview-style: PRD 第 8/11/12/22 题: 4 cards
- Module concepts: OB/LSC/Demosaic/VCM/Bayer/RYYB/CFA/...: ~15 cards

Each card: `{ id, front (问), back (答), tags: [day, module], srcDay }`.
Initial state: `interval=0, ease=2.5, reps=0, dueAt=今天` so they all show up immediately on first review.

## Task 6: Smoke + README update

- Verify route flow end-to-end
- Add a section to README.md describing 复习 module
- Bump cache version

---

## Self-review

- All test counts ✅
- No breaking changes to Plan 1 routes
- Cards extract from Day 1-7 cover the 4 PRD interview items exactly
- `dueToday` returns sorted by due date so oldest first (helpful for streak)

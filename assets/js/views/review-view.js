// 复习页：大卡片正反面 + 三档评分（忘了 / 模糊 / 记得）+ 1/2/3 键盘快捷键
// back 支持 Markdown（含 ASCII 流程图、表格、列表），让卡片图文并茂

import { flashcards } from "../flashcards.js";
import { schedule } from "../srs.js";
import { celebrateRise, celebrateFireworks } from "../particles.js";
import { renderMarkdown } from "../markdown.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

let keyHandler = null;

// 复习会话状态：sessionStorage 保存「今天已经处理过的卡 ID」
// 这样切走再回来不会从头开始；今天关闭浏览器再开也不会重做今天已评过的
const SESSION_KEY = "camera3a:reviewSession";

function loadSession(today) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return { date: today, doneIds: [] };
    const obj = JSON.parse(raw);
    if (obj.date !== today) return { date: today, doneIds: [] }; // 跨天清空
    return obj;
  } catch { return { date: today, doneIds: [] }; }
}

function saveSession(session) {
  try {
    const json = JSON.stringify(session);
    sessionStorage.setItem(SESSION_KEY, json);
    localStorage.setItem(SESSION_KEY, json); // 跨标签页同步
  } catch {}
  // 通知侧边栏 badge 更新
  try {
    window.dispatchEvent(new CustomEvent("camera3a:reviewProgress"));
  } catch {}
}

export function renderReview(content, { router }) {
  const today = todayISO();
  const session = loadSession(today);
  const doneIds = new Set(session.doneIds);

  // 全队列 + 待做队列（排除今天已经评过的）
  const fullQueue = flashcards.dueToday(today);
  const queue = fullQueue.filter(c => !doneIds.has(c.id));
  const total = fullQueue.length;
  const remaining = queue.length;
  const doneCount = total - remaining;

  if (total === 0) {
    content.innerHTML = `
      <h1>🧠 复习</h1>
      <p class="muted">今天没有到期的卡片。继续保持。</p>
      <a class="btn" href="#/today">📅 进入今日学习</a>
    `;
    return;
  }

  if (remaining === 0) {
    // 全部做完了
    content.innerHTML = `
      <h1>🧠 复习完成 🎉</h1>
      <p class="muted">本日 ${total} 张卡片复习完毕。</p>
      <a class="btn" href="#/today">📅 进入今日学习</a>
    `;
    return;
  }

  let idx = 0; // 在 queue（待做队列）的索引
  let revealed = false;

  function render() {
    if (idx >= remaining) {
      // 全部完成
      content.innerHTML = `
        <h1>🧠 复习完成 🎉</h1>
        <p class="muted">本日 ${total} 张卡片复习完毕，记忆曲线已更新。</p>
        <a class="btn" href="#/today">📅 进入今日学习</a>
      `;
      return;
    }

    const card = queue[idx];
    const overallDone = doneCount + idx; // 整天已完成数（含此轮 + 上次切走前的）
    const progressPct = Math.round((overallDone / total) * 100);

    content.innerHTML = `
      <div class="review-page">
        <div class="review-progress">
          <div class="review-progress-bar"><div class="review-progress-fill" style="width:${progressPct}%"></div></div>
          <div class="review-counter">${overallDone + 1} / ${total}${doneCount > 0 ? `（剩 ${remaining - idx}）` : ""}</div>
        </div>

        <div class="review-card ${revealed ? "revealed" : ""}">
          <div class="review-card-meta">
            ${card.tags && card.tags.length ? card.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("") : ""}
          </div>
          <div class="review-card-front">${escapeHTML(card.front)}</div>
          ${revealed ? `<div class="review-card-back md">${renderMarkdown(card.back)}</div>` : ""}
        </div>

        <div class="review-actions">
          ${!revealed ? `
            <button class="btn review-flip" data-action="flip" title="或按 Space 键">翻面看答案</button>
          ` : `
            <button class="btn secondary review-rate" data-rate="forgot" title="或按数字键 1">😵 忘了</button>
            <button class="btn secondary review-rate" data-rate="fuzzy" title="或按数字键 2">🤔 模糊</button>
            <button class="btn review-rate" data-rate="known" title="或按数字键 3">😎 记得</button>
          `}
          <div class="review-shortcut-hint">⌨️ 快捷键：Space 翻面 · 1 忘了 · 2 模糊 · 3 记得</div>
        </div>

        <div class="review-skip">
          <a href="#/today" id="skipReview">跳过本次复习 → 直接进今日学习</a>
        </div>
      </div>
    `;

    // 翻面按钮
    const flipBtn = content.querySelector('[data-action="flip"]');
    if (flipBtn) flipBtn.addEventListener("click", () => { revealed = true; render(); });

    // 评分按钮
    content.querySelectorAll('.review-rate').forEach(btn => {
      btn.addEventListener("click", () => {
        const rating = btn.dataset.rate;
        // 「记得」时在按钮位置放出蓝色光点
        if (rating === "known") {
          const r = btn.getBoundingClientRect();
          celebrateRise(r.left + r.width / 2, r.top + r.height / 2);
        }
        const next = schedule(card, rating, today);
        flashcards.update(card.id, next);
        // 记到 session：今天这张卡已处理（即使 forgot/fuzzy dueAt 仍在今天，也不再出现）
        doneIds.add(card.id);
        session.doneIds = [...doneIds];
        saveSession(session);
        idx += 1;
        revealed = false;
        render();
        // 全部复习完成时来一次烟花
        if (idx >= remaining) {
          setTimeout(() => celebrateFireworks(window.innerWidth / 2, window.innerHeight / 3), 200);
        }
      });
    });

    // 跳过：记录到 storage 标记今日已跳过（避免每次进 today 都跳到这里）
    const skip = content.querySelector("#skipReview");
    if (skip) skip.addEventListener("click", () => {
      try {
        const k = "camera3a:reviewSkippedAt";
        localStorage.setItem(k, today);
      } catch (e) { /* ignore */ }
    });
  }

  // 键盘快捷键：Space 翻面，1/2/3 评分
  if (keyHandler) document.removeEventListener("keydown", keyHandler);
  keyHandler = (e) => {
    if (idx >= total) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (!revealed && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      revealed = true;
      render();
      return;
    }
    if (revealed && (e.key === "1" || e.key === "2" || e.key === "3")) {
      const rating = e.key === "1" ? "forgot" : e.key === "2" ? "fuzzy" : "known";
      const card = queue[idx];
      if (rating === "known") {
        celebrateRise(window.innerWidth / 2, window.innerHeight / 2);
      }
      const next = schedule(card, rating, today);
      flashcards.update(card.id, next);
      doneIds.add(card.id);
      session.doneIds = [...doneIds];
      saveSession(session);
      idx += 1;
      revealed = false;
      render();
      if (idx >= remaining) {
        setTimeout(() => celebrateFireworks(window.innerWidth / 2, window.innerHeight / 3), 200);
      }
    }
  };
  document.addEventListener("keydown", keyHandler);

  render();
}

export function destroyReview() {
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

// 帮助函数：判断今天是否需要强制复习
// 「需要复习」= 今天到期 - 今天已经评过的（在 review 会话里记录）
// 全部评过后 needsReview=false，进 #/today 不再被强制跳到 #/review
export function needsReview() {
  const today = todayISO();
  // 检查跳过标记
  try {
    const skipped = localStorage.getItem("camera3a:reviewSkippedAt");
    if (skipped === today) return false;
  } catch (e) { /* ignore */ }
  return remainingToday(today) > 0;
}

// 今天还要复习的数量 = 到期总数 - 今天已评过的
// 侧边栏 badge / dashboard chip 都用这个
export function dueCount() {
  return remainingToday(todayISO());
}

function remainingToday(today) {
  const total = flashcards.dueToday(today).length;
  if (total === 0) return 0;
  // 读 review 会话的 doneIds（与 review-view 内 saveSession 同 key）
  let doneIds;
  try {
    const raw = sessionStorage.getItem("camera3a:reviewSession") ||
                localStorage.getItem("camera3a:reviewSession");
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.date === today && Array.isArray(obj.doneIds)) {
        doneIds = new Set(obj.doneIds);
      }
    }
  } catch {}
  if (!doneIds || doneIds.size === 0) return total;
  // 过滤：到期卡里没在 doneIds 的就是「还要复习的」
  const queue = flashcards.dueToday(today);
  return queue.filter(c => !doneIds.has(c.id)).length;
}

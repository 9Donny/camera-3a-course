// 复习页：大卡片正反面 + 三档评分（忘了 / 模糊 / 记得）+ 1/2/3 键盘快捷键

import { flashcards } from "../flashcards.js";
import { schedule } from "../srs.js";
import { celebrateRise, celebrateFireworks } from "../particles.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

let keyHandler = null;

export function renderReview(content, { router }) {
  const today = todayISO();
  const queue = flashcards.dueToday(today);
  const total = queue.length;

  if (total === 0) {
    content.innerHTML = `
      <h1>🧠 复习</h1>
      <p class="muted">今天没有到期的卡片。继续保持。</p>
      <a class="btn" href="#/today">📅 进入今日学习</a>
    `;
    return;
  }

  let idx = 0;
  let revealed = false;

  function render() {
    if (idx >= total) {
      // 全部完成
      content.innerHTML = `
        <h1>🧠 复习完成 🎉</h1>
        <p class="muted">本轮 ${total} 张卡片复习完毕，记忆曲线已更新。</p>
        <a class="btn" href="#/today">📅 进入今日学习</a>
      `;
      return;
    }

    const card = queue[idx];
    const progressPct = Math.round((idx / total) * 100);

    content.innerHTML = `
      <div class="review-page">
        <div class="review-progress">
          <div class="review-progress-bar"><div class="review-progress-fill" style="width:${progressPct}%"></div></div>
          <div class="review-counter">${idx + 1} / ${total}</div>
        </div>

        <div class="review-card ${revealed ? "revealed" : ""}">
          <div class="review-card-meta">
            ${card.tags && card.tags.length ? card.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("") : ""}
          </div>
          <div class="review-card-front">${escapeHTML(card.front)}</div>
          ${revealed ? `<div class="review-card-back">${escapeHTML(card.back)}</div>` : ""}
        </div>

        <div class="review-actions">
          ${!revealed ? `
            <button class="btn review-flip" data-action="flip">翻面看答案 (Space)</button>
          ` : `
            <button class="btn secondary review-rate" data-rate="forgot">😵 忘了 (1)</button>
            <button class="btn secondary review-rate" data-rate="fuzzy">🤔 模糊 (2)</button>
            <button class="btn review-rate" data-rate="known">😎 记得 (3)</button>
          `}
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
        idx += 1;
        revealed = false;
        render();
        // 全部复习完成时来一次烟花
        if (idx >= total) {
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
      idx += 1;
      revealed = false;
      render();
      if (idx >= total) {
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
export function needsReview() {
  const today = todayISO();
  // 检查跳过标记
  try {
    const skipped = localStorage.getItem("camera3a:reviewSkippedAt");
    if (skipped === today) return false;
  } catch (e) { /* ignore */ }
  return flashcards.dueToday(today).length > 0;
}

export function dueCount() {
  return flashcards.dueToday(todayISO()).length;
}

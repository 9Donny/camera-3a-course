import { renderMarkdown } from "../markdown.js";
import { validateDay } from "../validators.js";
import { tts, markdownToSpeech } from "../tts.js";
import { initHighlightCollect } from "../highlight.js";
import { initScrollProgress, destroyScrollProgress } from "../scroll-progress.js";

let highlightInitialized = false;

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

  const sections = data.sections.map((s, idx) => `
    <section class="lesson-section" data-section-idx="${idx}">
      <div class="section-head">
        <h2>${escapeHTML(s.title)}</h2>
        <button class="section-tts" data-action="play-section" data-idx="${idx}" title="朗读本节">🔊</button>
      </div>
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

  const ttsSupported = tts.isSupported();
  const currentRate = tts.getRate();

  content.innerHTML = `
    <div class="lesson-sticky-top">
      <div class="lesson-header">
        <div class="muted">Week ${data.week} · 模块 ${data.module} · 预计 ${data.estimatedMinutes} 分钟</div>
        <h1>Day ${day} · ${escapeHTML(data.title)}</h1>
        <div class="hint-tip" id="highlightHint">💡 提示：选中任意句子，会弹出「📌 收藏到笔记」按钮，一键存到当天笔记中 · <a href="#" id="dismissHint">知道了</a></div>
      </div>
      ${ttsSupported ? `
        <div class="tts-bar" id="ttsBar">
          <button class="btn secondary" data-action="play-all">▶ 播放全文</button>
          <button class="btn secondary" data-action="pause" disabled>⏸ 暂停</button>
          <button class="btn secondary" data-action="resume" disabled>▶ 继续</button>
          <button class="btn secondary" data-action="stop" disabled>■ 停止</button>
          <span class="tts-rate">
            速度
            <select data-action="rate">
              <option value="0.8" ${currentRate === 0.8 ? "selected" : ""}>0.8×</option>
              <option value="1.0" ${currentRate === 1.0 ? "selected" : ""}>1.0×</option>
              <option value="1.2" ${currentRate === 1.2 ? "selected" : ""}>1.2×</option>
              <option value="1.5" ${currentRate === 1.5 ? "selected" : ""}>1.5×</option>
              <option value="2.0" ${currentRate === 2.0 ? "selected" : ""}>2.0×</option>
            </select>
          </span>
          <span class="tts-status muted" id="ttsStatus">就绪</span>
        </div>
      ` : `<div class="muted" style="padding:8px 0">⚠️ 当前浏览器不支持语音朗读，请用 Chrome / Edge / Safari 最新版。</div>`}
    </div>
    ${sections}
    ${refs ? `<section class="lesson-section"><h2>📚 参考资料</h2><ul>${refs}</ul></section>` : ""}
    <div class="lesson-footer">
      <a class="btn secondary" href="#/notes/${dayId}">📝 写笔记</a>
      <a class="btn secondary" href="#/quiz/daily-${dayId}">📊 今日小测</a>
      <button class="btn" id="completeBtn" ${isCompleted ? "disabled" : ""}>${btnLabel}</button>
    </div>
  `;

  if (!isCompleted) {
    document.getElementById("completeBtn").addEventListener("click", () => {
      const today = new Date().toISOString().slice(0, 10);
      progress.completeDay(day, today);
      persistProgress();
      tts.stop();
      alert(`🎉 Day ${day} 完成！下一天已解锁。`);
      router.go("#/report/" + dayId);
    });
  }

  if (ttsSupported) {
    wireTTSControls(data);
  }

  // 划词收藏：全局事件只绑一次（即使切换 Day 也复用）
  if (!highlightInitialized) {
    initHighlightCollect({
      getDayId: () => `day-${String(Math.min(progress.getState().currentDay, 60)).padStart(2, "0")}`,
    });
    highlightInitialized = true;
  }

  // 提示条：localStorage 没标记过就显示
  const hintEl = document.getElementById("highlightHint");
  const dismissBtn = document.getElementById("dismissHint");
  const dismissed = localStorage.getItem("camera3a:hintDismissed:highlight") === "1";
  if (hintEl) {
    if (dismissed) hintEl.style.display = "none";
    if (dismissBtn) {
      dismissBtn.addEventListener("click", (e) => {
        e.preventDefault();
        hintEl.style.display = "none";
        localStorage.setItem("camera3a:hintDismissed:highlight", "1");
      });
    }
  }

  // 右侧悬浮阅读进度 + 章节导航
  initScrollProgress(data.sections);
  // 切到非 today 页时销毁
  window.addEventListener("hashchange", destroyScrollProgress, { once: true });
}

function wireTTSControls(data) {
  const bar = document.getElementById("ttsBar");
  const status = document.getElementById("ttsStatus");
  if (!bar) return;

  const btnPlay   = bar.querySelector('[data-action="play-all"]');
  const btnPause  = bar.querySelector('[data-action="pause"]');
  const btnResume = bar.querySelector('[data-action="resume"]');
  const btnStop   = bar.querySelector('[data-action="stop"]');
  const selRate   = bar.querySelector('[data-action="rate"]');

  const updateButtons = (state) => {
    if (state === "playing") {
      btnPlay.disabled = false;
      btnPause.disabled = false;
      btnResume.disabled = true;
      btnStop.disabled = false;
      status.textContent = "🔊 朗读中…";
    } else if (state === "paused") {
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnResume.disabled = false;
      btnStop.disabled = false;
      status.textContent = "⏸ 已暂停";
    } else {
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnResume.disabled = true;
      btnStop.disabled = true;
      status.textContent = "就绪";
    }
  };

  tts.onStateChange = updateButtons;
  updateButtons("idle");

  btnPlay.addEventListener("click", () => {
    const segments = data.sections.map(s => {
      const head = s.title;
      const body = markdownToSpeech(s.content);
      return `${head}。${body}`;
    });
    tts.playSequence(segments);
  });

  btnPause.addEventListener("click", () => tts.pause());
  btnResume.addEventListener("click", () => tts.resume());
  btnStop.addEventListener("click", () => tts.stop());

  selRate.addEventListener("change", (e) => {
    tts.setRate(parseFloat(e.target.value));
  });

  // 单节朗读按钮
  document.querySelectorAll('[data-action="play-section"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const s = data.sections[idx];
      if (!s) return;
      tts.play(`${s.title}。${markdownToSpeech(s.content)}`);
    });
  });

  // 离开页面时停掉
  window.addEventListener("hashchange", () => tts.stop(), { once: true });
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

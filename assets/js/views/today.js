import { renderMarkdown } from "../markdown.js";
import { validateDay } from "../validators.js";
import { tts, markdownToSpeech } from "../tts.js";
import { initHighlightCollect } from "../highlight.js";
import { initScrollProgress, destroyScrollProgress } from "../scroll-progress.js";
import { celebrateConfetti, celebrateWelcome } from "../particles.js";

let highlightInitialized = false;

const WELCOME_KEY = "camera3a:welcomeShownDate";

function maybeShowWelcome(nickname, day) {
  const todayStr = new Date().toISOString().slice(0, 10);
  let shown;
  try { shown = localStorage.getItem(WELCOME_KEY); } catch (e) { shown = null; }
  if (shown === todayStr) return;
  try { localStorage.setItem(WELCOME_KEY, todayStr); } catch (e) {}

  // 飘落星点
  celebrateWelcome();

  // 横幅淡入淡出
  const banner = document.createElement("div");
  banner.className = "welcome-banner";
  const greet = pickGreeting(day);
  banner.innerHTML = `
    <div class="wb-hi">${greet.hi}</div>
    <div class="wb-line">${greet.line}</div>
  `;
  document.body.appendChild(banner);
  // 强制 reflow 让 transition 生效
  banner.offsetHeight;
  banner.classList.add("show");
  setTimeout(() => {
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 600);
  }, 2400);
}

function pickGreeting(day) {
  const hours = new Date().getHours();
  let timePart;
  if (hours < 6) timePart = "凌晨好";
  else if (hours < 12) timePart = "早上好";
  else if (hours < 14) timePart = "中午好";
  else if (hours < 18) timePart = "下午好";
  else if (hours < 22) timePart = "晚上好";
  else timePart = "深夜好";

  const lines = [
    `Day ${day} · 今天也来打卡啦`,
    `Day ${day} · 又见面了，继续冲`,
    `Day ${day} · 4 小时，慢慢来`,
    `Day ${day} · 离面试更近一步`,
    `Day ${day} · 把昨天的复习先做了`,
    `Day ${day} · 调教工程师在养成中`,
  ];
  // 用 day 作为 seed 让同一天问候稳定
  const line = lines[day % lines.length];
  return { hi: timePart, line };
}

export async function renderToday(content, { progress, router, persistProgress, dayOverride = null }) {
  // dayOverride: 路由 #/today/day-XX 指定的复读日（必须是已完成或当前 day），否则用 currentDay
  let day;
  if (dayOverride) {
    const m = String(dayOverride).match(/^day-(\d{2})$/);
    if (!m) {
      content.innerHTML = `<h1>⚠️ 路径错误</h1><p>不认识的 day id：<code>${escapeHTML(dayOverride)}</code></p>`;
      return;
    }
    day = parseInt(m[1], 10);
    // 安全限制：只能看「已解锁」的 day（不能跳到未来）
    if (!progress.isUnlocked(day) && day !== progress.getState().currentDay) {
      content.innerHTML = `<h1>🔒 未解锁</h1><p>Day ${day} 还没解锁。<a href="#/today">回到今日学习</a></p>`;
      return;
    }
  } else {
    day = progress.getState().currentDay;
  }

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
      ${renderExtras(s.extras)}
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

  const isRevisit = !!dayOverride;
  content.innerHTML = `
    <div class="lesson-header">
      <div class="muted">Week ${data.week} · 模块 ${data.module} · 预计 ${data.estimatedMinutes} 分钟${isRevisit ? ' · <span style="color:#10b981">📖 复读模式</span>' : ''}</div>
      <h1>Day ${day} · ${escapeHTML(data.title)}</h1>
      ${isRevisit ? `<div class="muted" style="margin-top:4px;font-size:13px"><a href="#/today">← 回到当前学习日</a></div>` : ''}
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
    ${sections}
    ${refs ? `<section class="lesson-section"><h2>📚 参考资料</h2><ul>${refs}</ul></section>` : ""}
    <div class="lesson-footer">
      <a class="btn secondary" href="#/notes/${dayId}">📝 写笔记</a>
      <a class="btn secondary" href="#/quiz/daily-${dayId}">📊 今日小测</a>
      <button class="btn" id="completeBtn" ${isCompleted ? "disabled" : ""}>${btnLabel}</button>
    </div>
  `;

  if (!isCompleted) {
    document.getElementById("completeBtn").addEventListener("click", async () => {
      const today = new Date().toISOString().slice(0, 10);
      progress.completeDay(day, today);
      persistProgress();
      tts.stop();
      celebrateConfetti();
      // 解锁本 day 的种子记忆卡（让它们进入复习队列）
      try {
        const { flashcards } = await import("../flashcards.js");
        const unlocked = flashcards.unlockBySrcDay(dayId, today);
        console.info(`[review] unlocked ${unlocked} cards for ${dayId}`);
      } catch (e) { console.warn("flashcards unlock failed:", e); }
      // 让特效先播放再跳页
      setTimeout(() => {
        alert(`🎉 Day ${day} 完成！下一天已解锁。`);
        router.go("#/report/" + dayId);
      }, 100);
    });
  }

  if (ttsSupported) {
    wireTTSControls(data);
  }

  // 划词收藏：全局事件只绑一次（即使切换 Day 也复用）
  // 注意：复读模式下笔记应写到「当前正在看」的 day，不是 currentDay
  if (!highlightInitialized) {
    initHighlightCollect({
      getDayId: () => window.__currentLessonDayId || `day-${String(Math.min(progress.getState().currentDay, 60)).padStart(2, "0")}`,
    });
    highlightInitialized = true;
  }
  window.__currentLessonDayId = dayId;

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

  // 每日首次访问的欢迎特效（在所有 UI 就绪之后再触发）
  setTimeout(() => maybeShowWelcome(null, day), 200);
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

function renderExtras(extras) {
  if (!extras || typeof extras !== "object") return "";
  const faqs = Array.isArray(extras.faq) ? extras.faq : [];
  const videos = Array.isArray(extras.videos) ? extras.videos : [];
  const reads = Array.isArray(extras.reads) ? extras.reads : [];
  if (faqs.length === 0 && videos.length === 0 && reads.length === 0) return "";

  const faqHTML = faqs.length ? `
    <div class="extras-block">
      <div class="extras-block-title">💡 不懂就查（一句话答案）</div>
      <ul class="extras-faq">
        ${faqs.map(f => `<li><strong>${escapeHTML(f.q)}</strong> — ${escapeHTML(f.a)}</li>`).join("")}
      </ul>
    </div>` : "";

  const videoHTML = videos.length ? `
    <div class="extras-block">
      <div class="extras-block-title">🎥 推荐视频 / 直播课</div>
      <ul class="extras-list">
        ${videos.map(v => {
          const url = v.url || `https://search.bilibili.com/all?keyword=${encodeURIComponent(v.search || v.title)}`;
          const note = v.note ? `<span class="dim">（${escapeHTML(v.note)}）</span>` : "";
          return `<li><a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(v.title)}</a> ${note}</li>`;
        }).join("")}
      </ul>
    </div>` : "";

  const readHTML = reads.length ? `
    <div class="extras-block">
      <div class="extras-block-title">📖 深入阅读</div>
      <ul class="extras-list">
        ${reads.map(r => {
          const note = r.note ? `<span class="dim">（${escapeHTML(r.note)}）</span>` : "";
          return `<li><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener">${escapeHTML(r.title)}</a> ${note}</li>`;
        }).join("")}
      </ul>
    </div>` : "";

  return `
    <details class="extras">
      <summary>📚 延伸学习（点击展开）</summary>
      <div class="extras-body">
        ${faqHTML}
        ${videoHTML}
        ${readHTML}
      </div>
    </details>`;
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}

import { storage, isGuest } from "./storage.js";
import { Progress } from "./progress.js";
import { Router } from "./router.js";
import { notes } from "./notes.js";
import { profile, todayLabel, todayISO, encouragement } from "./profile.js";
import { flashcards } from "./flashcards.js";
import * as particles from "./particles.js";
import { trackPage, totalSec, todaySec, formatDuration } from "./tracker.js";
import { sync, installAutoSync } from "./sync.js";

// 同步状态：'idle' | 'syncing' | 'ok' | 'err'
let syncState = "idle";
let syncLastError = null;

const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const dashboardEl = document.getElementById("dashboard");

const progress = new Progress(storage.get("progress"));
function persistProgress() {
  storage.set("progress", progress.getState());
  renderDashboard(); // 进度变了同步刷新顶栏
}

profile.ensureStartedAt();

// 第一次访问时让用户填昵称（不填也能跳过，用"学员"）
function maybeAskNickname() {
  if (profile.get().nickname) return;
  setTimeout(() => {
    const name = prompt("👋 欢迎加入 60 天 Camera 3A 课程！\n\n填一个昵称吧（学习仪表盘会用到，可以随时改）：", "");
    if (name && name.trim()) {
      profile.setNickname(name);
      renderDashboard();
    }
  }, 400);
}

function renderDashboard() {
  if (!dashboardEl) return;
  const state = progress.getState();
  const day = Math.min(state.currentDay, 60);
  const completedToday = state.lastCompletedAt === todayISO();
  const checkInLabel = completedToday ? "✅ 今日已打卡" : "⏰ 今日未打卡";
  const checkInClass = completedToday ? "checked" : "unchecked";

  dashboardEl.innerHTML = `
    <div class="dash-greet">
      <div class="dash-name">你好，${escapeHTML(profile.getNickname())} <button class="dash-edit" title="改昵称">✎</button>${isGuest() ? ' <span class="guest-tag" title="数据仅存当前浏览器，不会同步">👤 访客模式</span>' : ''}</div>
      <div class="dash-date">${todayLabel()} · Day ${state.completedDays.length}/60 · 当前 Day ${day}</div>
    </div>
    <div class="dash-encouragement">${encouragement(state)}</div>
    <div class="dash-stats">
      <button class="dash-time" title="今日 ${formatDuration(todaySec())} · 累计 ${formatDuration(totalSec())} · 点击查看详情">⏱ ${formatDuration(todaySec())}</button>
      <span class="dash-streak" title="连续打卡天数">🔥 ${state.streak}</span>
      <span class="dash-checkin ${checkInClass}">${checkInLabel}</span>
      ${isGuest() ? '' : `<button class="dash-sync state-${syncState}" title="${syncStateTooltip()}">${syncStateIcon()}</button>`}
      <button class="dash-fx ${particles.getEnabled() ? 'on' : 'off'}" title="${particles.getEnabled() ? '关闭粒子特效' : '开启粒子特效'}">${particles.getEnabled() ? '✨' : '·'}</button>
    </div>
  `;
  // 改昵称
  const editBtn = dashboardEl.querySelector(".dash-edit");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const name = prompt("改个昵称：", profile.getNickname());
      if (name !== null && name.trim()) {
        profile.setNickname(name);
        renderDashboard();
      }
    });
  }
  // 粒子特效开关
  const fxBtn = dashboardEl.querySelector(".dash-fx");
  if (fxBtn) {
    fxBtn.addEventListener("click", () => {
      const next = !particles.getEnabled();
      particles.setEnabled(next);
      renderDashboard();
      // 开启时立即放一次烟花作为反馈
      if (next) {
        const r = fxBtn.getBoundingClientRect();
        particles.celebrateFireworks(r.left + r.width / 2, r.bottom + 20);
      }
    });
  }
  // 学习时长 chip → 跳到记录页
  const timeBtn = dashboardEl.querySelector(".dash-time");
  if (timeBtn) {
    timeBtn.addEventListener("click", () => {
      window.location.hash = "#/log";
    });
  }
  // 同步 chip → 跳到同步设置（已配置时直接立即同步）
  const syncBtn = dashboardEl.querySelector(".dash-sync");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      const cfg = sync.getConfig();
      if (!cfg.email || !cfg.password) {
        window.location.hash = "#/sync";
        return;
      }
      await runSync({ source: "manual" });
    });
  }
}

function syncStateIcon() {
  if (syncState === "syncing") return "⟳";
  if (syncState === "ok") return "☁️";
  if (syncState === "err") return "⚠️";
  return "☁";
}
function syncStateTooltip() {
  const cfg = sync.getConfig();
  if (!cfg.email) return "未配置同步，点击设置";
  if (syncState === "syncing") return "正在同步…";
  if (syncState === "err") return `上次同步失败：${syncLastError || ""}（点击重试）`;
  const meta = sync.getMeta();
  return meta.lastSyncedAt
    ? `上次同步：${new Date(meta.lastSyncedAt).toLocaleTimeString("zh-CN", {hour12: false})}（点击立即同步）`
    : "尚未同步过，点击同步";
}

async function runSync({ source = "auto" } = {}) {
  if (syncState === "syncing") return;
  syncState = "syncing";
  syncLastError = null;
  renderDashboard();
  try {
    const r = await sync.syncNow();
    syncState = "ok";
    renderDashboard();
    // 拉到了远端数据 → 让用户重新加载，否则内存里的 progress / notes / flashcards 不会自动更新
    if (r && r.pull && r.pull.downloadedKeys > 0) {
      const msg = r.pull.firstPull
        ? `首次同步成功，拉取 ${r.pull.downloadedKeys} 项数据。点击确定重新加载页面。`
        : `已从云端拉取 ${r.pull.downloadedKeys} 项更新。点击确定重新加载查看。`;
      // 自动同步时只提示一次，不阻塞用户继续操作
      if (source === "manual" || r.pull.firstPull) {
        if (confirm(msg)) location.reload();
      } else {
        // 自动同步：仅在 dashboard 提示，不弹窗打扰
        console.info("[sync] downloaded", r.pull.downloadedKeys, "keys, refresh to see changes");
      }
    }
  } catch (e) {
    syncState = "err";
    syncLastError = e.message;
    if (source === "manual") {
      alert(`同步失败：${e.message}`);
    } else {
      console.warn("[sync] auto-sync failed:", e.message);
    }
  }
  renderDashboard();
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// 每分钟刷新一次（跨过午夜时日期 / 打卡状态会变）
setInterval(renderDashboard, 60_000);

// 算今天还要复习的卡数（dueToday 总数 - 今天已评过的 doneIds）
// 同步函数（renderSidebar 是同步的）
function reviewDueCountSync() {
  const today = todayISO();
  const queue = flashcards.dueToday(today);
  if (queue.length === 0) return 0;
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
  if (!doneIds || doneIds.size === 0) return queue.length;
  return queue.filter(c => !doneIds.has(c.id)).length;
}

// 评分时 review-view 会发这个事件 → 实时重渲 sidebar 让 badge 减少
window.addEventListener("camera3a:reviewProgress", () => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.querySelector(".nav-badge")) {
    renderSidebar(window.location.hash || "#/today");
  }
});

const NAV = [
  { hash: "#/overview",  label: "📚 总览" },
  { hash: "#/today",     label: "📅 今日" },
  { hash: "#/review",    label: "🧠 复习" },
  { hash: "#/notes",     label: "📝 笔记" },
  { hash: "#/quiz",      label: "📊 考核" },
  { hash: "#/report",    label: "📈 日报" },
  { hash: "#/weakness",  label: "🎯 薄弱项" },
  { hash: "#/log",       label: "⏱ 记录" },
  { hash: "#/sync",      label: "☁️ 同步" },
];

function renderSidebar(currentHash) {
  // dueN：今天「还要复习的」数量（不是「到期总数」）
  // = dueToday 总数 - 今天已经评过的（review-view 会话里记录的 doneIds）
  // 评分时会发 'review:done' 事件来触发重渲，让 badge 实时减少
  const dueN = reviewDueCountSync();
  const top = NAV.map(n => {
    let label = n.label;
    if (n.hash === "#/review" && dueN > 0) {
      label += ` <span class="nav-badge">${dueN}</span>`;
    }
    return `<a class="nav-item ${currentHash.startsWith(n.hash) ? "active" : ""}" href="${n.hash}">${label}</a>`;
  }).join("");
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
  renderDashboard();
}

function placeholderView(title) {
  content.innerHTML = `<h1>${title}</h1><p class="muted">该页面将在后续 Task 实现。</p>`;
}

const router = new Router()
  .on("#/overview", async () => {
    trackPage("overview");
    renderSidebar("#/overview");
    const { renderOverview } = await import("./views/overview.js");
    renderOverview(content, { progress, router });
  })
  .on("#/today", async () => {
    // 进今日学习前检查复习是否到期
    const { needsReview } = await import("./views/review-view.js");
    if (needsReview()) {
      router.go("#/review");
      return;
    }
    trackPage("today");
    renderSidebar("#/today");
    const { renderToday } = await import("./views/today.js");
    await renderToday(content, { progress, router, persistProgress });
  })
  .on("#/today/:dayId", async (p) => {
    // 复读模式：回顾已完成或当前的某一天，不会跳到下一天
    trackPage("today-revisit");
    renderSidebar("#/today");
    const { renderToday } = await import("./views/today.js");
    await renderToday(content, { progress, router, persistProgress, dayOverride: p.dayId });
  })
  .on("#/review", async () => {
    trackPage("review");
    renderSidebar("#/review");
    const { renderReview, destroyReview } = await import("./views/review-view.js");
    window.addEventListener("hashchange", destroyReview, { once: true });
    renderReview(content, { router });
  })
  .on("#/notes", async () => {
    trackPage("notes");
    renderSidebar("#/notes");
    const { renderNotesList } = await import("./views/notes-view.js");
    renderNotesList(content, { router, progress });
  })
  .on("#/notes/:dayId", async (p) => {
    trackPage("notes");
    renderSidebar("#/notes");
    const { renderNoteEditor } = await import("./views/notes-view.js");
    renderNoteEditor(content, { dayId: p.dayId });
  })
  .on("#/log", async () => {
    trackPage("log");
    renderSidebar("#/log");
    const { renderLog } = await import("./views/log-view.js");
    renderLog(content, { progress });
  })
  .on("#/quiz", async () => {
    trackPage("quiz");
    renderSidebar("#/quiz");
    const { renderQuizCenter } = await import("./views/quiz-view.js");
    renderQuizCenter(content, { progress });
  })
  .on("#/quiz/:quizId", async (p) => {
    trackPage("quiz");
    renderSidebar("#/quiz");
    const { renderQuiz } = await import("./views/quiz-view.js");
    await renderQuiz(content, { quizId: p.quizId, router });
  })
  .on("#/report", async () => {
    trackPage("report");
    renderSidebar("#/report");
    const { renderReport } = await import("./views/report-view.js");
    renderReport(content, { dayId: null, progress });
  })
  .on("#/report/:dayId", async (p) => {
    trackPage("report");
    renderSidebar("#/report");
    const { renderReport } = await import("./views/report-view.js");
    renderReport(content, { dayId: p.dayId, progress });
  })
  .on("#/weakness", async () => {
    trackPage("weakness");
    renderSidebar("#/weakness");
    const { renderWeakness } = await import("./views/weakness-view.js");
    renderWeakness(content, {});
  })
  .on("#/sync", async () => {
    trackPage("sync");
    renderSidebar("#/sync");
    const { renderSync } = await import("./views/sync-view.js");
    renderSync(content);
  })
  .setNotFound(() => { renderSidebar(""); placeholderView("404 路径未找到"); });

// 手机汉堡菜单：toggle .sidebar-open on body
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
function closeSidebar() { document.body.classList.remove("sidebar-open"); }
function toggleSidebar() { document.body.classList.toggle("sidebar-open"); }
if (menuToggle) menuToggle.addEventListener("click", toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
// 路由切换后自动收起
window.addEventListener("hashchange", closeSidebar);

renderDashboard();

// 检测是不是「全新设备」：除了刚才被加载的种子配置，没有真实学习数据
function isFreshDevice() {
  const ks = ["progress", "notes", "flashcards", "profile", "syncConfig"];
  for (const k of ks) {
    if (localStorage.getItem("camera3a:" + k)) return false;
  }
  return true;
}

const wasFresh = isFreshDevice();

// 启动时加载所有可用的 Week 种子卡片（已存在的卡片不会被覆盖学习状态）
async function loadSeedFlashcards() {
  // 后续添加 week-N 直接加进 weeks 数组
  const weeks = ["week-1", "week-2", "week-3", "week-4", "week-5", "week-6", "week-7", "week-8"];
  for (const w of weeks) {
    try {
      const res = await fetch(`./assets/data/flashcards/${w}.json`);
      if (!res.ok) continue;
      const seeds = await res.json();
      flashcards.loadInitial(seeds);
    } catch (e) { /* 文件不存在或格式错时静默，继续下一周 */ }
  }

  // 迁移 1：把用户已完成 day 的种子卡（dueAt=null）激活到今天
  // 迁移 2：把「**没学过但被旧 bug 错误评分**」的卡重置回 null（清出复习队列）
  // 解决：第 1 天就要复习 263 张未学卡 / 学到 day 4 看到 day 50 内容
  try {
    const today = todayISO();
    const completed = progress.getState().completedDays || [];
    const completedDayIds = completed.map(n => `day-${String(n).padStart(2, "0")}`);

    // 反向：清理未学但已激活的卡（旧 bug 残留）
    const resetN = flashcards.resetUnlearnedCards(completedDayIds);
    if (resetN > 0) {
      console.info(`[review] reset ${resetN} cards for unlearned days (legacy bug cleanup)`);
    }

    // 正向：激活已完成 day 的卡（如果是 dueAt=null 状态）
    let totalUnlocked = 0;
    for (const dayId of completedDayIds) {
      totalUnlocked += flashcards.unlockBySrcDay(dayId, today);
    }
    if (totalUnlocked > 0) {
      console.info(`[review] activated ${totalUnlocked} seed cards for completed days`);
    }
  } catch (e) { console.warn("seed migration failed:", e); }
}
await loadSeedFlashcards();

// 检测 URL 参数 ?syncconfig=BASE64：从 Mac 分享过来的配置 → 自动应用
function tryApplySyncConfigFromURL() {
  if (isGuest()) return false; // 访客模式不接受 syncconfig
  const params = new URLSearchParams(location.search);
  const enc = params.get("syncconfig");
  if (!enc) return false;
  try {
    const json = decodeURIComponent(escape(atob(enc.replace(/-/g, "+").replace(/_/g, "/"))));
    const cfg = JSON.parse(json);
    if (!cfg.email || !cfg.password) return false;
    sync.setConfig({
      enabled: true,
      email: cfg.email,
      password: cfg.password,
      device: cfg.device || "新设备",
      proxyBase: cfg.proxyBase || "",
    });
    // 清除 URL 参数，防止再次刷新或别人偷看
    history.replaceState(null, "", location.pathname + location.hash);
    console.info("[boot] applied syncconfig from URL");
    return true;
  } catch (e) {
    console.warn("[boot] invalid syncconfig URL param:", e);
    return false;
  }
}
const appliedFromURL = tryApplySyncConfigFromURL();

// 全新设备 + 没配置 + 没用 URL 分享 → 自动跳到 #/sync 页让用户先配置
// 访客模式跳过（访客不需要同步）
if (!isGuest() && wasFresh && !appliedFromURL && !sync.getConfig().email) {
  if (!location.hash || location.hash === "#/today" || location.hash === "#/") {
    location.hash = "#/sync";
  }
}

// 启动时若已配置且启用同步，先 pull 一次。
// 关键：必须 await 完成；并且在 pull 成功之前禁止 installAutoSync，
// 否则 prompt / 任何 UI 写入都会把本地空状态覆盖到云端。
async function bootSync() {
  const cfg = sync.getConfig();
  if (!cfg.enabled || !cfg.email || !cfg.password) return { skipped: true };
  syncState = "syncing";
  renderDashboard();
  try {
    const r = await sync.pull();
    syncState = "ok";
    renderDashboard();
    return r;
  } catch (e) {
    syncState = "err";
    syncLastError = e.message;
    console.warn("[sync] boot pull failed:", e.message);
    renderDashboard();
    return { error: e.message };
  }
}

const bootResult = await bootSync();

// 拉到了远端数据 → 必须 reload 才能让内存里的 progress/notes/flashcards 更新
if (bootResult && bootResult.downloadedKeys > 0) {
  const flag = "camera3a:bootReloaded";
  if (!sessionStorage.getItem(flag)) {
    sessionStorage.setItem(flag, "1");
    location.reload();
    // 注意：reload 后整个脚本会重跑，下面的代码这一次不会执行
    // 但因为 sessionStorage 已置 1，下次 bootSync 即使再拉到数据也不会再 reload
  }
}

// 现在数据状态确定下来了，才允许：
// 1. 装自动同步钩子
// 2. 弹昵称 prompt
installAutoSync({
  debounceMs: 2000,
  onSuccess: () => { syncState = "ok"; renderDashboard(); },
  onError: (e) => { syncState = "err"; syncLastError = e.message; renderDashboard(); },
});

maybeAskNickname();

router.start();

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

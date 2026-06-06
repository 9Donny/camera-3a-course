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
  .on("#/quiz",          () => { renderSidebar("#/quiz");      placeholderView("📊 考核中心"); })
  .on("#/report",        () => { renderSidebar("#/report");    placeholderView("📈 日报"); })
  .on("#/weakness",      () => { renderSidebar("#/weakness");  placeholderView("🎯 薄弱项"); })
  .on("#/notes/:dayId",  (p) => { renderSidebar("#/notes");    placeholderView(`📝 笔记 · ${p.dayId}`); })
  .on("#/quiz/:quizId",  (p) => { renderSidebar("#/quiz");     placeholderView(`📊 考核 · ${p.quizId}`); })
  .on("#/report/:dayId", (p) => { renderSidebar("#/report");   placeholderView(`📈 日报 · ${p.dayId}`); })
  .setNotFound(() => { renderSidebar("");                       placeholderView("404 路径未找到"); });

router.start();

// expose for views to navigate / mutate state
window.app = { progress, persistProgress, router, storage };

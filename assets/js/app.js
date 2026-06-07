import { storage } from "./storage.js";
import { Progress } from "./progress.js";
import { Router } from "./router.js";
import { notes } from "./notes.js";
import { profile, todayLabel, todayISO, encouragement } from "./profile.js";

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
      <div class="dash-name">你好，${escapeHTML(profile.getNickname())} <button class="dash-edit" title="改昵称">✎</button></div>
      <div class="dash-date">${todayLabel()} · Day ${state.completedDays.length}/60 · 当前 Day ${day}</div>
    </div>
    <div class="dash-encouragement">${encouragement(state)}</div>
    <div class="dash-stats">
      <span class="dash-streak" title="连续打卡天数">🔥 ${state.streak}</span>
      <span class="dash-checkin ${checkInClass}">${checkInLabel}</span>
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
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// 每分钟刷新一次（跨过午夜时日期 / 打卡状态会变）
setInterval(renderDashboard, 60_000);

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
  renderDashboard();
}

function placeholderView(title) {
  content.innerHTML = `<h1>${title}</h1><p class="muted">该页面将在后续 Task 实现。</p>`;
}

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
    renderNotesList(content, { router, progress });
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

renderDashboard();
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

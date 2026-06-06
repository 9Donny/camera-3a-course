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

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

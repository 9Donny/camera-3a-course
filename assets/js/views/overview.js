export async function renderOverview(content, { progress, router }) {
  const state = progress.getState();
  const completed = state.completedDays.length;
  const totalDays = 60;
  const percent = Math.round(completed / totalDays * 100);

  // 加载课程大纲（含 week.goal/summary 和 day.goal/title）
  let curriculum = null;
  try {
    const res = await fetch("./assets/data/curriculum.json");
    if (res.ok) curriculum = await res.json();
  } catch (e) { /* 没拿到也能渲染基本骨架 */ }

  const dayMap = {};
  if (curriculum) {
    for (const d of curriculum.days) {
      const idx = parseInt(d.id.replace("day-", ""), 10);
      dayMap[idx] = d;
    }
  }

  const weeks = [];
  for (let w = 1; w <= 8; w++) {
    const weekData = curriculum?.weeks?.[w - 1];
    const cells = [];
    for (let i = 0; i < (w === 8 ? 11 : 7); i++) {
      const day = (w - 1) * 7 + i + 1;
      if (day > 60) { cells.push(`<div class="day-cell empty"></div>`); continue; }
      let cls = "locked";
      if (progress.isCompleted(day)) cls = "done";
      else if (progress.isUnlocked(day)) cls = "current";
      const dayInfo = dayMap[day];
      const dataAttrs = dayInfo
        ? `data-day="${day}" data-title="${escapeAttr(dayInfo.title)}" data-goal="${escapeAttr(dayInfo.goal || "")}"`
        : `data-day="${day}"`;
      cells.push(`<div class="day-cell ${cls}" ${dataAttrs} title="Day ${day}${dayInfo ? ' · ' + dayInfo.title : ''}">${day}</div>`);
    }
    const weekHeader = weekData
      ? `
        <div class="week-meta">
          <div class="week-title">${escapeHTML(weekData.title)}</div>
          ${weekData.goal ? `<div class="week-goal"><span class="label">学习目标</span> ${escapeHTML(weekData.goal)}</div>` : ""}
          ${weekData.summary ? `<div class="week-summary">${escapeHTML(weekData.summary)}</div>` : ""}
        </div>`
      : `<div class="week-meta"><div class="week-title">Week ${w}</div></div>`;

    weeks.push(`
      <div class="week-section">
        ${weekHeader}
        <div class="week-cells">${cells.join("")}</div>
      </div>
    `);
  }

  content.innerHTML = `
    <h1>📚 总览</h1>
    <p class="muted">已完成 ${completed} / ${totalDays} 天 · ${percent}%</p>
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="legend" style="margin-bottom:20px">
      <span><i class="dot done"></i>已完成</span>
      <span><i class="dot current"></i>当前可学</span>
      <span><i class="dot locked"></i>未解锁</span>
      <span style="margin-left:auto" class="dim">点击 Day 格子查看当日学习目标</span>
    </div>
    <div class="overview-grid">${weeks.join("")}</div>
    <div id="dayPopover" class="day-popover" style="display:none"></div>
  `;

  // 点击 day 格子弹出气泡
  const popover = document.getElementById("dayPopover");
  document.querySelectorAll(".day-cell").forEach(cell => {
    if (cell.classList.contains("empty")) return;
    cell.addEventListener("click", (e) => {
      e.stopPropagation();
      const day = cell.dataset.day;
      const title = cell.dataset.title;
      const goal = cell.dataset.goal;
      const isUnlocked = !cell.classList.contains("locked");
      const isCompleted = cell.classList.contains("done");
      const status = isCompleted ? "✅ 已完成" : isUnlocked ? "▶ 当前可学" : "🔒 未解锁";

      const dayId = `day-${String(day).padStart(2, "0")}`;
      // 已完成 → 跳到复读路由 #/today/day-XX；当前天 → #/today（正常学习）
      const targetHref = isCompleted ? `#/today/${dayId}` : "#/today";
      popover.innerHTML = `
        <div class="dp-status">${status}</div>
        <div class="dp-title">Day ${day} · ${escapeHTML(title || "（标题待补充）")}</div>
        ${goal ? `<div class="dp-goal"><span class="label">学习目标</span> ${escapeHTML(goal)}</div>` : ""}
        <div class="dp-actions">
          ${isUnlocked ? `<a class="btn" href="${targetHref}" onclick="document.getElementById('dayPopover').style.display='none'">${isCompleted ? '回顾' : '开始学习'}</a>` : `<span class="muted">完成上一天后解锁</span>`}
          ${isCompleted ? `<a class="btn secondary" href="#/notes/${dayId}" onclick="document.getElementById('dayPopover').style.display='none'">📝 笔记</a>` : ""}
          <button class="btn secondary" onclick="document.getElementById('dayPopover').style.display='none'">关闭</button>
        </div>
      `;
      const rect = cell.getBoundingClientRect();
      popover.style.display = "block";
      // 定位在格子下方
      popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
      popover.style.left = `${Math.max(20, rect.left + window.scrollX)}px`;
    });
  });
  document.addEventListener("click", () => { if (popover) popover.style.display = "none"; });
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s) { return escapeHTML(s); }

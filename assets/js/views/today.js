import { renderMarkdown } from "../markdown.js";
import { validateDay } from "../validators.js";

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

  const sections = data.sections.map(s => `
    <section class="lesson-section">
      <h2>${escapeHTML(s.title)}</h2>
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

  content.innerHTML = `
    <div class="lesson-header">
      <div class="muted">Week ${data.week} · 模块 ${data.module} · 预计 ${data.estimatedMinutes} 分钟</div>
      <h1>Day ${day} · ${escapeHTML(data.title)}</h1>
    </div>
    ${sections}
    ${refs ? `<section class="lesson-section"><h2>📚 参考资料</h2><ul>${refs}</ul></section>` : ""}
    <div class="lesson-footer">
      <a class="btn secondary" href="#/quiz/daily-${dayId}">📊 今日小测</a>
      <button class="btn" id="completeBtn" ${isCompleted ? "disabled" : ""}>${btnLabel}</button>
    </div>
  `;

  if (!isCompleted) {
    document.getElementById("completeBtn").addEventListener("click", () => {
      const today = new Date().toISOString().slice(0, 10);
      progress.completeDay(day, today);
      persistProgress();
      // simple celebration
      alert(`🎉 Day ${day} 完成！下一天已解锁。`);
      router.go("#/report/" + dayId);
    });
  }
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

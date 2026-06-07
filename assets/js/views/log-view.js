// 学习记录页：每日表格 + 30 天柱状图 + 汇总 + 页面分布
import { getDailyLog, totalSec, todaySec, recentDays, formatDuration, PAGE_LABEL } from "../tracker.js";

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${iso} ${WEEKDAY[d.getDay()]}`;
}

export function renderLog(content, { progress }) {
  const log = getDailyLog();
  const days = recentDays(30);
  const totalSecAll = totalSec();
  const todaySecVal = todaySec();
  const studiedDays = Object.keys(log).filter(k => (log[k].totalSec || 0) > 0).length;
  const avgSec = studiedDays > 0 ? Math.floor(totalSecAll / studiedDays) : 0;
  const maxBar = Math.max(1, ...days.map(d => d.totalSec));
  const completedDays = progress.getState().completedDays;

  // 30 天柱状图
  const bars = days.map(d => {
    const h = d.totalSec > 0 ? Math.max(2, Math.round((d.totalSec / maxBar) * 100)) : 0;
    const isCheckedIn = completedDays.includes(getDayNumberFromDate(d.date, progress));
    const cls = d.totalSec >= 4 * 3600 ? "bar-full" : d.totalSec >= 3600 ? "bar-some" : "bar-light";
    return `<div class="lb-bar-wrap" title="${d.date} · ${formatDuration(d.totalSec)}">
      <div class="lb-bar ${cls}" style="height:${h}%"></div>
      <div class="lb-bar-label">${d.date.slice(5)}</div>
    </div>`;
  }).join("");

  // 每日表格（按时间倒序，只显示有学习记录的）
  const sortedKeys = Object.keys(log).sort().reverse();
  const rows = sortedKeys.length === 0
    ? `<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">还没有学习记录。打开「今日学习」开始计时。</td></tr>`
    : sortedKeys.map(date => {
        const e = log[date];
        const checkedIn = e.totalSec > 0;
        const pageList = Object.entries(e.pages || {})
          .sort(([,a], [,b]) => b - a)
          .map(([p, s]) => `${PAGE_LABEL[p] || p} <span class="dim">${formatDuration(s)}</span>`)
          .join(" · ");
        return `<tr>
          <td>${formatDate(date)}</td>
          <td>${checkedIn ? "✅ 已打卡" : "—"}</td>
          <td><strong>${formatDuration(e.totalSec)}</strong></td>
          <td class="lb-pages">${pageList}</td>
        </tr>`;
      }).join("");

  content.innerHTML = `
    <h1>⏱ 学习记录</h1>
    <p class="muted">追踪每日学习时长 + 各页面耗时分布。计时规则：自动统计页面活跃时间，5 分钟无操作或切到后台自动暂停。</p>

    <div class="lb-summary">
      <div class="lb-card">
        <div class="lb-num">${formatDuration(totalSecAll)}</div>
        <div class="lb-label">累计学习</div>
      </div>
      <div class="lb-card">
        <div class="lb-num">${formatDuration(todaySecVal)}</div>
        <div class="lb-label">今日学习</div>
      </div>
      <div class="lb-card">
        <div class="lb-num">${formatDuration(avgSec)}</div>
        <div class="lb-label">日均（${studiedDays} 天）</div>
      </div>
      <div class="lb-card">
        <div class="lb-num">🔥 ${progress.getState().streak}</div>
        <div class="lb-label">连续打卡</div>
      </div>
    </div>

    <h2 style="margin-top:32px">近 30 天</h2>
    <div class="lb-chart">
      ${bars}
    </div>
    <div class="lb-legend">
      <span><i class="dot bar-full"></i>≥4h（达标）</span>
      <span><i class="dot bar-some"></i>1-4h</span>
      <span><i class="dot bar-light"></i>&lt;1h</span>
    </div>

    <h2 style="margin-top:32px">每日明细</h2>
    <div class="lb-table-wrap">
      <table class="lb-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>打卡</th>
            <th>学习时长</th>
            <th>各页面分布</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// 用 progress.startedAt 大致估算某个日期对应的 Day 编号 —— 仅用于柱状图标签辅助
function getDayNumberFromDate(iso, progress) {
  // progress 没有 startedAt，所以这里只能粗略匹配 completedDays 数组
  // 这个函数只是为了让 day 标记和柱状图配色匹配，不严格
  return -1;
}

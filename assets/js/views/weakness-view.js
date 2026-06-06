import { storage } from "../storage.js";
import { summarizeByModule } from "../quiz.js";
import { categorizeModules, recommendReview } from "../weakness.js";

const MODULE_INDEX = {
  M1: { title: "光学与硬件基础", days: [1,2,3,4,5,6,7] },
  M2: { title: "ISP Pipeline",  days: [8,9,10,11,12,13,14] },
  M3: { title: "AEC 自动曝光",  days: [15,16,17,18,19,20,21,22,23,24,25,26,27,28] },
  M4: { title: "AWB 自动白平衡", days: [29,30,31,32,33,34,35,36,37,38,39,40,41,42] },
  M5: { title: "AF 自动对焦",   days: [43,44,45,46] },
  M6: { title: "Flash + HDR + 色彩", days: [47,48,49,50,51,52,53] },
  M7: { title: "工具与工程方法", days: [54,55,56,57,58,59,60] },
};

export function renderWeakness(content, _ctx) {
  const all = storage.get("quizResults", {});
  const records = Object.values(all).map(q => ({ module: q.module, score: q.score, total: q.total }));
  const summary = summarizeByModule(records);
  const cat = categorizeModules(summary);
  const recs = recommendReview(summary, MODULE_INDEX);

  const bars = Object.keys(MODULE_INDEX).map(m => {
    const c = cat[m] ?? { bucket: "untested", accuracy: 0, total: 0, score: 0 };
    const pct = c.total > 0 ? (c.accuracy * 100).toFixed(0) : "—";
    const cls = `bar bar-${c.bucket}`;
    const width = c.total > 0 ? (c.accuracy * 100).toFixed(0) + "%" : "0%";
    return `<div class="weakness-row">
      <div class="weakness-label">${m} ${MODULE_INDEX[m].title}</div>
      <div class="weakness-bar"><div class="${cls}" style="width:${width}"></div></div>
      <div class="weakness-pct">${pct}${pct !== "—" ? "%" : ""}</div>
    </div>`;
  }).join("");

  const recsHTML = recs.length === 0
    ? `<p class="muted">暂无需要复习的模块。继续保持。</p>`
    : recs.map(r => {
        const dayLinks = (r.days ?? []).map(d => `<a href="#/today" onclick="event.preventDefault();alert('Day ${d} 复习入口将在后续完善')">Day ${d}</a>`).join(" · ");
        return `<div class="card"><strong>${r.module} · ${r.title}</strong> <span class="dim">${r.reason}</span><div style="margin-top:6px">${dayLinks}</div></div>`;
      }).join("");

  content.innerHTML = `
    <h1>🎯 薄弱项</h1>
    <div class="weakness-chart">${bars}</div>
    <h2 style="margin-top:24px">推荐复习</h2>
    ${recsHTML}
  `;
}

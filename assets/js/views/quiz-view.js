import { storage } from "../storage.js";
import { scoreQuizResults } from "../quiz.js";
import { validateQuiz } from "../validators.js";
import { celebrateFireworks, celebrateConfetti } from "../particles.js";

export async function renderQuizCenter(content, { progress }) {
  const day = progress.getState().currentDay;
  const dayId = `day-${String(Math.min(day, 60)).padStart(2, "0")}`;
  const week = Math.min(8, Math.ceil(progress.getState().currentDay / 7));
  content.innerHTML = `
    <h1>📊 考核中心</h1>
    <div class="card">
      <strong>每日小测</strong><div class="muted">本日：${dayId}</div>
      <div style="margin-top:8px"><a class="btn" href="#/quiz/daily-${dayId}">开始</a></div>
    </div>
    <div class="card">
      <strong>周考</strong><div class="muted">Week ${week}</div>
      <div style="margin-top:8px"><a class="btn ${week===1?'':'secondary'}" href="#/quiz/weekly-w${week}">开始</a></div>
    </div>
    <div class="card">
      <strong>月考</strong><div class="muted">Day 30 / Day 60 解锁（暂不可用）</div>
    </div>
  `;
}

export async function renderQuiz(content, { quizId, router }) {
  const path = quizId.startsWith("daily-")
    ? `./assets/data/quizzes/daily/${quizId}.json`
    : quizId.startsWith("weekly-")
      ? `./assets/data/quizzes/weekly/${quizId}.json`
      : `./assets/data/quizzes/monthly/${quizId}.json`;

  let data;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    content.innerHTML = `<h1>📊 ${quizId}</h1><p class="muted">题库 <code>${quizId}.json</code> 尚未提供（${e.message}）。</p>`;
    return;
  }
  const v = validateQuiz(data);
  if (!v.ok) {
    content.innerHTML = `<h1>⚠️ ${quizId} 数据错误</h1><pre>${v.errors.join("\n")}</pre>`;
    return;
  }

  const inputs = data.questions.map((q, i) => {
    if (q.type === "choice") {
      const opts = q.options.map(o => `<label><input type="radio" name="${q.id}" value="${escapeAttr(o)}"> ${escapeHTML(o)}</label>`).join("");
      return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><div class="qopts">${opts}</div></div>`;
    }
    if (q.type === "fill") {
      return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><input type="text" class="qfill" data-qid="${q.id}" placeholder="作答..."></div>`;
    }
    return `<div class="quiz-item"><div class="qprompt">${i+1}. ${escapeHTML(q.prompt)}</div><textarea class="qshort" data-qid="${q.id}" placeholder="简要作答..."></textarea></div>`;
  }).join("");

  content.innerHTML = `
    <h1>📊 ${data.id}</h1>
    <p class="muted">模块 ${data.module} · 共 ${data.questions.length} 题</p>
    <form id="quizForm">${inputs}</form>
    <button class="btn" id="submitQuiz">提交答案</button>
    <div id="quizResult"></div>
  `;

  document.getElementById("submitQuiz").addEventListener("click", () => {
    const responses = data.questions.map(q => {
      if (q.type === "choice") {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        return { qid: q.id, answer: checked?.value };
      }
      if (q.type === "fill") return { qid: q.id, answer: document.querySelector(`input[data-qid="${q.id}"]`).value };
      return { qid: q.id, answer: document.querySelector(`textarea[data-qid="${q.id}"]`).value };
    });
    showResults(data, responses);
  });

  function showResults(quiz, responses) {
    const result = scoreQuizResults(quiz.questions, responses);
    const items = quiz.questions.map((q, i) => {
      const e = result.entries[i];
      const r = responses[i];
      if (q.type === "short") {
        return `<div class="result-item">
          <div><strong>${i+1}. ${escapeHTML(q.prompt)}</strong></div>
          <div class="muted">你的答案：${escapeHTML(r.answer || "（未作答）")}</div>
          <div class="card" style="margin-top:6px"><strong>参考答案：</strong>${escapeHTML(q.referenceAnswer)}</div>
          <div style="margin-top:8px">自评：
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="right">✓ 答对</button>
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="partial">部分对</button>
            <button class="btn secondary self-rate" data-qid="${q.id}" data-rate="wrong">✗ 没答对</button>
            <span class="dim self-rate-status" id="rate-${q.id}"></span>
          </div>
        </div>`;
      }
      const correct = e.correct;
      return `<div class="result-item">
        <div><strong>${i+1}. ${escapeHTML(q.prompt)}</strong></div>
        <div class="${correct?'ok':'fail'}">${correct ? "✓ 正确" : "✗ 错误"}（你：${escapeHTML(String(r.answer ?? "未作答"))} · 答案：${escapeHTML(String(q.answer))}）</div>
      </div>`;
    }).join("");

    document.getElementById("quizResult").innerHTML = `
      <h2 style="margin-top:32px">结果：${result.score} / ${result.total}</h2>
      ${items}
      <p class="muted" style="margin-top:16px">简答题完成自评后，将自动写入薄弱项统计。</p>
    `;

    // 高分庆祝：满分→烟花，≥80%→彩纸
    const ratio = result.total > 0 ? result.score / result.total : 0;
    if (ratio >= 1.0) {
      setTimeout(() => celebrateFireworks(window.innerWidth / 2, window.innerHeight / 3), 100);
    } else if (ratio >= 0.8) {
      setTimeout(() => celebrateConfetti(), 100);
    }

    // self-rate handlers
    document.querySelectorAll(".self-rate").forEach(btn => {
      btn.addEventListener("click", () => {
        const qid = btn.dataset.qid;
        const rate = btn.dataset.rate;
        const r = responses.find(x => x.qid === qid);
        r.selfRated = rate;
        document.getElementById(`rate-${qid}`).textContent = `已自评：${rate}`;
        persistAndUpdate(quiz, responses);
      });
    });

    persistAndUpdate(quiz, responses);
  }

  function persistAndUpdate(quiz, responses) {
    const result = scoreQuizResults(quiz.questions, responses);
    const all = storage.get("quizResults", {});
    all[quiz.id] = {
      module: quiz.module,
      score: result.score,
      total: result.total,
      responses,
      submittedAt: new Date().toISOString(),
    };
    storage.set("quizResults", all);
  }
}

function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s) { return escapeHTML(s); }

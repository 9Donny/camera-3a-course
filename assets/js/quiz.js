export function gradeChoice(userAnswer, correct) {
  if (Array.isArray(userAnswer) || Array.isArray(correct)) {
    const a = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
    const b = new Set(Array.isArray(correct) ? correct : [correct]);
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  return userAnswer === correct;
}

export function gradeFill(userAnswer, correct) {
  const norm = String(userAnswer ?? "").trim().toLowerCase();
  const candidates = Array.isArray(correct) ? correct : [correct];
  return candidates.some(c => String(c).trim().toLowerCase() === norm);
}

const SELF_RATING_POINTS = { right: 1.0, partial: 0.5, wrong: 0.0 };

export function scoreQuizResults(questions, responses) {
  const byQid = new Map(responses.map(r => [r.qid, r]));
  const entries = questions.map(q => {
    const r = byQid.get(q.id);
    if (!r) return { qid: q.id, type: q.type, points: 0, correct: false };

    if (q.type === "choice") {
      const correct = gradeChoice(r.answer, q.answer);
      return { qid: q.id, type: q.type, points: correct ? 1 : 0, correct };
    }
    if (q.type === "fill") {
      const correct = gradeFill(r.answer, q.answer);
      return { qid: q.id, type: q.type, points: correct ? 1 : 0, correct };
    }
    if (q.type === "short") {
      const points = SELF_RATING_POINTS[r.selfRated] ?? 0;
      return { qid: q.id, type: q.type, points, correct: points === 1 };
    }
    return { qid: q.id, type: q.type, points: 0, correct: false };
  });

  const score = entries.reduce((s, e) => s + e.points, 0);
  return { total: questions.length, score, entries };
}

export function summarizeByModule(records) {
  const acc = {};
  for (const r of records) {
    const slot = acc[r.module] ?? { score: 0, total: 0 };
    slot.score += r.score;
    slot.total += r.total;
    acc[r.module] = slot;
  }
  for (const k of Object.keys(acc)) {
    acc[k].accuracy = acc[k].total > 0 ? acc[k].score / acc[k].total : 0;
  }
  return acc;
}

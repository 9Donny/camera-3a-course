import { storage } from "./storage.js";
import { notes } from "./notes.js";
import { summarizeByModule } from "./quiz.js";

export function buildDailyReport(dayId, progress) {
  const note = notes.get(dayId);
  const allQuiz = storage.get("quizResults", {});
  const quizKey = `daily-${dayId}`;
  const quiz = allQuiz[quizKey];
  const moduleSummary = summarizeByModule(
    Object.values(allQuiz).map(q => ({ module: q.module, score: q.score, total: q.total }))
  );
  const state = progress.getState();
  return {
    dayId,
    completedAt: state.lastCompletedAt,
    streak: state.streak,
    quiz: quiz ? { score: quiz.score, total: quiz.total } : null,
    notePreview: (note.content || "").slice(0, 200),
    moduleSummary,
    encouragement: pickEncouragement(state),
  };
}

function pickEncouragement(state) {
  const n = state.completedDays.length;
  if (n === 1) return "万事开头难，你已经迈出第一步。";
  if (n === 7) return "Week 1 完成！光学基础已经入门。";
  if (n === 30) return "你已坚持一个月，知识体系正在成型。";
  if (n === 60) return "60 天闭关修炼完成，去面试吧！";
  if (state.streak >= 7) return `连续打卡 ${state.streak} 天，习惯已经形成。`;
  return "稳扎稳打，每天 4 小时就是最好的节奏。";
}

// 简化版 SM-2 间隔重复算法
// 三档评分：forgot / fuzzy / known
// 状态：interval（天）、ease（系数 1.3-2.5）、reps（已复习次数）、dueAt（ISO 日期）
//
// 调度规则（保持简单可读）：
//   forgot: interval → 0；ease -= 0.2（最低 1.3）；reps 不变；dueAt = today
//   fuzzy : interval 不变；ease -= 0.1（最低 1.3）；reps += 1；dueAt = today + interval
//   known : interval 按阶梯前进；ease 不变；reps += 1；dueAt = today + 新 interval
//
// 阶梯：0 → 1 → 3 → 7 → 15 → 30（封顶）

const INTERVAL_LADDER = [0, 1, 3, 7, 15, 30];
const EASE_FLOOR = 1.3;
const EASE_INIT = 2.5;
const RATINGS = new Set(["forgot", "fuzzy", "known"]);

export const INITIAL_CARD_STATE = {
  interval: 0,
  ease: EASE_INIT,
  reps: 0,
  dueAt: null,
};

function nextLadderStep(currentInterval) {
  const idx = INTERVAL_LADDER.indexOf(currentInterval);
  if (idx === -1) {
    // 不在阶梯上（导入数据可能有非标准值），找下一个大于当前的
    const next = INTERVAL_LADDER.find(v => v > currentInterval);
    return next ?? INTERVAL_LADDER[INTERVAL_LADDER.length - 1];
  }
  return INTERVAL_LADDER[Math.min(idx + 1, INTERVAL_LADDER.length - 1)];
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function schedule(card, rating, today) {
  if (!RATINGS.has(rating)) {
    throw new Error(`schedule: invalid rating "${rating}"`);
  }
  const cur = {
    interval: card.interval ?? 0,
    ease: card.ease ?? EASE_INIT,
    reps: card.reps ?? 0,
  };

  if (rating === "forgot") {
    // 第一次（reps=0）忘了不惩罚 ease，只重置间隔
    const newEase = cur.reps === 0 ? cur.ease : Math.max(EASE_FLOOR, cur.ease - 0.2);
    return {
      ...card,
      interval: 0,
      ease: newEase,
      reps: cur.reps,
      dueAt: today,
    };
  }

  if (rating === "fuzzy") {
    const newEase = Math.max(EASE_FLOOR, cur.ease - 0.1);
    return {
      ...card,
      interval: cur.interval,
      ease: newEase,
      reps: cur.reps + 1,
      dueAt: addDays(today, cur.interval),
    };
  }

  // rating === "known"
  const newInterval = nextLadderStep(cur.interval);
  return {
    ...card,
    interval: newInterval,
    ease: cur.ease,
    reps: cur.reps + 1,
    dueAt: addDays(today, newInterval),
  };
}

// 学员个人信息：昵称 + 学习起始日
import { storage } from "./storage.js";

const KEY = "profile";

export const profile = {
  get() {
    return storage.get(KEY, { nickname: "", startedAt: null });
  },
  set(p) {
    storage.set(KEY, p);
  },
  getNickname() {
    const p = this.get();
    return p.nickname || "学员";
  },
  setNickname(name) {
    const p = this.get();
    p.nickname = name.trim().slice(0, 20);
    this.set(p);
  },
  // 第一次访问时记住起始日期；用于"已开始 N 天"的统计
  ensureStartedAt() {
    const p = this.get();
    if (!p.startedAt) {
      p.startedAt = new Date().toISOString().slice(0, 10);
      this.set(p);
    }
    return p.startedAt;
  },
};

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function todayLabel() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${dd} ${WEEKDAY[d.getDay()]}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// 根据进度状态产出一句鼓励语
export function encouragement(progressState) {
  const n = progressState.completedDays.length;
  const streak = progressState.streak;
  if (n === 0) return "万事开头难，今天迈出第一步";
  if (n >= 60) return "60 天闭关完成，去面试吧 🎉";
  if (n === 30) return "已学一半，下半程更精彩";
  if (n === 14) return "ISP Pipeline 拿下，3A 在前方";
  if (n === 7) return "Week 1 完成，光学打底牢固";
  if (streak >= 14) return `连续 ${streak} 天，自律惊人`;
  if (streak >= 7) return `连续 ${streak} 天，习惯已成`;
  if (streak >= 3) return `连续 ${streak} 天，节奏不错`;
  return "稳扎稳打，每天 4 小时";
}

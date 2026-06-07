// 学习时间追踪器
// 数据：localStorage["camera3a:studyLog"] = { "2026-06-07": { totalSec: 5040, pages: {today:3600, review:300, ...} } }
// 规则：
//   - 进入路由开始计时
//   - 切换路由先把当前段累计到当前页面 bucket
//   - 页面 hidden（visibilitychange）暂停
//   - 5 分钟无任何交互（mouse/key/scroll）自动暂停
//   - 每 30 秒落盘一次防数据丢失

import { storage } from "./storage.js";

const KEY = "studyLog";
const IDLE_LIMIT_MS = 5 * 60 * 1000;
const FLUSH_INTERVAL_MS = 30 * 1000;

let currentPage = null;     // overview / today / review / notes / quiz / report / weakness / log
let segmentStart = 0;       // 当前段开始的 ms 时间戳
let lastInteractionAt = 0;  // 最近一次交互
let isPaused = false;
let flushTimer = null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowMs() {
  return Date.now();
}

function getLog() {
  return storage.get(KEY, {});
}

function saveLog(log) {
  storage.set(KEY, log);
}

// 把已经经过的时长归入当前 page bucket
function flushSegment() {
  if (currentPage === null || segmentStart === 0) return;
  const now = nowMs();
  let elapsed = now - segmentStart;
  if (isPaused) {
    // 暂停期间不计算到现在，只算到 lastInteractionAt + IDLE_LIMIT_MS
    elapsed = Math.max(0, (lastInteractionAt + IDLE_LIMIT_MS) - segmentStart);
  }
  segmentStart = now;
  if (elapsed <= 0) return;

  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 1) return;

  const day = todayISO();
  const log = getLog();
  if (!log[day]) log[day] = { totalSec: 0, pages: {} };
  log[day].totalSec += seconds;
  log[day].pages[currentPage] = (log[day].pages[currentPage] || 0) + seconds;
  saveLog(log);
}

function checkIdle() {
  if (currentPage === null) return;
  if (isPaused) return;
  const now = nowMs();
  if (now - lastInteractionAt > IDLE_LIMIT_MS) {
    flushSegment();
    isPaused = true;
  }
}

function onInteraction() {
  lastInteractionAt = nowMs();
  if (isPaused) {
    isPaused = false;
    segmentStart = nowMs(); // 从此刻起重新计时
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    flushSegment();
    isPaused = true;
  } else {
    isPaused = false;
    segmentStart = nowMs();
    lastInteractionAt = nowMs();
  }
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
  ["mousedown", "keydown", "scroll", "touchstart"].forEach(ev =>
    document.addEventListener(ev, onInteraction, { passive: true })
  );
  flushTimer = setInterval(() => {
    checkIdle();
    if (!isPaused) flushSegment();
  }, FLUSH_INTERVAL_MS);
  // 关闭/刷新前最后落盘
  window.addEventListener("beforeunload", flushSegment);
}

// 公开：路由切换时调用
export function trackPage(page) {
  ensureInit();
  // 先把上一页累计
  flushSegment();
  currentPage = page;
  segmentStart = nowMs();
  lastInteractionAt = nowMs();
  isPaused = document.hidden;
}

// 读取数据
export function getDailyLog() {
  return getLog();
}

// 总学习时长（秒）
export function totalSec() {
  const log = getLog();
  let s = 0;
  for (const day of Object.values(log)) s += day.totalSec || 0;
  return s;
}

// 今日学习时长（秒）
export function todaySec() {
  const log = getLog();
  return log[todayISO()]?.totalSec || 0;
}

// 最近 N 天的数据（缺失日期补 0）
export function recentDays(n = 30) {
  const log = getLog();
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, totalSec: log[iso]?.totalSec || 0, pages: log[iso]?.pages || {} });
  }
  return out;
}

// 时长格式化：seconds → "1h 23m" / "45m" / "12s"
export function formatDuration(sec) {
  if (!sec || sec < 1) return "0m";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

// 页面 ID → 中文标签
export const PAGE_LABEL = {
  overview: "📚 总览",
  today: "📅 今日学习",
  review: "🧠 复习",
  notes: "📝 笔记",
  quiz: "📊 考核",
  report: "📈 日报",
  weakness: "🎯 薄弱项",
  log: "⏱ 学习记录",
};

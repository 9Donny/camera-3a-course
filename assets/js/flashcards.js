// 卡片存储：CRUD + 到期查询。状态字段（interval/ease/reps/dueAt）走 SRS 算法管理。
// 持久化：用 storage.js 的 wrapper（命名空间 camera3a:flashcards）

import { storage as defaultStorage } from "./storage.js";

const STORAGE_KEY = "flashcards";

let idSeq = 0;
function genId() {
  idSeq += 1;
  return `fc-${Date.now().toString(36)}-${idSeq}`;
}

export class Flashcards {
  constructor(backend = defaultStorage) {
    this.backend = backend;
    this._cache = null; // 数组缓存，写入时同步到 storage
  }

  _load() {
    if (this._cache !== null) return this._cache;
    const raw = this.backend.get(STORAGE_KEY, []);
    this._cache = Array.isArray(raw) ? raw : [];
    return this._cache;
  }

  _save() {
    this.backend.set(STORAGE_KEY, this._cache);
  }

  all() {
    return this._load().slice();
  }

  // 返回 dueAt <= today 的卡片，oldest-first
  // 关键：新卡（dueAt=null，即用户从未学过+评过分的）不视为「到期」
  // 这种卡只在用户完成对应 Day 学习后才会被「激活」（unlockBySrcDay）
  // 这样避免：第 1 天就要复习 263 张未学的卡 / 学到第 4 天看到第 50 天的内容
  dueToday(today) {
    const list = this._load().filter(c => {
      if (c.dueAt === null || c.dueAt === undefined) return false;
      return c.dueAt <= today;
    });
    list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return list;
  }

  // 用户完成 day-NN 学习后调用：把所有 srcDay==dayId 的种子卡设 dueAt=今天
  // 这些卡才会出现在复习队列里
  // 已经有 dueAt 的不动（保留之前的复习状态）
  unlockBySrcDay(dayId, today) {
    const list = this._load();
    let unlocked = 0;
    for (const c of list) {
      if (c.srcDay !== dayId) continue;
      if (c.dueAt !== null && c.dueAt !== undefined) continue; // 已激活的不动
      c.dueAt = today; // 今天就要复习一次（强化记忆）
      unlocked += 1;
    }
    if (unlocked > 0) this._save();
    return unlocked;
  }

  // 反向迁移：srcDay 不在 completedDayIds 的卡 → 强制重置回 null（不进复习队列）
  // 修复历史 bug：早期版本 dueToday 把 dueAt=null 当到期，让用户给未学的卡评了分，
  // 那些卡有 dueAt 值，新版本 dueToday 还是会显示。这里把它们重置干净。
  // 副作用：之前的评分丢失，但这本来就是基于「未学过的内容」的无效评分。
  resetUnlearnedCards(completedDayIds) {
    const list = this._load();
    const completed = new Set(completedDayIds);
    let reset = 0;
    for (const c of list) {
      if (!c.srcDay) continue; // 没 srcDay 的不动（用户自定义卡）
      if (completed.has(c.srcDay)) continue; // 已学过，保留状态
      // 没学过但有状态 → 重置
      if (c.dueAt !== null && c.dueAt !== undefined) {
        c.dueAt = null;
        c.interval = 0;
        c.ease = 2.5;
        c.reps = 0;
        reset += 1;
      }
    }
    if (reset > 0) this._save();
    return reset;
  }

  add(partial) {
    const list = this._load();
    const id = partial.id ?? genId();
    const existingIdx = list.findIndex(c => c.id === id);
    const merged = {
      id,
      front: "",
      back: "",
      tags: [],
      srcDay: null,
      interval: 0,
      ease: 2.5,
      reps: 0,
      dueAt: null,
      ...partial,
      id, // 强制 id
    };
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...merged };
    } else {
      list.push(merged);
    }
    this._save();
    return merged;
  }

  update(id, partial) {
    const list = this._load();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...partial, id };
    this._save();
    return list[idx];
  }

  remove(id) {
    const list = this._load();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this._save();
    return true;
  }

  // 种子卡片：保留已存在卡片的学习状态，只补加缺失的
  loadInitial(seeds) {
    if (!Array.isArray(seeds)) return;
    const list = this._load();
    const known = new Set(list.map(c => c.id));
    let added = 0;
    for (const seed of seeds) {
      if (!seed.id) continue;
      if (known.has(seed.id)) continue;
      list.push({
        id: seed.id,
        front: seed.front || "",
        back: seed.back || "",
        tags: seed.tags || [],
        srcDay: seed.srcDay ?? null,
        interval: 0,
        ease: 2.5,
        reps: 0,
        dueAt: null,
      });
      added += 1;
    }
    if (added > 0) this._save();
    return added;
  }

  exportJSON() {
    return JSON.stringify(this._load(), null, 2);
  }

  importJSON(s) {
    const data = JSON.parse(s);
    if (!Array.isArray(data)) throw new Error("expected array");
    this._cache = data;
    this._save();
  }
}

export const flashcards = new Flashcards();

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

  // 返回 dueAt <= today 或 dueAt 为 null（新卡）的卡片，oldest-first
  dueToday(today) {
    const list = this._load().filter(c => {
      if (c.dueAt === null || c.dueAt === undefined) return true;
      return c.dueAt <= today;
    });
    list.sort((a, b) => {
      const da = a.dueAt ?? "0000-00-00";
      const db = b.dueAt ?? "0000-00-00";
      return da.localeCompare(db);
    });
    return list;
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

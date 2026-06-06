import { storage } from "./storage.js";

export const notes = {
  KEY: "notes",
  all() { return storage.get(this.KEY, {}); },
  get(dayId) { return this.all()[dayId] ?? { content: "", updatedAt: null }; },
  set(dayId, content) {
    const all = this.all();
    all[dayId] = { content, updatedAt: new Date().toISOString() };
    storage.set(this.KEY, all);
  },
  exportMarkdown() {
    const all = this.all();
    const dayIds = Object.keys(all).sort();
    let out = "# Camera 3A 学习笔记\n\n";
    for (const id of dayIds) {
      out += `\n## ${id}\n\n${all[id].content}\n\n---\n`;
    }
    return out;
  },
  exportJSON() {
    return JSON.stringify(this.all(), null, 2);
  },
  importJSON(json) {
    const data = JSON.parse(json);
    if (typeof data !== "object" || data === null) throw new Error("invalid notes JSON");
    storage.set(this.KEY, data);
  },
};

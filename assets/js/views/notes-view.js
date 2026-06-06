import { notes } from "../notes.js";

export function renderNotesList(content, { router }) {
  const all = notes.all();
  const dayIds = Object.keys(all).sort();
  const items = dayIds.length === 0
    ? `<p class="muted">还没有笔记。在「今日学习」页右下角的笔记浮窗开始记录。</p>`
    : dayIds.map(id => {
        const preview = (all[id].content || "").slice(0, 80).replace(/\n/g, " ");
        return `<div class="card" onclick="window.app.router.go('#/notes/${id}')" style="cursor:pointer">
          <strong>${id}</strong> <span class="dim">${all[id].updatedAt?.slice(0,10) ?? ""}</span>
          <div class="muted" style="margin-top:6px">${escapeHTML(preview)}…</div>
        </div>`;
      }).join("");
  content.innerHTML = `
    <h1>📝 笔记</h1>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn secondary" onclick="window.app.exportNotesMd()">📤 导出 Markdown</button>
      <button class="btn secondary" onclick="window.app.exportNotesJson()">📤 导出 JSON</button>
      <label class="btn secondary" style="cursor:pointer">📥 导入 JSON
        <input type="file" accept=".json" style="display:none" onchange="window.app.importNotesJson(event)">
      </label>
    </div>
    ${items}
  `;
}

export function renderNoteEditor(content, { dayId }) {
  const note = notes.get(dayId);
  content.innerHTML = `
    <h1>📝 ${dayId} 笔记</h1>
    <p class="dim">最后更新：${note.updatedAt ?? "未保存"}</p>
    <textarea id="noteEditor" class="note-editor" placeholder="开始记录你的笔记...">${escapeHTML(note.content)}</textarea>
    <div class="dim" id="saveStatus" style="margin-top:8px">已自动保存</div>
  `;
  const editor = document.getElementById("noteEditor");
  const status = document.getElementById("saveStatus");
  let timer = null;
  editor.addEventListener("input", () => {
    status.textContent = "正在保存...";
    clearTimeout(timer);
    timer = setTimeout(() => {
      notes.set(dayId, editor.value);
      status.textContent = `已保存 · ${new Date().toLocaleTimeString()}`;
    }, 400);
  });
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

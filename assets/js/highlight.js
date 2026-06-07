// 课程划词收藏：选中文字后弹出按钮，把选中内容追加到当天笔记
import { notes } from "./notes.js";

let bubbleEl = null;
let toastEl = null;

function ensureBubble() {
  if (bubbleEl) return bubbleEl;
  bubbleEl = document.createElement("div");
  bubbleEl.className = "highlight-bubble";
  bubbleEl.style.cssText = `
    position: absolute;
    z-index: 9999;
    display: none;
    background: var(--accent, #3b82f6);
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    user-select: none;
    -webkit-user-select: none;
  `;
  bubbleEl.innerHTML = "📌 收藏到笔记";
  document.body.appendChild(bubbleEl);
  return bubbleEl;
}

function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "highlight-toast";
    toastEl.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 10000;
      background: #22c55e;
      color: #fff;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: opacity 0.3s;
      opacity: 0;
    `;
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity = "1";
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 1800);
}

function hideBubble() {
  if (bubbleEl) bubbleEl.style.display = "none";
}

// 找出选中文字最近的 lesson-section 标题，用于来源标注
function findSectionTitle(node) {
  while (node && node !== document.body) {
    if (node.nodeType === 1 && node.classList?.contains("lesson-section")) {
      const h2 = node.querySelector("h2");
      return h2 ? h2.textContent.trim() : null;
    }
    node = node.parentNode;
  }
  return null;
}

// 判断选区是否在课程内容区内（避免选中导航/按钮文字也触发）
function isInLesson(range) {
  const c = range.commonAncestorContainer;
  const el = c.nodeType === 1 ? c : c.parentElement;
  return !!el?.closest("#content");
}

function appendToNote(dayId, text, sourceTitle) {
  const existing = notes.get(dayId).content || "";
  const stamp = new Date().toLocaleString("zh-CN", { hour12: false });
  const sourceLine = sourceTitle ? `（来自：${sourceTitle}）` : "";
  const block = `\n\n> ${text}\n>\n> — ${stamp} ${sourceLine}`.trim();
  const newContent = existing
    ? `${existing}\n\n${block}`
    : `# ${dayId} 笔记\n\n${block}`;
  notes.set(dayId, newContent);
}

export function initHighlightCollect({ getDayId }) {
  // 鼠标松开（或触摸结束）后检查选区
  function onSelectionEnd(e) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      hideBubble();
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 3) {
      hideBubble();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!isInLesson(range)) {
      hideBubble();
      return;
    }
    const rect = range.getBoundingClientRect();
    const bubble = ensureBubble();
    // 浮在选区上方
    const top = window.scrollY + rect.top - 38;
    const left = window.scrollX + rect.left + rect.width / 2 - 60;
    bubble.style.top = `${top}px`;
    bubble.style.left = `${Math.max(8, left)}px`;
    bubble.style.display = "block";

    bubble.onclick = (ev) => {
      ev.stopPropagation();
      const dayId = getDayId();
      const sourceTitle = findSectionTitle(range.commonAncestorContainer);
      appendToNote(dayId, text, sourceTitle);
      showToast(`已收藏到 ${dayId} 笔记`);
      hideBubble();
      // 清除选区，避免重复收藏
      sel.removeAllRanges();
    };
  }

  // 全局事件：在 today view 渲染后绑定一次
  document.addEventListener("mouseup", onSelectionEnd);
  document.addEventListener("touchend", onSelectionEnd);
  // 点击其他地方收起
  document.addEventListener("mousedown", (e) => {
    if (bubbleEl && e.target !== bubbleEl && !bubbleEl.contains(e.target)) {
      hideBubble();
    }
  });
  // 切页时收起
  window.addEventListener("hashchange", hideBubble);
}

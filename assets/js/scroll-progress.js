// 右侧悬浮进度条 + 章节导航
// 显示当前阅读进度 + 当前章节，点章节平滑滚动

let widgetEl = null;
let scrollHandler = null;
let mainScroller = null;

function getMainScroller() {
  // SPA 的滚动容器是 #content 本身（CSS overflow-y:auto）
  return document.getElementById("content");
}

export function initScrollProgress(sections) {
  // 先清旧的
  destroyScrollProgress();

  if (!sections || sections.length === 0) return;
  mainScroller = getMainScroller();
  if (!mainScroller) return;

  const dismissed = localStorage.getItem("camera3a:scrollProgressHidden") === "1";

  widgetEl = document.createElement("div");
  widgetEl.className = "scroll-progress-widget";
  widgetEl.innerHTML = `
    <button class="sp-toggle" title="${dismissed ? '显示' : '隐藏'}阅读进度">${dismissed ? '📊' : '✕'}</button>
    <div class="sp-body" ${dismissed ? 'style="display:none"' : ''}>
      <div class="sp-bar"><div class="sp-fill" id="spFill"></div></div>
      <div class="sp-toc">
        ${sections.map((s, i) => `
          <a class="sp-toc-item" data-idx="${i}" href="#section-${i}-${encodeURIComponent(s.id)}">
            <span class="sp-toc-num">${i + 1}</span>
            <span class="sp-toc-title">${escapeHTML(s.title)}</span>
          </a>
        `).join('')}
      </div>
      <div class="sp-percent" id="spPercent">0%</div>
    </div>
  `;
  document.body.appendChild(widgetEl);

  // 给每个 lesson-section 加 id 和 data-idx，便于滚动定位
  const lessonSections = mainScroller.querySelectorAll(".lesson-section");
  lessonSections.forEach((el, i) => {
    if (i < sections.length) {
      el.id = `section-${i}-${encodeURIComponent(sections[i].id)}`;
      el.dataset.idx = i;
    }
  });

  const fill = widgetEl.querySelector("#spFill");
  const percentEl = widgetEl.querySelector("#spPercent");
  const tocItems = widgetEl.querySelectorAll(".sp-toc-item");

  function updateProgress() {
    const max = mainScroller.scrollHeight - mainScroller.clientHeight;
    const cur = mainScroller.scrollTop;
    const pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
    fill.style.height = pct + "%";
    percentEl.textContent = pct + "%";

    // 找出当前正在视野中的 section
    let activeIdx = 0;
    const scrollerRect = mainScroller.getBoundingClientRect();
    const refY = scrollerRect.top + 120; // 视为 "当前阅读位置" 的参考线（视区上方 120px）
    let bestSeen = -Infinity;
    lessonSections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // 章节顶部已经越过参考线 → 视为"已进入"，记录最大的 idx
      if (rect.top <= refY) {
        const idx = parseInt(el.dataset.idx, 10);
        if (!isNaN(idx) && idx > bestSeen) {
          bestSeen = idx;
          activeIdx = idx;
        }
      }
    });
    tocItems.forEach((it, i) => {
      it.classList.toggle("active", i === activeIdx);
    });
  }

  // 点章节滚动
  tocItems.forEach((it) => {
    it.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = parseInt(it.dataset.idx, 10);
      const target = mainScroller.querySelector(`[data-idx="${idx}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // 折叠 / 展开按钮
  const toggleBtn = widgetEl.querySelector(".sp-toggle");
  toggleBtn.addEventListener("click", () => {
    const body = widgetEl.querySelector(".sp-body");
    const hidden = body.style.display === "none";
    body.style.display = hidden ? "" : "none";
    toggleBtn.textContent = hidden ? "✕" : "📊";
    toggleBtn.title = hidden ? "隐藏阅读进度" : "显示阅读进度";
    localStorage.setItem("camera3a:scrollProgressHidden", hidden ? "0" : "1");
  });

  scrollHandler = () => requestAnimationFrame(updateProgress);
  mainScroller.addEventListener("scroll", scrollHandler, { passive: true });
  window.addEventListener("resize", scrollHandler);

  // 初始计算
  updateProgress();
}

export function destroyScrollProgress() {
  if (scrollHandler && mainScroller) {
    mainScroller.removeEventListener("scroll", scrollHandler);
    window.removeEventListener("resize", scrollHandler);
  }
  if (widgetEl && widgetEl.parentNode) {
    widgetEl.parentNode.removeChild(widgetEl);
  }
  widgetEl = null;
  scrollHandler = null;
  mainScroller = null;
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}

// 粒子特效：完成本日 / 复习记得 / 考核高分时触发
// 用单个 fixed canvas 覆盖全屏，requestAnimationFrame 驱动
// 支持总开关（localStorage: camera3a:particlesEnabled，默认开）
// 支持 prefers-reduced-motion，自动尊重用户系统设置

const PREF_KEY = "camera3a:particlesEnabled";

let canvas = null;
let ctx = null;
let particles = [];
let rafId = null;

function isEnabled() {
  // 系统级 reduce motion 优先
  if (typeof window !== "undefined" && window.matchMedia) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return false;
  }
  try {
    return localStorage.getItem(PREF_KEY) !== "0";
  } catch (e) {
    return true;
  }
}

export function setEnabled(on) {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch (e) {}
  if (!on) clearAll();
}

export function getEnabled() {
  return isEnabled();
}

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.id = "particleCanvas";
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  return canvas;
}

function resize() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.life -= 1;

    const alpha = Math.min(1, p.life / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "star") {
      drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
      ctx.fill();
    }
    ctx.restore();
  }

  if (particles.length > 0) {
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = null;
  }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR;
    let y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
}

function spawn(particles, configs) {
  particles.push(...configs);
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function clearAll() {
  particles = [];
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ========== 公开特效 ==========

// 1) 彩纸庆祝（用于完成本日学习）
//   两侧斜着喷出彩色矩形，重力下落
export function celebrateConfetti() {
  if (!isEnabled()) return;
  ensureCanvas();
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#60a5fa", "#fbbf24"];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const items = [];

  // 左下角喷射
  for (let i = 0; i < 80; i++) {
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6;
    const speed = 14 + Math.random() * 8;
    items.push(makeParticle(0, H, Math.cos(angle) * speed, Math.sin(angle) * speed, colors));
  }
  // 右下角喷射
  for (let i = 0; i < 80; i++) {
    const angle = Math.PI + Math.PI / 4 + (Math.random() - 0.5) * 0.6;
    const speed = 14 + Math.random() * 8;
    items.push(makeParticle(W, H, Math.cos(angle) * speed, Math.sin(angle) * speed, colors));
  }
  spawn(particles, items);
}

function makeParticle(x, y, vx, vy, colors) {
  return {
    x, y, vx, vy,
    gravity: 0.35,
    drag: 0.99,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    size: 8 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: "rect",
    life: 100 + Math.random() * 40,
  };
}

// 2) 蓝色光点上升（用于复习"记得"评分）
//   从屏幕下方某个位置升起一些蓝色光点
export function celebrateRise(x, y) {
  if (!isEnabled()) return;
  ensureCanvas();
  const colors = ["#60a5fa", "#3b82f6", "#a5b4fc"];
  const items = [];
  for (let i = 0; i < 24; i++) {
    items.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: -3 - Math.random() * 4,
      gravity: -0.05,
      drag: 0.97,
      rot: 0, spin: 0,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: "circle",
      life: 60 + Math.random() * 30,
    });
  }
  spawn(particles, items);
}

// 3) 顶部飘落星点（用于每日首次进入今日学习）
//   柔和、缓慢，不喧宾夺主
export function celebrateWelcome() {
  if (!isEnabled()) return;
  ensureCanvas();
  const colors = ["#fbbf24", "#60a5fa", "#a78bfa", "#22c55e", "#f472b6"];
  const W = window.innerWidth;
  const items = [];
  for (let i = 0; i < 50; i++) {
    items.push({
      x: Math.random() * W,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1 + Math.random() * 1.5,
      gravity: 0.02,
      drag: 0.995,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? "star" : "circle",
      life: 200 + Math.random() * 80,
    });
  }
  spawn(particles, items);
}

// 4) 金色烟花（用于考核高分 / streak 里程碑）
//   从中心扇形扩散
export function celebrateFireworks(cx, cy) {
  if (!isEnabled()) return;
  ensureCanvas();
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899"];
  const items = [];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 6;
    items.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.15,
      drag: 0.96,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? "star" : "circle",
      life: 80 + Math.random() * 40,
    });
  }
  spawn(particles, items);
}

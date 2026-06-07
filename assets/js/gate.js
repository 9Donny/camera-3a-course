// 密码门 —— 输对密码后才加载主应用
// 密码以 SHA-256 hash 形式存储在这里。明文不会进 git。
//
// 修改密码方法（你自己改）：
//   1. 在终端跑：echo -n "你的新密码" | shasum -a 256
//   2. 把得到的 64 字符 hash 替换下面 PASSWORD_SHA256 的值
//   3. 重新加载页面
//
// 不想要密码门？把 PASSWORD_SHA256 设为空字符串即可绕过。

// 默认密码：camera3a（仅用于初始化；强烈建议你立刻改）
// SHA-256("camera3a") = c7a610b1ee9ff8bc60d11fd541e4e02e540e054806e0090284075dde4bb65f5e
const PASSWORD_SHA256 = "c7a610b1ee9ff8bc60d11fd541e4e02e540e054806e0090284075dde4bb65f5e";

const SESSION_KEY = "camera3a:gateAuthed";
const ATTEMPT_KEY = "camera3a:gateAttempts";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000; // 10 分钟锁定

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function showApp() {
  document.getElementById("gateMask").style.display = "none";
  document.getElementById("topbar").style.display = "";
  document.getElementById("layout").style.display = "";
  // 加载主应用
  const s = document.createElement("script");
  s.type = "module";
  s.src = "assets/js/app.js?v=20";
  document.body.appendChild(s);
}

function getAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch { return { count: 0, lockedUntil: 0 }; }
}
function setAttempts(v) {
  try { localStorage.setItem(ATTEMPT_KEY, JSON.stringify(v)); } catch {}
}

async function tryUnlock(input) {
  const attempts = getAttempts();
  const now = Date.now();
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const remain = Math.ceil((attempts.lockedUntil - now) / 60000);
    return { ok: false, error: `连续输错过多，请 ${remain} 分钟后再试` };
  }

  const hash = await sha256(input);
  if (hash === PASSWORD_SHA256) {
    setAttempts({ count: 0, lockedUntil: 0 });
    sessionStorage.setItem(SESSION_KEY, "1");
    return { ok: true };
  }

  // 输错累计
  attempts.count = (attempts.count || 0) + 1;
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = now + LOCK_MS;
    attempts.count = 0;
    setAttempts(attempts);
    return { ok: false, error: `已输错 ${MAX_ATTEMPTS} 次，锁定 10 分钟` };
  }
  setAttempts(attempts);
  return { ok: false, error: `密码错误（剩余 ${MAX_ATTEMPTS - attempts.count} 次尝试）` };
}

function bind() {
  const btn = document.getElementById("gateBtn");
  const input = document.getElementById("gateInput");
  const errEl = document.getElementById("gateError");
  const submit = async () => {
    errEl.textContent = "";
    const r = await tryUnlock(input.value);
    if (r.ok) {
      showApp();
    } else {
      errEl.textContent = r.error;
      input.value = "";
      input.focus();
    }
  };
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
}

// 入口逻辑
(async () => {
  // 没设密码 → 跳过密码门
  if (!PASSWORD_SHA256) {
    showApp();
    return;
  }
  // 当前会话已认证 → 直接进
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showApp();
    return;
  }
  // 显示密码门
  document.getElementById("gateMask").style.display = "";
  bind();
})();

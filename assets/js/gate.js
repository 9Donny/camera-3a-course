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
  // 优先用浏览器原生（HTTPS / localhost 可用）
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    try {
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      // 落到下面的 JS 实现
    }
  }
  return sha256Fallback(text);
}

// 纯 JS SHA-256（约 70 行，覆盖 HTTP 局域网场景）
function sha256Fallback(text) {
  // UTF-8 编码
  function utf8Bytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6)); out.push(0x80 | (c & 0x3f)); }
      else if (c < 0xd800 || c >= 0xe000) { out.push(0xe0 | (c >> 12)); out.push(0x80 | ((c >> 6) & 0x3f)); out.push(0x80 | (c & 0x3f)); }
      else { i++; c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff)); out.push(0xf0 | (c >> 18)); out.push(0x80 | ((c >> 12) & 0x3f)); out.push(0x80 | ((c >> 6) & 0x3f)); out.push(0x80 | (c & 0x3f)); }
    }
    return out;
  }
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = utf8Bytes(text);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // 8 字节长度（高 4 字节 0）
  for (let i = 0; i < 4; i++) bytes.push(0);
  bytes.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const W = new Array(64);
    for (let i = 0; i < 16; i++) {
      W[i] = (bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) | (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3];
      W[i] >>>= 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i-15],7) ^ rotr(W[i-15],18) ^ (W[i-15] >>> 3);
      const s1 = rotr(W[i-2],17) ^ rotr(W[i-2],19) ^ (W[i-2] >>> 10);
      W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ ((~e) & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
  }
  return H.map(v => v.toString(16).padStart(8, "0")).join("");
}

function showApp() {
  document.getElementById("gateMask").style.display = "none";
  document.getElementById("topbar").style.display = "";
  document.getElementById("layout").style.display = "";

  // 加载版本徽章
  loadVersionBadge();

  // 加载主应用
  const s = document.createElement("script");
  s.type = "module";
  s.src = "assets/js/app.js?v=20";
  document.body.appendChild(s);
}

// 读 /.version 文件显示在右下角徽章
async function loadVersionBadge() {
  const badge = document.getElementById("versionBadge");
  if (!badge) return;
  try {
    const res = await fetch("./.version?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const ver = (await res.text()).trim();
    if (!ver) throw new Error("empty");
    badge.textContent = "v " + ver;
    badge.title = `部署版本 ${ver}\n点击：清缓存重载（拿最新代码）\n注：每次打包/更新自动刷新；如果版本号没变，说明主机还没部署新版本`;
    badge.addEventListener("click", () => {
      // 清所有 ServiceWorker / Cache + 强制重载
      if ("caches" in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
          location.reload();
        });
      } else {
        location.reload();
      }
    });
    // 与上次看到的版本对比，新版本闪一下绿色
    const last = localStorage.getItem("camera3a:lastSeenVersion");
    if (last && last !== ver) {
      badge.classList.add("fresh");
      badge.textContent = "v " + ver + " · 已更新 ✓";
      setTimeout(() => {
        badge.classList.remove("fresh");
        badge.textContent = "v " + ver;
      }, 8000);
    }
    localStorage.setItem("camera3a:lastSeenVersion", ver);
  } catch (e) {
    badge.textContent = "v ?";
    badge.title = "无法读取版本号：" + e.message;
  }
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
    try {
      const r = await tryUnlock(input.value);
      if (r.ok) {
        showApp();
      } else {
        errEl.textContent = r.error;
        input.value = "";
        input.focus();
      }
    } catch (e) {
      errEl.textContent = "错误：" + (e?.message || e);
      console.error("[gate]", e);
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

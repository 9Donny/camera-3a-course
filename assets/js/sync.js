// 坚果云同步引擎
// 数据流：
//   1. 收集本地所有 camera3a:* 的 localStorage 键 → snapshot
//   2. PUT 到 <PROXY_BASE>/dav/camera-3a/sync.json（基本认证 + WebDAV）
//   3. 拉取远端同一文件 → 比较 lastModifiedAt → 合并/覆盖
//
// 冲突策略：键级别 last-write-wins。每个键带 mtime 元数据，谁新用谁的值。
//
// 代理来源：
//   - 本地（localhost / LAN IP）→ 用 server.py 内置代理 /dav-proxy/
//   - 公网（GitHub Pages 等）→ 用 Cloudflare Worker（在同步配置页填写 URL）

import { storage, isGuest } from "./storage.js";

const PREFIX = "camera3a:";

// 访客模式：所有同步操作 no-op，绝对不污染主人坚果云
const GUEST_NOOP = isGuest();
const CFG_KEY = "syncConfig";
const META_KEY = "syncMeta"; // { lastSyncedAt, lastDevice, keyMtimes: { [key]: ms } }

// 默认代理：永远走当前主机的 /dav-proxy（由 server.py 提供）
// 不再依赖 Cloudflare Worker 等海外服务（中国大陆环境下网络层不稳）
// 部署模型：用户在自己的服务器（家里 NAS / VPS / 云主机）跑 server.py，
//   网页和代理同源同主机，浏览器对同源请求无 CORS 限制
const DEFAULT_PROXY_BASE = "/dav-proxy";

// 决定代理 URL：优先用配置里的 proxyBase，否则用默认值
function proxyBase() {
  const cfg = storage.get(CFG_KEY, {});
  const base = (cfg.proxyBase || DEFAULT_PROXY_BASE).replace(/\/+$/, "");
  return base;
}

function davUrl(path) {
  // path 形如 "/dav/camera-3a/sync.json"
  return proxyBase() + path;
}

const REMOTE_PATH = "/dav/camera-3a/sync.json"; // 不带 proxy 前缀，运行时拼

// 不参与同步的本地键（视图临时态、跳过标记等）
const EXCLUDE = new Set([
  "syncConfig",       // 同步配置本身
  "syncMeta",         // 元信息
  "reviewSkippedAt",  // 临时
  "hintDismissed:highlight", // UI 偏好，每端独立 OK
]);

function nowMs() { return Date.now(); }

// 读所有 camera3a:* 键到一个对象（剥掉前缀）
function collectAll() {
  const out = {};
  if (typeof localStorage === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const name = k.slice(PREFIX.length);
    if (EXCLUDE.has(name)) continue;
    try {
      out[name] = JSON.parse(localStorage.getItem(k));
    } catch {
      out[name] = localStorage.getItem(k);
    }
  }
  return out;
}

// 把 obj 的键写回 localStorage（带前缀）
function applyAll(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (EXCLUDE.has(k)) continue;
    try {
      localStorage.setItem(PREFIX + k, JSON.stringify(v));
    } catch (e) {
      console.warn("apply key failed:", k, e);
    }
  }
}

// 公开 API ===================

export const sync = {
  isGuest: () => GUEST_NOOP,

  getConfig() {
    return storage.get(CFG_KEY, {
      enabled: false,
      email: "",
      password: "", // 坚果云应用密码
      device: "",   // 设备名（自定义）
    });
  },

  setConfig(cfg) {
    if (GUEST_NOOP) return; // 访客不允许保存同步配置
    storage.set(CFG_KEY, cfg);
  },

  getMeta() {
    return storage.get(META_KEY, { lastSyncedAt: null, lastDevice: null, keyMtimes: {} });
  },

  setMeta(meta) {
    storage.set(META_KEY, meta);
  },

  // 标记某个键刚被改过 —— 由 storage.js 调用（钩子）或外部代码主动调用
  markDirty(name) {
    if (EXCLUDE.has(name)) return;
    const meta = this.getMeta();
    meta.keyMtimes = meta.keyMtimes || {};
    meta.keyMtimes[name] = nowMs();
    this.setMeta(meta);
  },

  // 测试连接：尝试 PROPFIND 根目录，401 / 5xx → 失败
  async testConnection() {
    if (GUEST_NOOP) throw new Error("访客模式不支持云同步");
    const cfg = this.getConfig();
    if (!cfg.email || !cfg.password) throw new Error("未配置邮箱或密码");
    const auth = "Basic " + btoa(`${cfg.email}:${cfg.password}`);
    const res = await fetch(davUrl("/dav/"), {
      method: "PROPFIND",
      headers: { Authorization: auth, Depth: "0" },
    });
    if (res.status === 401) throw new Error("认证失败：邮箱或应用密码错误");
    if (!res.ok && res.status !== 207) throw new Error(`HTTP ${res.status}`);
    return true;
  },

  // 确保远端目录存在
  async _ensureFolder(auth) {
    // MKCOL 返回 405（已存在）或 201（新建）都可以
    await fetch(davUrl("/dav/camera-3a/"), {
      method: "MKCOL",
      headers: { Authorization: auth },
    }).catch(() => {});
  },

  // 上传当前本地状态
  async push() {
    if (GUEST_NOOP) return { uploadedKeys: 0, skipped: "guest" };
    const cfg = this.getConfig();
    if (!cfg.email || !cfg.password) throw new Error("未配置同步");
    const auth = "Basic " + btoa(`${cfg.email}:${cfg.password}`);
    await this._ensureFolder(auth);

    const meta = this.getMeta();
    // 给所有当前本地的键补全 mtime（如果之前没记录过）
    // 避免出现远端 mtime=0 的情况，使后续合并算法能正常工作
    const data = collectAll();
    const mtimes = { ...(meta.keyMtimes || {}) };
    const now = nowMs();
    for (const k of Object.keys(data)) {
      if (!mtimes[k]) mtimes[k] = now;
    }
    meta.keyMtimes = mtimes;
    this.setMeta(meta);

    const snapshot = {
      version: 1,
      device: cfg.device || "unknown",
      uploadedAt: nowMs(),
      keyMtimes: mtimes,
      data,
    };

    const body = JSON.stringify(snapshot);
    const res = await fetch(davUrl(REMOTE_PATH), {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body,
    });
    if (!res.ok && res.status !== 201 && res.status !== 204) {
      throw new Error(`上传失败 HTTP ${res.status}`);
    }
    meta.lastSyncedAt = nowMs();
    meta.lastDevice = cfg.device || "unknown";
    this.setMeta(meta);
    return { uploadedKeys: Object.keys(snapshot.data).length };
  },

  // 拉取远端 + 合并到本地
  // 合并规则：每个键比较 mtime，远端新就用远端，本地新就保留
  async pull() {
    if (GUEST_NOOP) return { downloadedKeys: 0, skipped: "guest" };
    const cfg = this.getConfig();
    if (!cfg.email || !cfg.password) throw new Error("未配置同步");
    const auth = "Basic " + btoa(`${cfg.email}:${cfg.password}`);
    // 顺手保证目录存在（首次 pull 时坚果云会 409）
    await this._ensureFolder(auth);

    const res = await fetch(davUrl(REMOTE_PATH), {
      method: "GET",
      headers: { Authorization: auth },
    });
    // 404 = 文件不存在；409 = 上级目录不存在
    if (res.status === 404 || res.status === 409) {
      return { downloadedKeys: 0, fresh: true }; // 远端还没数据
    }
    if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);

    const remote = await res.json();
    if (!remote || typeof remote !== "object" || !remote.data) {
      throw new Error("远端文件格式错误");
    }

    const localMeta = this.getMeta();
    const localMtimes = localMeta.keyMtimes || {};
    const remoteMtimes = remote.keyMtimes || {};
    const localData = collectAll();

    // 首次 pull（本地从未同步过）：把远端当权威，整体覆盖本地
    // 避免因为本地 mtime 都是 0、远端 mtime 也是 0，合并时谁都不胜导致数据没拉进来
    const isFirstPull = !localMeta.lastSyncedAt;

    let updated = 0;
    const merged = { ...localData };
    for (const [k, v] of Object.entries(remote.data)) {
      if (EXCLUDE.has(k)) continue;
      if (isFirstPull) {
        merged[k] = v;
        localMtimes[k] = remoteMtimes[k] || nowMs();
        updated += 1;
        continue;
      }
      const lm = localMtimes[k] || 0;
      const rm = remoteMtimes[k] || 0;
      // 远端新 OR 本地不存在
      if (rm > lm || !(k in localData)) {
        merged[k] = v;
        localMtimes[k] = rm || nowMs();
        updated += 1;
      }
    }
    applyAll(merged);

    localMeta.keyMtimes = localMtimes;
    localMeta.lastSyncedAt = nowMs();
    this.setMeta(localMeta);

    return { downloadedKeys: updated, fresh: false, firstPull: isFirstPull, remoteDevice: remote.device, remoteUploadedAt: remote.uploadedAt };
  },

  // 完整 sync = 先确保目录 → pull 远端合并 → push 自己
  async syncNow() {
    if (GUEST_NOOP) return { skipped: "guest", at: nowMs() };
    const cfg = this.getConfig();
    if (!cfg.email || !cfg.password) throw new Error("未配置同步");
    const auth = "Basic " + btoa(`${cfg.email}:${cfg.password}`);
    // 首次同步时坚果云没有 camera-3a/ 目录，pull 会 409。先建目录。
    await this._ensureFolder(auth);
    const pullResult = await this.pull();
    const pushResult = await this.push();
    return { pull: pullResult, push: pushResult, at: nowMs() };
  },
};

// 钩子：劫持原 storage.set，写入时记录 mtime + 触发 debounce 同步
export function installAutoSync(opts = {}) {
  // 访客模式：完全不安装钩子，所有写入直接落盘，不会触发任何网络请求
  if (GUEST_NOOP) {
    return { resetAuthBlock: () => {} };
  }
  const debounceMs = opts.debounceMs ?? 2000;
  let timer = null;
  let authBlocked = false; // 认证失败后熔断，防止反复 401 弹窗

  const origSet = storage.set.bind(storage);
  storage.set = (name, value) => {
    const ok = origSet(name, value);
    sync.markDirty(name);
    // 配置自身的变更不触发自动同步（避免循环）
    if (!authBlocked && sync.getConfig().enabled && !EXCLUDE.has(name) && name !== CFG_KEY && name !== META_KEY) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sync.syncNow().then(r => {
          if (r && opts.onSuccess) opts.onSuccess(r);
        }).catch(e => {
          console.warn("auto-sync failed:", e.message);
          // 401 = 应用密码失效，停止自动同步避免反复弹原生登录框
          if (/401|认证|认证失败/.test(e.message || "")) {
            authBlocked = true;
            console.warn("[sync] auth failed, auto-sync paused. Update password in #/sync to resume.");
          }
          if (opts.onError) opts.onError(e);
        });
      }, debounceMs);
    }
    return ok;
  };

  // 用户在 #/sync 重新保存配置时调一下，恢复自动同步
  return {
    resetAuthBlock: () => { authBlocked = false; },
  };
}

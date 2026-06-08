// 同步设置页：填邮箱、应用密码、设备名、测试连接、立即同步
import { sync } from "../sync.js";
import { activePrefix } from "../storage.js";

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function escapeAttr(s) { return escapeHTML(s); }

function fmtTime(ms) {
  if (!ms) return "从未";
  const d = new Date(ms);
  return d.toLocaleString("zh-CN", { hour12: false });
}

// 导入导出：纯本地操作，不走网络。访客也能用。
const EXPORT_EXCLUDE = new Set(["syncConfig", "syncMeta"]);

function exportAllJSON() {
  const prefix = activePrefix();
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const name = k.slice(prefix.length);
    if (EXPORT_EXCLUDE.has(name)) continue;
    try {
      out[name] = JSON.parse(localStorage.getItem(k));
    } catch {
      out[name] = localStorage.getItem(k);
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    isGuest: sync.isGuest(),
    keys: Object.keys(out).length,
    data: out,
  };
}

function importAllJSON(payload) {
  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("文件格式不对：缺少 data 字段");
  }
  const prefix = activePrefix();
  let n = 0;
  for (const [k, v] of Object.entries(payload.data)) {
    if (EXPORT_EXCLUDE.has(k)) continue;
    try {
      localStorage.setItem(prefix + k, JSON.stringify(v));
      n++;
    } catch (e) {
      console.warn("import key failed:", k, e);
    }
  }
  return n;
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const DATA_PORTAL_HTML = `
  <div class="card">
    <h3>📤 数据导入导出（本地备份）</h3>
    <p class="muted">把全部学习数据（笔记 / 进度 / 卡片 / 打卡 / 学习时长）打包成一个 JSON 文件下载，或从 JSON 文件导入到当前浏览器。访客模式建议定期导出备份。</p>
    <div class="sync-actions">
      <button class="btn" id="btnExportAll">📤 导出全部数据</button>
      <label class="btn secondary" for="fileImportAll">📥 导入数据</label>
      <input type="file" id="fileImportAll" accept="application/json,.json" style="display:none">
    </div>
    <div class="muted" style="font-size:12px;margin-top:8px">导入会<strong>覆盖</strong>同名数据。建议先导出当前数据备份再导入。</div>
  </div>
`;

function bindDataPortal(setStatus) {
  const btnExport = document.getElementById("btnExportAll");
  const fileImport = document.getElementById("fileImportAll");
  if (!btnExport || !fileImport) return;

  btnExport.addEventListener("click", () => {
    const payload = exportAllJSON();
    const stamp = new Date().toISOString().slice(0, 10);
    const tag = sync.isGuest() ? "guest-" : "";
    downloadFile(`camera3a-${tag}backup-${stamp}.json`, JSON.stringify(payload, null, 2));
    setStatus(`✅ 已导出 ${payload.keys} 项数据`, "ok");
  });

  fileImport.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setStatus("❌ 不是合法 JSON 文件", "err");
      e.target.value = "";
      return;
    }
    if (!confirm(`确定导入这个文件吗？将覆盖当前同名数据。\n\n文件包含 ${(payload.data && Object.keys(payload.data).length) || "?"} 项数据。`)) {
      e.target.value = "";
      return;
    }
    try {
      const n = importAllJSON(payload);
      setStatus(`✅ 已导入 ${n} 项数据，刷新页面查看`, "ok");
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      setStatus("❌ 导入失败：" + err.message, "err");
    } finally {
      e.target.value = "";
    }
  });
}

export function renderSync(content) {
  const cfg = sync.getConfig();
  const meta = sync.getMeta();

  // 访客模式：所有同步功能不可用，显示提示页
  if (sync.isGuest()) {
    content.innerHTML = `
      <h1>☁️ 坚果云同步</h1>
      <div class="card sync-warn">
        <h3>👤 访客模式 · 同步不可用</h3>
        <p>你正在以访客身份浏览课程。访客模式下：</p>
        <ul>
          <li>✅ 学习进度、笔记、记忆卡片都正常工作</li>
          <li>✅ 数据存在当前浏览器（localStorage）</li>
          <li>❌ <strong>不会同步到云端</strong>（避免污染分享者的数据）</li>
          <li>⚠️ 清浏览器缓存数据会丢，建议定期用「📤 数据导入导出」备份</li>
        </ul>
        <p class="muted" style="margin-top:16px">想长期学习？建议自己注册一个坚果云账号，然后从这个页面退出（关闭标签页），用 <strong>不带 ?guest=1 的 URL</strong> 重新打开，就能配置自己的同步了。</p>
      </div>
      ${DATA_PORTAL_HTML}
      <div class="sync-status" id="syncStatus"></div>
    `;
    const status = document.getElementById("syncStatus");
    function setStatus(msg, kind = "info") {
      status.className = `sync-status ${kind}`;
      status.textContent = msg;
    }
    bindDataPortal(setStatus);
    return;
  }

  content.innerHTML = `
    <h1>☁️ 坚果云同步</h1>
    <p class="muted">把学习数据（笔记/进度/卡片/打卡/记录）同步到坚果云，多设备接力学习。</p>

    <div class="card sync-help">
      <h3>📌 第一次配置：怎么拿应用密码</h3>
      <ol>
        <li>登录 <a href="https://www.jianguoyun.com/" target="_blank" rel="noopener">坚果云网页</a> → 右上角头像 → <strong>账户信息</strong></li>
        <li>左边菜单 → <strong>安全选项</strong></li>
        <li>找到「第三方应用管理」→ 点 <strong>添加应用</strong> → 名字填 <code>Camera 3A 课程</code></li>
        <li>复制生成的 <strong>密码</strong>（注意：不是登录密码）</li>
        <li>邮箱填登录坚果云的邮箱，密码填上面那串</li>
      </ol>
    </div>

    <div class="card">
      <h3>同步配置</h3>
      <form id="syncForm">
        <label class="sync-field">
          <span>坚果云邮箱</span>
          <input type="email" id="syncEmail" value="${escapeAttr(cfg.email)}" placeholder="you@example.com" autocomplete="off">
        </label>
        <label class="sync-field">
          <span>应用密码</span>
          <input type="password" id="syncPassword" value="${escapeAttr(cfg.password)}" placeholder="坚果云应用密码（不是登录密码）" autocomplete="off">
        </label>
        <label class="sync-field">
          <span>设备名</span>
          <input type="text" id="syncDevice" value="${escapeAttr(cfg.device)}" placeholder="例如：Mac / 手机 / 公司电脑" autocomplete="off">
        </label>
        <label class="sync-field">
          <span>WebDAV 代理地址（高级 — 一般留空，自动用当前主机的 server.py）</span>
          <input type="text" id="syncProxy" value="${escapeAttr(cfg.proxyBase || "")}" placeholder="留空 = /dav-proxy（同源走 server.py）；特殊场景才填外部 URL" autocomplete="off">
        </label>
        <label class="sync-field sync-toggle">
          <input type="checkbox" id="syncEnabled" ${cfg.enabled ? "checked" : ""}>
          <span>启用自动同步（每次写入后 2 秒延时上传）</span>
        </label>
      </form>
      <div class="sync-actions">
        <button class="btn secondary" id="btnTest">🔌 测试连接</button>
        <button class="btn secondary" id="btnSave">💾 保存配置</button>
        <button class="btn" id="btnSync">⟳ 立即同步</button>
      </div>
      <div class="sync-status" id="syncStatus"></div>
    </div>

    <div class="card">
      <h3>📲 分享配置给其他设备（你自己的设备）</h3>
      <p class="muted">生成一个一次性链接，在另一台设备打开就会自动配置邮箱密码、自动同步，不用手动填。链接里包含敏感信息，仅用于在你自己的设备间传递。</p>
      <div class="sync-actions">
        <button class="btn" id="btnShare">📲 生成分享链接</button>
        <button class="btn secondary" id="btnCopy" style="display:none">📋 复制链接</button>
      </div>
      <div class="share-link-wrap" id="shareWrap" style="display:none">
        <div class="share-tip">复制下面这个链接，通过微信/AirDrop 发到另一台设备，点击打开就完成配置：</div>
        <textarea class="share-link" id="shareLink" readonly></textarea>
        <div class="share-warn">⚠️ 链接含邮箱+应用密码（base64 编码），请通过私密渠道发送，不要发到公开群聊。</div>
      </div>
    </div>

    <div class="card">
      <h3>👤 分享给朋友试用（访客模式）</h3>
      <p class="muted">朋友打开这个链接进入「访客模式」：能看到全部 60 天课程内容、能记笔记做小测，但数据只存他自己的浏览器，<strong>不会同步到你的坚果云</strong>，不会动你的进度。</p>
      <div class="sync-actions">
        <button class="btn" id="btnShareGuest">🔗 生成访客链接</button>
        <button class="btn secondary" id="btnCopyGuest" style="display:none">📋 复制链接</button>
      </div>
      <div class="share-link-wrap" id="guestWrap" style="display:none">
        <div class="share-tip">这个链接<strong>不含任何敏感信息</strong>，可以放心发到群里 / 朋友圈：</div>
        <textarea class="share-link" id="guestLink" readonly></textarea>
        <div class="muted" style="font-size:12px;margin-top:8px">访客打开后顶栏会显示「👤 访客模式」标识。</div>
      </div>
    </div>

    <div class="card">
      <h3>同步状态</h3>
      <div>上次同步：<strong>${fmtTime(meta.lastSyncedAt)}</strong></div>
      <div>上次设备：<strong>${escapeHTML(meta.lastDevice ?? "—")}</strong></div>
      <div class="muted" style="margin-top:8px;font-size:12px">已记录 ${Object.keys(meta.keyMtimes || {}).length} 个键的修改时间</div>
    </div>

    ${DATA_PORTAL_HTML}

    <div class="card sync-warn">
      <h3>⚠️ 注意事项</h3>
      <ul>
        <li>同步走 WebDAV 协议，本地通过 <code>server.py</code> 代理（绕过浏览器 CORS）。如果你用 <code>python3 -m http.server</code> 启动，同步功能不可用。</li>
        <li>邮箱密码存在浏览器 localStorage，<strong>不要</strong>在公共电脑使用。</li>
        <li>冲突策略：每个键比对修改时间，谁新用谁。同时在两台设备改同一个笔记可能有覆盖风险。</li>
        <li>远端文件路径：<code>/我的坚果云/camera-3a/sync.json</code>，可以在坚果云网页直接看到这个文件。</li>
      </ul>
    </div>
  `;

  const status = document.getElementById("syncStatus");

  function setStatus(msg, kind = "info") {
    status.className = `sync-status ${kind}`;
    status.textContent = msg;
  }

  function readForm() {
    return {
      email: document.getElementById("syncEmail").value.trim(),
      password: document.getElementById("syncPassword").value,
      device: document.getElementById("syncDevice").value.trim(),
      proxyBase: document.getElementById("syncProxy").value.trim().replace(/\/+$/, ""),
      enabled: document.getElementById("syncEnabled").checked,
    };
  }

  document.getElementById("btnSave").addEventListener("click", () => {
    const newCfg = readForm();
    sync.setConfig(newCfg);
    setStatus("✅ 配置已保存", "ok");
  });

  document.getElementById("btnTest").addEventListener("click", async () => {
    const newCfg = readForm();
    sync.setConfig(newCfg);
    setStatus("🔌 测试中…", "info");
    try {
      await sync.testConnection();
      setStatus("✅ 连接成功！邮箱和应用密码正确", "ok");
    } catch (e) {
      setStatus(`❌ ${e.message}`, "err");
    }
  });

  document.getElementById("btnSync").addEventListener("click", async () => {
    const newCfg = readForm();
    sync.setConfig(newCfg);
    if (!newCfg.email || !newCfg.password) {
      setStatus("❌ 请先填邮箱和应用密码", "err");
      return;
    }
    setStatus("⟳ 同步中…", "info");
    try {
      const r = await sync.syncNow();
      setStatus(`✅ 同步完成：拉取 ${r.pull.downloadedKeys} 项，上传 ${r.push.uploadedKeys} 项`, "ok");
      // 刷新页面状态
      setTimeout(() => renderSync(content), 1200);
    } catch (e) {
      setStatus(`❌ 同步失败：${e.message}`, "err");
    }
  });

  // 生成分享链接
  const btnShare = document.getElementById("btnShare");
  const btnCopy = document.getElementById("btnCopy");
  const shareWrap = document.getElementById("shareWrap");
  const shareLink = document.getElementById("shareLink");

  btnShare.addEventListener("click", () => {
    const cfg = readForm();
    if (!cfg.email || !cfg.password) {
      setStatus("❌ 请先填好邮箱和应用密码再生成链接", "err");
      return;
    }
    sync.setConfig(cfg);
    const payload = JSON.stringify({
      email: cfg.email,
      password: cfg.password,
      device: "",
      proxyBase: cfg.proxyBase || "",
    });
    const b64 = btoa(unescape(encodeURIComponent(payload)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    // 关键：当前 host 如果是 localhost / 127.0.0.1，手机打开链接会指向手机自己
    // 让用户提供 Mac 的局域网 IP 地址（记住到 localStorage 下次直接用）
    let host = location.host;
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    if (isLocal) {
      const remembered = localStorage.getItem("camera3a:lanHost") || "";
      const port = location.port || "8080";
      const placeholder = remembered || `192.168.x.x:${port}`;
      const input = prompt(
        "你当前用 localhost 打开课程，手机用这个链接会连到自己（不是 Mac）。\n\n" +
        "请输入 Mac 的局域网 IP 地址 + 端口，比如 192.168.31.72:8080\n" +
        "（在 Mac 终端跑：ifconfig | grep \"inet 192\"）\n\n" +
        "下次会记住这个地址。",
        remembered || `192.168.0.0:${port}`
      );
      if (!input) return;
      const cleaned = input.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (!/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(cleaned) && !/^[\w-]+(\.[\w-]+)+(:\d+)?$/.test(cleaned)) {
        setStatus(`❌ 地址格式不对：${cleaned}（应该像 192.168.31.72:8080）`, "err");
        return;
      }
      host = cleaned.includes(":") ? cleaned : `${cleaned}:${port}`;
      localStorage.setItem("camera3a:lanHost", host);
    }

    const url = `${location.protocol}//${host}${location.pathname}?syncconfig=${b64}#/sync`;
    shareLink.value = url;
    shareWrap.style.display = "block";
    btnCopy.style.display = "inline-block";
    shareLink.focus();
    shareLink.select();
  });

  btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareLink.value);
      setStatus("✅ 已复制到剪贴板，发到另一台设备打开即可", "ok");
    } catch {
      // 兜底：选中文本让用户手动复制
      shareLink.focus();
      shareLink.select();
      setStatus("ℹ️ 浏览器不支持自动复制，请在框中手动 Cmd+C / Ctrl+C 复制", "info");
    }
  });

  // === 访客链接分享 ===
  const btnShareGuest = document.getElementById("btnShareGuest");
  const btnCopyGuest = document.getElementById("btnCopyGuest");
  const guestWrap = document.getElementById("guestWrap");
  const guestLink = document.getElementById("guestLink");

  function buildGuestUrl() {
    const origin = location.origin + location.pathname;
    return origin + "?guest=1";
  }

  btnShareGuest.addEventListener("click", () => {
    guestLink.value = buildGuestUrl();
    guestWrap.style.display = "block";
    btnCopyGuest.style.display = "inline-block";
    setStatus("✅ 访客链接已生成，可以放心发给朋友", "ok");
  });

  btnCopyGuest.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(guestLink.value);
      setStatus("✅ 访客链接已复制，发给朋友即可", "ok");
    } catch {
      guestLink.focus();
      guestLink.select();
      setStatus("ℹ️ 请手动 Cmd+C / Ctrl+C 复制", "info");
    }
  });

  // === 数据导入导出（本地，不走云）===
  bindDataPortal(setStatus);
}

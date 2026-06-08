// 同步设置页：填邮箱、应用密码、设备名、测试连接、立即同步
import { sync } from "../sync.js";

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function escapeAttr(s) { return escapeHTML(s); }

function fmtTime(ms) {
  if (!ms) return "从未";
  const d = new Date(ms);
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function renderSync(content) {
  const cfg = sync.getConfig();
  const meta = sync.getMeta();

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
          <span>WebDAV 代理地址（高级 — 留空走默认；公网默认走 Cloudflare Worker 自定义域名）</span>
          <input type="text" id="syncProxy" value="${escapeAttr(cfg.proxyBase || "")}" placeholder="留空 = 自动选择（本地用 server.py / 公网用 https://camera3a.aicourse0.xyz）" autocomplete="off">
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
      <h3>📲 分享配置给其他设备</h3>
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
      <h3>同步状态</h3>
      <div>上次同步：<strong>${fmtTime(meta.lastSyncedAt)}</strong></div>
      <div>上次设备：<strong>${escapeHTML(meta.lastDevice ?? "—")}</strong></div>
      <div class="muted" style="margin-top:8px;font-size:12px">已记录 ${Object.keys(meta.keyMtimes || {}).length} 个键的修改时间</div>
    </div>

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
}

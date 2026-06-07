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
}

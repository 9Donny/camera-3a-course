# 部署到公网指南

让你拿到一个固定 URL（如 `https://your-username.github.io/camera-3a-course/`），任何设备 / 任何网络都能开。

整个过程**全免费**，需要 **30-45 分钟**，主要是注册账号 + 点按钮。一次配好以后再也不用动。

---

## 总览

```
┌─────────────────────────────────────┐
│  GitHub Pages（HTML/JS/CSS 托管）   │
│  https://your-username.github.io/...       │
└─────────────────────────────────────┘
              │
              ↓ 浏览器同步请求
┌─────────────────────────────────────┐
│  Cloudflare Worker（CORS 代理）     │
│  https://*.workers.dev              │
└─────────────────────────────────────┘
              │
              ↓ 转发到坚果云
┌─────────────────────────────────────┐
│  坚果云 WebDAV                      │
└─────────────────────────────────────┘
```

---

## Step 1：在 GitHub 创建仓库（5 分钟）

1. 浏览器打开 https://github.com，登录 `your-username` 账号
2. 右上角 ➕ → **New repository**
3. **Repository name** 填：`camera-3a-course`（或你喜欢的名字）
4. **Public**（必须公开，私有要 Pro 才能用 Pages）
5. **不要**勾任何 "Add a README / .gitignore / license"（我们已经有了）
6. 点 **Create repository**
7. 创建后，页面会显示一段 `git remote add origin ...`，复制下来

## Step 2：把课程推到这个仓库（5 分钟）

回到 Mac 终端：

```bash
cd /Users/mi/3A

# 关联远端
git remote add origin https://github.com/your-username/camera-3a-course.git

# 推送
git push -u origin main
```

第一次会让你输 GitHub 用户名 + **Personal Access Token**（不是登录密码）。

如果没 token：
- GitHub 网页右上角头像 → **Settings** → 左下 **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
- Note 填 `git push`，Expiration 选 90 天，勾选 **repo** 整个分类
- 生成 → 复制 token（只显示一次）→ 终端粘贴当作密码

或者更简单：装 [GitHub Desktop](https://desktop.github.com/)，登录账号后图形化推送。

## Step 3：开启 GitHub Pages（2 分钟）

1. 仓库页面 → **Settings** 标签
2. 左边菜单 → **Pages**
3. **Source** 选 **GitHub Actions**（不是 Deploy from a branch）
4. 保存

页面会出现一行字：「Your site is ready to be deployed」。

回到仓库页面顶部的 **Actions** 标签 —— 应该看到一个 workflow 在运行（黄色转圈）。等 1-2 分钟变绿。

✅ 变绿后，你的课程站点就可以访问了：

```
https://your-username.github.io/camera-3a-course/
```

打开试试 —— 应该看到密码门。**但同步功能现在是坏的**（因为没有代理）。下面 Step 4-7 解决同步。

## Step 4：注册 Cloudflare 账号（4 分钟）

1. 浏览器打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册，验证邮箱
3. 登录后会让你「添加站点」—— **跳过**，我们不需要给域名加速，只用 Workers

## Step 5：创建 Worker（5 分钟）

1. Cloudflare Dashboard 左边菜单 → **Workers & Pages**
2. 点 **Create application** → **Create Worker**
3. 名字填：`camera3a-sync`（自定义，会变成 URL 一部分）
4. 点 **Deploy**
5. 部署成功后页面有个「Edit code」按钮 → 点
6. 进入代码编辑器，把所有默认代码**删掉**
7. 把 `deploy/cloudflare-worker.js` 文件**全部内容**复制粘贴进去
8. 右上 **Save and Deploy**

回到 Worker 详情页，顶部有个 URL，类似：

```
https://camera3a-sync.你的子域名.workers.dev
```

**复制这个 URL**，下面要用。

## Step 6：测试 Worker

在浏览器直接打开这个 URL，应该看到：

```
Camera 3A WebDAV proxy. Forwarding to dav.jianguoyun.com.
Usage: https://...workers.dev/dav/...
```

看到这个文字就说明 Worker 跑起来了。

## Step 7：在课程同步页填代理地址

1. 打开 GitHub Pages 课程站点：`https://your-username.github.io/camera-3a-course/`
2. 输密码 → 进入 → 自动跳同步页（新设备）
3. 邮箱、应用密码、设备名照常填
4. **WebDAV 代理地址** 这一行填：
   ```
   https://camera3a-sync.你的子域名.workers.dev
   ```
   （Step 5 拿到的 Worker URL）
5. 保存
6. 点 🔌 测试连接 → ✅
7. 点 ⟳ 立即同步 → 拉到你 Mac 之前同步上去的所有数据

🎉 **完成！** 之后任何设备打开 `https://your-username.github.io/camera-3a-course/`，输密码 → 配置同步（用同样的 Worker URL）→ 立即同步 → 就能接力学习。

---

## 常见问题

### Q：Worker 免费吗？会用完吗？
A：免费版每天 10 万次请求。同步一次约 5 次请求，每天同步 100 次也才 500 次，**用一辈子都用不完**。

### Q：以后改了课程内容怎么办？
A：在 Mac 编辑文件 → `git push` → GitHub Actions 自动重新部署，1-2 分钟生效。任何设备刷新就看到新内容。

### Q：本地（Mac）开发还能用吗？
A：能。本地用 `python3 server.py` 启动时，同步代理地址留空 → 自动用本地代理。
公网部署是另一份独立的 URL，本地开发不影响。

### Q：手机端打开 GitHub Pages URL 会被某些 Wi-Fi 拦截吗？
A：极少。GitHub Pages 用全球 CDN，国内访问偶有慢但能开。如果你在中国大陆遇到非常慢，可以考虑改用 Cloudflare Pages（步骤类似但更快）。

### Q：能用自己的域名替换 `your-username.github.io` 吗？
A：能。买个域名（如 `learncamera.xyz`）→ 在仓库 Settings → Pages → Custom domain 填进去 → DNS 加 CNAME 指向 GitHub。这步不必着急，有需要再做。

### Q：把 Worker URL 公开会怎样？
A：别人会用你的免费配额，但不能访问你的坚果云数据（因为他们没你的应用密码）。如果担心，把 `cloudflare-worker.js` 里的 `ALLOWED_ORIGINS` 改成 `["https://your-username.github.io"]`，只允许你的 Pages 域名调用。

### Q：密码怎么改？
A：和本地版一样：编辑 `assets/js/gate.js` 里的 `PASSWORD_SHA256` → push → 生效。

```bash
echo -n "新密码" | shasum -a 256
```

### Q：忘了刚才的 Worker URL 怎么办？
A：Cloudflare Dashboard → Workers & Pages → 点你的 Worker 名字 → 顶部就是 URL。

---

## 未来如果想更彻底

1. **加 PWA**：手机访问后可以「添加到主屏」像 app 一样用。我可以补
2. **限制 Worker 来源**：把 `ALLOWED_ORIGINS` 改成你的 GitHub Pages 域名，防止 Worker 被滥用
3. **启用 GitHub Pages 自定义域名**：拿到 `learncamera.xyz` 这种自己的域名

这些都是可选的优化，**核心已经能用**。

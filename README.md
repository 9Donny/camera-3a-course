# 📷 Camera 3A Tuning · 60 天转岗课程

> 个人学习用静态网站。所有内容都在浏览器本地运行，无需联网，无需服务器。
> 课程目标：从手机测试工程师转 Camera Tuning 工程师。

## 当前可用范围

- ✅ Week 1（Day 1-7）：光学与 Camera 硬件入门 — 全部内容、配图、题库就绪
- ✅ 艾宾浩斯记忆系统：40 张初始卡片 + SM-2 简化算法 + 强制复习闸门
- 🚧 Week 2-8：陆续补充

## 如何启动

### 在 Mac 上
```bash
cd /path/to/3A
python3 -m http.server 8080
```
浏览器打开 http://localhost:8080/

### 在 Windows 上
1. 把整个 `3A` 文件夹复制到 Windows（U 盘 / 网盘 / OneDrive 都行）
2. 装 Python（[官网下载](https://www.python.org/downloads/)，安装时勾选 "Add Python to PATH"）
3. 在 PowerShell 里 `cd` 到课程文件夹
4. 运行 `python -m http.server 8080`
5. 浏览器打开 http://localhost:8080/

> **不能直接双击 `index.html`** —— 浏览器对 ES Module 在 `file://` 协议下有限制，必须用 HTTP server。

## 学习路径

```
每天打开 #/today
  ↓
读 5 个章节（每节末尾有「📚 延伸学习」可展开看 FAQ/视频/阅读）
  ↓
途中任意句子选中 → 弹「📌 收藏到笔记」按钮
  ↓
读完点底部「📝 写笔记」自己整理今日所得
  ↓
点「📊 今日小测」做 5 题（含简答题自评）
  ↓
点「✅ 完成本日学习」打卡 + 解锁明天 + 进日报
  ↓
周日做 Week 1 周考（15 题，含 4 道 PRD 面试题）
```

## 主要功能

| 模块 | 入口 | 用法 |
|---|---|---|
| 📚 总览 | 左侧导航 | 60 天地图，看整体进度，点 Day 看学习目标 |
| 📅 今日 | 左侧导航 / 直接访问 | 今天的课程（如有到期卡片会先跳复习） |
| 🧠 复习 | 左侧导航（红色角标显示到期数）| 艾宾浩斯卡片复习，三档评分 |
| 📝 笔记 | 左侧导航 / 今日页底部 | Markdown 自动保存，按 Day 归档 |
| 📊 考核 | 左侧导航 | 每日小测 + 每周周考 |
| 📈 日报 | 左侧导航 / 完成本日后自动进 | 当天进度 + 笔记摘要 + 模块正确率 |
| 🎯 薄弱项 | 左侧导航 | 7 个模块的正确率柱状图 + 复习推荐 |

### 🧠 复习模块（艾宾浩斯记忆曲线）

每天卡片到期后**进入今日学习前自动跳到复习页**，复习完再进新课。

- **三档评分**：忘了（重置）/ 模糊（保持）/ 记得（间隔翻倍）
- **键盘快捷键**：Space 翻面，1=忘了 2=模糊 3=记得
- **间隔阶梯**：0 → 1 → 3 → 7 → 15 → 30 天（封顶）
- **紧急跳过**：复习页底部「跳过本次复习」记录今日跳过标记，避免反复弹
- **40 张初始卡片**：覆盖 Day 1-7 全部知识点 + 5 道 PRD 面试题

### 今日学习页的小工具

| 功能 | 触发方式 |
|---|---|
| 🔊 全文/单节朗读 | 顶部工具栏 / 每节标题旁的 🔊 |
| 调节朗读速度 | 工具栏速度选择 0.8× ~ 2.0× |
| 📌 划词收藏到笔记 | 选中任意文字（≥3 字） → 弹按钮 |
| 📊 阅读进度 + 章节 TOC | 右侧悬浮（屏幕宽度 ≥ 1100px 显示） |
| 📚 章节末延伸学习 | 每节最末「点击展开」蓝色抽屉 |

### 顶栏 dashboard

显示：你好 [昵称] · 今天日期 · Day N/60 · 自适应鼓励语 · 🔥 连续打卡 · 今日打卡状态

第一次访问会询问昵称（可跳过用「学员」），之后点 ✎ 随时改。

## 数据备份（重要）

所有学习进度、笔记、考核记录都存在**浏览器** localStorage 里。如果清浏览器缓存或换浏览器，数据会丢失。

**每周一次做这件事**：
1. 进入「📝 笔记」页
2. 点「📤 导出 JSON」下载备份文件
3. 把备份文件放进网盘 / OneDrive 等

恢复：在同一页点「📥 导入 JSON」选择备份文件。

## 跨电脑（Mac → Windows）迁移

1. 在 Mac 上点「📤 导出 JSON」备份笔记
2. 把整个 `3A` 文件夹复制到 Windows
3. 在 Windows 上启动课程，进入「笔记」页点「📥 导入 JSON」
4. 进度 / 考核记录暂不支持导出（后续会补），建议**从一开始就只在 Win 上学**避免跨设备同步麻烦

## 目录结构

```
3A/
├── index.html                  # 入口
├── README.md                   # 本文件
├── package.json                # ESM 配置（无依赖）
├── PRD.txt                     # 项目最初的需求和面试题
├── assets/
│   ├── css/                    # 样式（深色专业风）
│   ├── js/                     # 应用代码（纯 ES Module）
│   ├── vendor/marked.esm.js    # 内联 Markdown 渲染器
│   └── data/
│       ├── curriculum.json     # 60 天大纲
│       ├── days/day-NN.json    # 每日教学内容（含 SVG 图）
│       └── quizzes/            # 题库
├── tests/                      # node:test 单元测试（44 项）
└── docs/superpowers/
    ├── specs/                  # 设计文档
    └── plans/                  # 实施计划
```

## 反馈

学习过程中遇到错别字 / 内容错误 / 想加补充资料？

直接编辑对应的 `assets/data/days/day-XX.json`，下次刷新页面立即生效。

JSON schema 大致是：

```json
{
  "id": "day-NN",
  "week": 1,
  "module": "M1",
  "title": "...",
  "estimatedMinutes": 240,
  "sections": [
    {
      "id": "s1",
      "title": "章节标题",
      "type": "concept | procedure | example | recap",
      "content": "Markdown 文本（可含 <figure><svg>...）",
      "glossary": [{ "term": "EN", "zh": "中文", "explain": "..." }],
      "extras": {
        "faq": [{ "q": "...", "a": "..." }],
        "videos": [{ "title": "...", "search": "...搜索词" }],
        "reads": [{ "title": "...", "url": "..." }]
      }
    }
  ],
  "references": [{ "source": "...", "url": "..." }],
  "dailyQuizId": "daily-day-NN"
}
```

## 跑测试

```bash
node --test tests/*.test.js
```

预期 44 pass / 0 fail（覆盖 storage / progress / quiz / weakness / validators / router）。

## 后续路线

| 阶段 | 内容 |
|---|---|
| 当前 | Week 1 完整可用 |
| Plan 2（下一步） | 艾宾浩斯记忆系统（每日复习卡片）|
| Plan 3-7 | Week 2-8 内容 |
| Plan 8 | 月考 + 面试题专项 + Mac→Win 部署测试 |

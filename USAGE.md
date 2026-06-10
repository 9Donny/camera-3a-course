# 📷 Camera 3A Tuning · 60 天转岗课程

> 一个针对**高通平台 Camera Tuning（调教）工程师**岗位的 60 天结构化自学课程。
> 纯静态网站，浏览器本地运行，无需联网，无需后端。
> 适合：想从测试 / 算法 / 嵌入式岗位转行 Camera Tuning 的工程师。

## 课程概览

```
Week 1：光学硬件入门              Day 1-7
Week 2：ISP Pipeline 全链路       Day 8-14
Week 3：AEC 第一阶段              Day 15-21
Week 4：AEC 第二阶段              Day 22-28
Week 5：AWB 第一阶段              Day 29-35
Week 6：AWB 第二阶段              Day 36-42
Week 7：AF + Flash + Flicker      Day 43-49
Week 8：色彩 + 工具 + 模拟面试    Day 50-60
```

**60 天完整覆盖**：
- ✅ 60 天每日内容（约 25 万字 + SVG 配图）
- ✅ 60 套日测题（5 题/天，共 300 题）
- ✅ 8 套周考（15 题/周，共 120 题）
- ✅ 263 张记忆卡（艾宾浩斯 SM-2 简化算法）
- ✅ 23 道公开面试题完整答辩（5 场模拟面试）
- ✅ 简历润色 + 投递策略

## 主要功能

- 📅 **顺序学习**：按顺序解锁 Day 1-60，避免跳跃
- 🧠 **艾宾浩斯复习**：每日复习卡片到期才能进入新内容
- 📝 **本地笔记**：每天可记笔记，划词收藏
- 📊 **每日小测 + 周考**：边学边检验
- ☁️ **坚果云 WebDAV 同步**：多终端接力学习（可选）
- 👤 **访客模式**：分享给朋友试用，不污染主同步
- 🔊 **TTS 朗读**：边走边听
- 📈 **学习日报**：每日完成后生成报告
- 🎯 **薄弱模块识别**：错题集中的 3 个 sub-topic 自动标注

## 如何启动

### 在本地（Mac / Linux）
```bash
cd /path/to/3A
python3 server.py
# 浏览器打开 http://localhost:8080/
# 默认密码：camera3a
```

### 部署到自己的服务器（推荐）

```bash
# 1. 打包
bash deploy/self-host/pack.sh
# 输出：dist/camera3a-course-<时间戳>.tar.gz

# 2. 传到你的主机（Linux/Mac/Windows 都支持）
scp dist/camera3a-course-*.tar.gz user@host:~/

# 3. 在主机上解压 + 一键安装
tar -xzf camera3a-course-*.tar.gz
cd camera3a-course-*
sudo bash deploy/self-host/install-linux.sh    # Linux（systemd 自启）
# 或
bash deploy/self-host/install-mac.sh           # Mac（launchd 自启）
# 或
deploy\self-host\install-windows.bat           # Windows（启动项）
```

详细部署文档见 `deploy/self-host/README.md`。

## 项目结构

```
.
├── index.html                  入口
├── server.py                   静态文件 + WebDAV 代理（一体）
├── assets/
│   ├── css/                    样式（暗色主题）
│   ├── js/                     ES Module（无打包，直接 import）
│   │   ├── app.js              路由 + Dashboard
│   │   ├── progress.js         学习进度
│   │   ├── flashcards.js       SM-2 复习
│   │   ├── sync.js             坚果云同步
│   │   ├── tts.js              语音朗读
│   │   └── views/              各页面
│   └── data/
│       ├── curriculum.json     8 周大纲 + 60 天清单
│       ├── days/day-XX.json    每日内容（含 sections / glossary / extras）
│       ├── quizzes/
│       │   ├── daily/          60 套日测
│       │   └── weekly/         8 套周考
│       └── flashcards/week-N.json  每周记忆卡
├── deploy/
│   └── self-host/              自部署脚本（Linux/Mac/Win 三平台）
└── tests/                      单元测试
```

## 数据 schema

每天内容文件 `day-XX.json` 的格式：

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

测验 schema：

```json
{
  "id": "daily-day-NN",
  "title": "...",
  "module": "M1",
  "scope": "daily | weekly",
  "questions": [
    {
      "id": "q1",
      "type": "choice | fill | short",
      "prompt": "...",
      "options": ["..."],
      "answer": "...",
      "referenceAnswer": "...",
      "explain": "..."
    }
  ]
}
```

## 修改内容

### 改文字 / 加章节

直接编辑 `assets/data/days/day-XX.json`，下次刷新页面立即生效。

### 加新一周

1. 添加 `assets/data/days/day-XX.json`
2. 添加 `assets/data/quizzes/daily/daily-day-XX.json`
3. 添加 `assets/data/quizzes/weekly/weekly-wN.json`
4. 添加 `assets/data/flashcards/week-N.json`
5. 在 `assets/data/curriculum.json` 的 `weeks` 和 `days` 数组里加引用
6. 在 `assets/js/app.js` 的 `loadSeedFlashcards()` 把 `week-N` 加到数组

## 跑测试

```bash
node --test tests/*.test.js
```

预期 72+ pass / 0 fail。覆盖 storage / progress / quiz / weakness / validators / router / SRS / sync。

## 课程参考资料

需要自行获取（不在仓库内）：

1. 高通 3A 7.0 Tuning Guide（中文版，约 328 页）
2. 高通 3A 10 Deep Dive（英文版，约 405 页）
3. 维基百科色彩相关条目
4. B 站搜索关键词（每个 day 文件 references 里有）

## 自定义

### 改密码

`assets/js/gate.js` 顶部的 `PASSWORD_SHA256` 改成你密码的 SHA-256 hash。
不需要密码门：把 `PASSWORD_SHA256 = ""` 即可跳过。

### 改主题色

`assets/css/theme.css` 里的 CSS variables。

### 改课程内容

参见上面「修改内容」章节。课程内容主要在 `assets/data/days/`。

## License

MIT License。详见 `LICENSE`。

课程内容基于公开资料 + 公开面试题整理，可自由复用、改编、二次发布。

## 反馈 / 贡献

发现错别字 / 内容错误 / 有补充资料？欢迎 PR 或 issue。

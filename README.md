# 📷 Camera 3A · 60 天转岗课程

> 从手机测试工程师到高通平台 Camera Tuning 工程师的 60 天自学课程。
> 纯静态 HTML/JS/CSS 网页，无需后端，**多终端云同步**，**离线可用**。

[![部署状态](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)](deploy/DEPLOY.md)
[![测试](https://img.shields.io/badge/tests-72%20passing-brightgreen)](#开发)
[![许可](https://img.shields.io/badge/license-MIT-green)](#许可)

---

## 它是什么

如果你想转行做手机相机调教（Camera Tuning）工程师，这套课程提供 60 天系统化学习：

- **目标岗位**：高通平台 Camera Tuning 工程师（AEC / AWB / AF 三个方向）
- **学习节奏**：每天 4 小时 × 60 天 ≈ 240 小时
- **覆盖内容**：光学基础 / 传感器 / ISP Pipeline / 3A 算法 / 色彩科学 / Chromatix 工具
- **配套**：每日小测 + 每周周考 + 艾宾浩斯记忆曲线复习卡

## 当前进度

**60 天全部完成** ✅

| Week | 主题 | 内容 |
|---|---|---|
| Week 1 | 光学与 Camera 硬件入门（Day 1-7）| ✅ 完整 |
| Week 2 | ISP Pipeline 全链路（Day 8-14）| ✅ 完整 |
| Week 3 | AEC 第一阶段（Day 15-21）| ✅ 完整 |
| Week 4 | AEC 第二阶段（Day 22-28）| ✅ 完整 |
| Week 5 | AWB 第一阶段（Day 29-35）| ✅ 完整 |
| Week 6 | AWB 第二阶段（Day 36-42）| ✅ 完整 |
| Week 7 | AF + Flash + Flicker（Day 43-49）| ✅ 完整 |
| Week 8 | 色彩 + 工具 + 模拟面试（Day 50-60）| ✅ 完整 |

**总计**：约 25 万字 + 60 套日测（300 题）+ 8 套周考（120 题）+ 263 张记忆卡 + 23 道公开面试题完整答辩。

## 截图

> _截图待补_。课程界面是深色专业风格，带顶栏 dashboard、左侧导航、阅读进度条、章节 SVG 图、笔记编辑器、复习卡片等。

## 主要功能

- 📚 **60 天学习地图**：按序解锁，进度可视化
- 📅 **每日学习页**：Markdown 教学内容 + 内联 SVG 原理图 + 名词速查
- 📝 **笔记自动保存**：Markdown 编辑器，划词一键收藏到笔记
- 🔊 **语音播报**：浏览器内置 TTS，自适应中英文，可调速
- 📊 **每日小测 + 每周周考**：自动判分（选择/填空），简答题三档自评
- 🧠 **艾宾浩斯记忆系统**：SM-2 算法 + 三档评分，每天进入今日学习前强制复习到期卡片
- 🎯 **薄弱项分析**：模块级正确率统计 + 自动推荐复习章节
- ⏱ **学习时长追踪**：自动检测页面活跃，可视化每日打卡和总时长
- ☁️ **坚果云同步**：多终端接力学习（Mac/Win/手机/平板）
- 🔒 **密码门**：客户端 SHA-256 哈希，防止偶然泄露
- 📲 **PWA-ready**：响应式布局，支持手机/平板

## 快速开始

### 在线访问（公网部署后）

部署到 GitHub Pages 后访问 `https://your-username.github.io/camera-3a-course/`，输入密码即可使用（默认 `camera3a`，建议自行修改）。

### 本地运行

```bash
git clone https://github.com/your-username/camera-3a-course.git
cd camera-3a-course
python3 server.py
```

打开 http://localhost:8080/ 输入密码（默认 `camera3a`）即可。

> 详细启动 / 改密码 / 同步配置请见 [USAGE.md](USAGE.md)

### 部署到自己的服务器（推荐）

打包成 tarball 部署到任意 Linux/Mac/Windows 主机：

```bash
# 1. 在本机打包
bash deploy/self-host/pack.sh
# 输出：dist/camera3a-course-<时间戳>.tar.gz

# 2. 上传到主机 + 解压 + 一键安装
scp dist/camera3a-course-*.tar.gz user@host:~/
ssh user@host
tar -xzf camera3a-course-*.tar.gz
cd camera3a-course-*
sudo bash deploy/self-host/install-linux.sh   # systemd 自启
```

详细文档（含 Mac launchd / Windows 启动项）见 [deploy/self-host/README.md](deploy/self-host/README.md)。

### 备选：GitHub Pages + Cloudflare Worker

适合不想自己买服务器的场景。详见 [deploy/DEPLOY.md](deploy/DEPLOY.md)。注意：中国大陆环境下 Cloudflare Workers 的网络出口连接坚果云有时不稳定，建议优先用「自部署」方案。

## 技术栈

- **前端**：原生 ES Module，无构建工具，无框架
- **状态**：浏览器 `localStorage`（带 namespace）
- **路由**：自实现 hash router
- **测试**：`node:test`（Node 22+ 内置），72 个单元测试
- **本地服务器**：单文件 `server.py`，仅依赖 Python 3 标准库
- **同步**：WebDAV 协议（坚果云）+ server.py 内置 CORS 代理
- **部署**：自部署（Linux systemd / Mac launchd / Windows 启动项）；备选 GitHub Pages

## 目录结构

```
.
├── index.html                  # SPA 入口
├── server.py                   # 本地开发服务器（含 WebDAV 代理）
├── package.json
├── README.md                   # 本文件
├── USAGE.md                    # 完整使用手册
├── PRD.txt                     # 课程需求和面试题来源
├── assets/
│   ├── css/                    # 深色专业风样式
│   ├── js/
│   │   ├── app.js              # 启动 + 路由
│   │   ├── storage.js          # localStorage 命名空间封装
│   │   ├── progress.js         # 解锁逻辑 + 连续打卡
│   │   ├── quiz.js             # 题目判分 + 自评
│   │   ├── srs.js              # SM-2 间隔重复算法
│   │   ├── flashcards.js       # 卡片 CRUD + 到期查询
│   │   ├── sync.js             # 坚果云同步引擎
│   │   ├── particles.js        # 粒子特效系统
│   │   ├── tracker.js          # 学习时长追踪
│   │   ├── gate.js             # 密码门（SHA-256）
│   │   └── views/              # 6 个功能页面
│   ├── vendor/marked.esm.js    # 内联 Markdown 渲染器
│   └── data/
│       ├── curriculum.json     # 8 周大纲
│       ├── days/day-NN.json    # 每日教学内容
│       ├── quizzes/            # 题库
│       └── flashcards/         # 记忆卡种子
├── tests/                      # 72 个 node:test 单测
├── deploy/
│   ├── DEPLOY.md               # 部署到公网手把手指南
│   └── cloudflare-worker.js    # CORS 代理 Worker 源码
├── .github/workflows/pages.yml # GitHub Pages 自动部署
└── docs/superpowers/
    ├── specs/                  # 设计文档
    └── plans/                  # 实施计划
```

## 开发

```bash
# 跑全部测试
node --test tests/*.test.js

# 启动本地服务器
python3 server.py

# 端口冲突时换一个
python3 server.py 9000
```

## 致谢

课程内容参考：
- 高通官方 _Camera 3A 7.0 Tuning Guide (Simplified Chinese)_ —— 主要操作手册
- 高通官方 _Qualcomm 3A 10 Deep Dive_ —— 架构详解
- 维基百科图像处理相关条目
- B 站、YouTube 上的相机原理科普视频

PDF 文档体积较大且有版权未包含在仓库中。学习者可自行从高通文档库获取。

## 许可

代码采用 [MIT](LICENSE) 许可。课程内容和教学文本仅供个人学习使用，请勿商用。

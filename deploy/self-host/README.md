# Camera 3A 课程 · 自部署指南

把课程网站 + 同步代理一起部署到你自己的主机（云服务器 / NAS / 闲置 PC）。
完全不依赖 GitHub Pages、Cloudflare、域名、备案。

## 系统要求

- Linux / macOS / Windows 任意一种
- Python 3.8+（一般系统都自带；Win 需要从 python.org 安装）
- 一个能通的端口（默认 8080，云服务器记得放行安全组）

## 三种系统的安装步骤

### Linux（云服务器 / NAS / 树莓派）

```bash
# 1. 把整个项目拷到主机（任何方式都行：scp / rsync / wget tarball）
#    例如：scp -r camera3a-course/ user@your-host:~/

# 2. 进目录
cd ~/camera3a-course

# 3. 一键安装（默认 8080 端口）
sudo bash deploy/self-host/install-linux.sh

# 或者指定端口
sudo bash deploy/self-host/install-linux.sh 8088
```

脚本做的事：
1. 把项目复制到 `/opt/camera3a/`
2. 创建 systemd 服务 `camera3a`
3. 设置开机自启
4. 启动服务并显示访问地址

**装完后访问 `http://<你的主机 IP>:8080/`** 即可。

常用命令：

```bash
systemctl status camera3a       # 看状态
systemctl stop camera3a         # 停服务
systemctl restart camera3a      # 重启
tail -f /var/log/camera3a.log   # 看日志
sudo bash deploy/self-host/uninstall-linux.sh  # 卸载
```

### macOS（家里的 Mac mini / 闲置 Mac）

```bash
# 1. 拷贝项目到 Mac
# 2. 进目录
cd camera3a-course

# 3. 安装（不需要 sudo）
bash deploy/self-host/install-mac.sh

# 或指定端口
bash deploy/self-host/install-mac.sh 8088
```

脚本做的事：
1. 复制到 `~/Library/Application Support/Camera3A/`
2. 创建 LaunchAgent（开机 + 登录后自动启动）
3. 启动服务

常用命令：

```bash
# 看日志
tail -f ~/Library/Logs/camera3a.log

# 停止
launchctl unload ~/Library/LaunchAgents/com.camera3a.server.plist

# 重启
launchctl unload ~/Library/LaunchAgents/com.camera3a.server.plist
launchctl load ~/Library/LaunchAgents/com.camera3a.server.plist

# 卸载
bash deploy/self-host/uninstall-mac.sh
```

### Windows（家里 PC / 公司电脑）

1. 把项目文件夹拷到 PC
2. 双击 `deploy/self-host/install-windows.bat` 运行（不需要管理员权限）
3. 看到「安装成功」即可

脚本做的事：
1. 复制到 `%USERPROFILE%\Camera3A\`
2. 在启动项加 VBS 脚本（开机自动启动）
3. 立即启动服务（控制台隐藏在后台）

卸载：双击 `uninstall-windows.bat`

注意：Windows Defender / 杀毒软件可能拦截 Python 监听端口，需要点「允许」。

## 验证安装

任何系统装完后，浏览器访问：

```
http://<主机 IP>:8080/
```

正常会跳转到「同步设置」页（首次访问要先填坚果云邮箱 + 应用密码）。

测试同步：
1. 进 ☁️ 同步页
2. 邮箱 / 密码 / 设备名填好
3. 点「测试连接」
4. 看到 ✅ 通过，则代理工作正常
5. 点「立即同步」

## 多设备访问

主机部署好后，**同一个局域网**或**主机有公网 IP**的话，
任何设备（电脑 / 手机 / 平板）打开 `http://<主机 IP>:8080/` 都能访问。

注意：

1. **防火墙**：云服务器安全组要放行端口（默认 8080）
2. **HTTPS**：当前是 HTTP，仅同密钥保护。如果要 HTTPS，加个 nginx 反代或 Caddy 自动证书
3. **手机**：4G 下要主机有公网 IP；只在 WiFi 用就主机在同 LAN 即可

## 常见问题

### 装完打不开？

- 防火墙没开端口（云服务器要去控制台改安全组）
- Python 3 没装上
- 8080 端口被占用：换端口重装 `install-linux.sh 8088`

### 服务器跑没多久就卡了？

server.py 是单线程 HTTP，只设计给个人用。同时 5+ 用户访问会慢但不炸。

### 公网部署安全吗？

主机有公网 IP 的话任何人都能访问。建议：

1. 改密码门：默认 `camera3a`，改 `assets/js/gate.js` 里的 hash
2. 防火墙限制源 IP：`iptables` / 安全组
3. 上 HTTPS（Caddy 是最简单的免费证书方案）

### 怎么更新课程内容（增量更新）？

每次我打新包给你后：

1. 把新 tar.gz / zip 传到主机
2. 解压成新目录（**不要覆盖老安装目录**）
3. 进新目录跑 update 脚本：

**Linux**：
```bash
tar -xzf camera3a-course-<新时间戳>.tar.gz
cd camera3a-course-<新时间戳>
sudo bash deploy/self-host/update-linux.sh
```

**Mac**：
```bash
tar -xzf camera3a-course-<新时间戳>.tar.gz
cd camera3a-course-<新时间戳>
bash deploy/self-host/update-mac.sh
```

**Windows**：解压新 zip → 进解压目录 → 双击 `deploy\self-host\update-windows.bat`

**update 脚本做的事**：
- 增量复制新文件到安装目录（保留你 install 时改过的本地配置）
- 自动重启服务
- 显示当前版本

**用户数据不会丢**：所有学习数据（笔记、进度、记忆卡）都存在用户**浏览器的 localStorage** 里，更新主机代码不影响。

### 查看当前版本

```bash
# Linux
cat /opt/camera3a/.version

# Mac
cat ~/Library/Application\ Support/Camera3A/.version

# Windows
type %USERPROFILE%\Camera3A\.version
```

# 安装指南

本文档介绍系统要求、客户端设置和本地开发。如需 Docker 生产环境部署，请参阅 [部署指南](DEPLOY_zh.md)。

---

## 系统要求

### 服务器

- Docker 20.10+
- Docker Compose 2.0+
- 操作系统：任意 Linux 发行版（推荐 Ubuntu 20.04+）
- 内存：最低 512MB RAM
- 存储：最低 1GB

### 客户端

- **桌面小组件**：Windows 10/11 (64 位)
- **Web 管理面板**：任意现代浏览器（Chrome、Firefox、Safari、Edge）
- **微信小程序**：微信 App 8.0+

---

## 快速部署

```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# 从日志获取管理员凭据和 API Key
docker logs memopad-backend
```

在浏览器访问 `http://YOUR_SERVER_IP`。完整的生产环境配置（HTTPS、防火墙、备份）请参阅 [DEPLOY_zh.md](DEPLOY_zh.md)。

---

## 桌面小组件设置

### 安装

1. 从 [GitHub Releases](https://github.com/Bryce199805/MemoPad/releases) 下载最新版本
2. 运行安装程序（NSIS 安装包）
3. 启动应用程序

### 连接配置

1. 点击右上角的 **⚙ 设置** 按钮
2. 在 **高级设置** 中填写：
   - **服务器地址**：`http://YOUR_SERVER_IP`
   - **API Key**：从服务器日志获取（`docker logs memopad-backend`）
3. 点击 **测试连接** 验证，然后保存

### 功能

| 功能 | 描述 |
|---------|-------------|
| 快速添加 | + 按钮即时创建待办/倒计时 |
| 透明度 | 调整窗口透明度 |
| 始终置顶 | 保持小组件在所有窗口之上 |
| 透明背景 | 毛玻璃效果 |
| 主题 | 深色 / 浅色 / 玻璃主题 |
| 语言 | 中文 / English |
| 系统托盘 | 最小化到托盘；右键显示菜单 |

---

## 微信小程序设置

### 前置条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 已注册小程序 AppID 的微信开发者账号

### 配置

1. 复制示例配置：
   ```bash
   cp miniprogram/config.example.js miniprogram/config.js
   ```

2. 编辑 `miniprogram/config.js` 并填入您的值：
   ```js
   const config = {
     baseUrl: 'https://your-server-ip-or-domain',
     appId: 'your-wechat-appid'
   }
   ```

3. 打开微信开发者工具，导入 `miniprogram/` 目录作为项目，并设置您的 AppID。

4. 点击 **预览** 或 **上传** 部署到微信。

---

## 用户注册控制

### 禁用开放注册

1. 以管理员身份登录 Web 管理面板
2. 进入 **管理 → 系统配置**
3. 关闭 **允许注册** 开关

禁用后，新用户无法自行注册。管理员必须通过微信小程序管理面板或直接调用 API 创建用户。

---

## API Key 管理

### 查看 API Key

1. 登录 Web 管理面板
2. 进入 **设置**
3. 在 **API Key** 区域查看（点击眼睛图标显示）

### 重新生成 API Key

在设置中点击 **重新生成**。旧密钥立即失效 — 请使用新密钥更新所有客户端。

---

## 国际化（语言支持）

Web 管理面板和桌面小组件均支持**中文**和**英文**。可在应用设置中切换语言。微信小程序也包含两种语言的本地化文件。

---

## 开发环境

### 后端

```bash
cd backend
go mod download
go run main.go
```

运行于 `http://localhost:3000`。

### Web 前端

```bash
cd web
npm install
npm run dev
```

运行于 `http://localhost:5173`，API 请求自动代理到后端。

### 桌面应用

```bash
cd desktop
npm install
npm run tauri dev
```

**前置条件**：Rust 工具链和 Tauri CLI。请参阅 [Tauri 前置条件指南](https://tauri.app/start/prerequisites/) 了解平台特定的安装说明。

---

## 更多信息

- [部署指南](DEPLOY_zh.md) — 生产环境 Docker 部署、HTTPS、备份
- [API 参考](API_zh.md) — 完整 API 文档

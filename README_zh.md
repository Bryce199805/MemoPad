# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[English](README.md)** | **中文**

**MemoPad** 是一个多平台任务管理应用，采用统一的后端 API 服务多个前端客户端：Web 管理面板、桌面小组件和微信小程序。

---

## 概览

| 平台 | 技术栈 | 描述 |
|----------|------------|-------------|
| 后端 API | Go 1.23 / Gin / GORM / SQLite | RESTful API + WebSocket 服务 |
| Web 管理面板 | Vue 3 / Vue Router / Pinia / TailwindCSS | 响应式管理面板 |
| 桌面小组件 | Tauri 2.0 / Vue 3 / Rust | Windows 悬浮小组件 |
| 微信小程序 | 微信小程序框架 | 微信内移动端访问 |

---

## 功能特性

### 核心功能

#### 待办管理
- **优先级等级**：高 / 中 / 低，带颜色标识
- **置顶功能**：保持重要任务可见
- **分类管理**：自定义分类及颜色
- **截止日期**：设置任务截止时间
- **批量操作**：批量切换、完成或删除待办事项
- **完成统计**：可视化进度统计

#### 倒计时
- **可视化进度**：进度条显示剩余时间
- **紧急状态**：已过期 / 即将到期 / 正常状态
- **重要日期置顶**：保持关键倒计时在顶部

#### 多设备同步
- **统一 API**：单一后端服务所有客户端
- **实时同步**：WebSocket 即时推送变更到各设备
- **安全认证**：基于 API Key 的身份验证

### 平台特性

#### 桌面小组件 (Tauri)
- **悬浮窗口**：透明、始终置顶的小组件
- **毛玻璃 UI**：美观的渐变背景配合模糊效果
- **快速添加**：无需打开主应用即可创建待办
- **位置与透明度**：自定义小组件位置和透明度
- **系统托盘**：最小化到托盘，带右键菜单
- **边缘吸附**：窗口自动吸附屏幕边缘

#### Web 管理面板
- **现代界面**：卡片式设计，流畅动画
- **深色 / 浅色主题**：完整主题支持与切换
- **统计信息**：可视化进度追踪和完成率
- **响应式设计**：支持桌面、平板和手机
- **管理员面板**：用户管理、工单处理、系统配置
- **国际化**：支持中英文切换

#### 微信小程序
- **快速访问**：直接在微信内使用
- **完整功能**：待办和倒计时管理
- **管理入口**：应用内可访问管理功能

---

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# 2. 启动服务
docker compose up -d

# 3. 获取管理员凭据和 API Key（首次运行自动生成）
docker logs memopad-backend

# 4. 访问 Web 界面
# 在浏览器中打开 http://YOUR_SERVER_IP
```

**端口说明**：只需开放 80 端口（HTTPS 为 443）。后端在内部运行，通过 Nginx 代理。

### 开发模式

```bash
# 后端
cd backend && go run main.go

# Web 前端（新终端）
cd web && npm install && npm run dev

# 桌面应用（新终端）— 需要 Rust + Tauri CLI
cd desktop && npm install && npm run tauri dev
```

---

## 项目结构

```
MemoPad/
├── backend/                 # Go 后端服务
│   ├── main.go              # 单文件架构：路由、模型、处理器
│   ├── go.mod
│   └── Dockerfile
│
├── web/                     # Vue 3 Web 管理面板
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/          # Vue Router 配置
│   │   ├── stores/          # Pinia 状态管理 (auth, todo, countdown, category)
│   │   ├── i18n/            # vue-i18n 配置
│   │   ├── locales/         # 翻译文件 (en.json, zh.json)
│   │   ├── styles/          # 全局 CSS 变量和设计令牌
│   │   ├── views/           # 页面组件
│   │   │   ├── Dashboard.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── TodoManage.vue
│   │   │   ├── CountdownManage.vue
│   │   │   ├── Settings.vue
│   │   │   ├── Feedback.vue
│   │   │   └── admin/       # AdminDashboard, AdminUsers, AdminTickets, AdminConfig
│   │   ├── components/      # TodoItem.vue + ui/ (Badge, Button, Card, StatCard)
│   │   ├── layouts/         # DefaultLayout.vue
│   │   └── api/             # client.js, websocket.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf           # Nginx 配置：限流、WebSocket 代理、HTTPS
│
├── desktop/                 # Tauri 桌面小组件
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── components/      # TodoCard.vue
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── locales/         # i18n 翻译
│   │   └── style.css
│   ├── src-tauri/           # Rust 后端
│   │   ├── src/main.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── package.json
│
├── miniprogram/             # 微信小程序
│   ├── pages/               # login, dashboard, todos, countdowns, settings,
│   │                        # tickets, admin-dashboard
│   ├── components/
│   ├── utils/
│   ├── locales/             # en.js, zh.js
│   ├── images/
│   ├── config.example.js    # 复制为 config.js 并填入 AppID 和服务器地址
│   └── app.json
│
├── .github/workflows/
│   └── build.yml            # Tauri 桌面端发布构建
│
├── docker-compose.yml       # 生产环境部署
├── README.md
├── INSTALL.md
├── DEPLOY.md
├── API.md
└── LICENSE
```

---

## 用户角色

### 普通用户
- 管理个人待办和倒计时
- 创建和管理分类
- 提交反馈工单
- 查看个人统计
- 管理个人 API Key

### 管理员
- 用户管理（查看、禁用、删除）
- 工单处理（回复、更新状态）
- 系统配置（启用/禁用注册）
- 全局统计

---

## 文档

| 文档 | 描述 |
|----------|-------------|
| [INSTALL_zh.md](INSTALL_zh.md) | 客户端设置、微信小程序、开发环境 |
| [DEPLOY_zh.md](DEPLOY_zh.md) | 生产环境 Docker 部署、HTTPS、备份、监控 |
| [API_zh.md](API_zh.md) | 完整 REST API 和 WebSocket 参考 |

---

## 许可证

[MIT License](LICENSE)

---

## 参与贡献

欢迎提交 Issue 和 Pull Request！

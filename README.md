# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)

一个桌面待办事项和倒计时工具，支持多设备同步。

## 功能特点

| 功能 | 描述 |
|------|------|
| 桌面小组件 | 悬浮透明窗口、毛玻璃效果、始终置顶 |
| Web 管理面板 | 响应式界面、深色模式、完整 CRUD |
| 多设备同步 | 统一 API，桌面和网页数据实时同步 |
| 待办管理 | 优先级、置顶、分类、完成状态追踪 |
| 倒计时 | 目标日期追踪、进度可视化、紧急提醒 |
| 国际化 | 支持中文和英文 |

## 技术栈

```
┌─────────────────────────────────────────────────────────┐
│                      MemoPad                            │
├─────────────────────┬───────────────────────────────────┤
│   Desktop Client    │          Web Dashboard            │
│   Tauri + Vue 3     │        Vue 3 + Pinia              │
│   TailwindCSS       │      Vue Router + TailwindCSS     │
└─────────┬───────────┴───────────────┬───────────────────┘
          │                           │
          └───────────┬───────────────┘
                      │
          ┌───────────┴───────────┐
          │      REST API         │
          │   Go + Gin + GORM     │
          └───────────┬───────────┘
                      │
          ┌───────────┴───────────┐
          │       SQLite          │
          └───────────────────────┘
```

## 快速开始

### 本地开发

```bash
# 1. 启动后端
cd backend && go run main.go

# 2. 启动 Web（新终端）
cd web && npm install && npm run dev

# 3. 启动桌面端（新终端）
cd desktop && npm install && npm run dev
```

### Docker 部署

```bash
docker-compose up -d
docker logs memopad-backend  # 查看自动生成的 API Key
```

## API 文档

所有接口需要 `X-API-Key` 请求头认证。

### Todos

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/todos` | 获取列表 |
| POST | `/api/todos` | 创建 |
| PUT | `/api/todos/:id` | 更新 |
| DELETE | `/api/todos/:id` | 删除 |
| PATCH | `/api/todos/:id/toggle` | 切换完成状态 |
| PATCH | `/api/todos/:id/pin` | 切换置顶 |

### Countdowns

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/countdowns` | 获取列表 |
| POST | `/api/countdowns` | 创建 |
| PUT | `/api/countdowns/:id` | 更新 |
| DELETE | `/api/countdowns/:id` | 删除 |

### Categories

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取列表 |
| POST | `/api/categories` | 创建 |
| PUT | `/api/categories/:id` | 更新 |
| DELETE | `/api/categories/:id` | 删除 |

### Stats

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 获取统计数据 |

## 项目结构

```
MemoPad/
├── backend/          # Go 后端服务
│   ├── main.go       # 主程序入口
│   ├── Dockerfile    # Docker 构建文件
│   └── go.mod        # Go 依赖
├── web/              # Vue 3 Web 应用
│   └── src/
│       ├── views/    # 页面组件
│       ├── stores/   # Pinia 状态管理
│       └── api/      # API 客户端
├── desktop/          # Tauri 桌面应用
│   ├── src/          # Vue 前端
│   └── src-tauri/    # Rust 后端配置
├── docker-compose.yml
├── INSTALL.md        # 安装指南
└── DEPLOY.md         # 部署指南
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `VITE_API_URL` | http://localhost:3000 | API 地址 |

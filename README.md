# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**MemoPad** 是一个多端同步的任务管理应用，包含桌面悬浮组件、Web 管理面板和微信小程序。通过统一的 API 实现多设备数据同步。

---

## 项目概览

| 平台 | 技术栈 | 说明 |
|------|--------|------|
| 后端 API | Go 1.23 / Gin / GORM / SQLite | RESTful API 服务 |
| Web 控制台 | Vue 3 / Vue Router / Pinia / TailwindCSS | 响应式管理面板 |
| 桌面组件 | Tauri 2.0 / Vue 3 / Rust | Windows 悬浮窗小部件 |
| 微信小程序 | WeChat Mini Program | 移动端快捷访问 |

---

## 功能特性

### 核心功能

#### 任务管理 (Todo)
- **优先级分级**：高/中/低三级优先级，颜色标识
- **置顶固定**：重要任务固定在顶部显示
- **分类管理**：自定义分类和颜色，按分类筛选
- **截止日期**：支持设置任务截止时间
- **完成追踪**：可视化进度统计

#### 倒计时 (Countdown)
- **可视化进度**：进度条直观显示剩余时间
- **紧急程度指示**：逾期/即将到期/正常 三种状态
- **重要日期置顶**：关键倒计时固定显示

#### 多端同步
- **统一 API**：单一后端服务所有客户端
- **实时同步**：跨设备数据即时更新
- **安全认证**：API Key 认证机制

### 平台特性

#### 桌面组件 (Tauri)
- **悬浮窗口**：透明、始终置顶的桌面小部件
- **毛玻璃效果**：精美的渐变背景和模糊效果
- **快速添加**：无需打开主应用即可创建任务
- **位置与透明度**：自定义窗口位置和透明度
- **系统托盘**：最小化到系统托盘，托盘菜单操作
- **边缘吸附**：窗口自动吸附屏幕边缘

#### Web 控制台
- **现代界面**：卡片式设计，流畅动画
- **深色模式**：完整的深色主题支持
- **数据统计**：任务完成率、优先级分布等可视化
- **响应式设计**：桌面、平板、手机全适配
- **管理员后台**：用户管理、工单处理、系统配置

#### 微信小程序
- **快捷访问**：微信内直接使用，无需下载 App
- **完整功能**：任务管理、倒计时、设置等核心功能
- **管理员入口**：管理员可在小程序内管理用户

---

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# 2. 启动服务
docker compose up -d

# 3. 查看初始 API Key（首次启动自动生成）
docker logs memopad-backend

# 4. 访问 Web 界面
# 浏览器打开 http://YOUR_SERVER_IP
```

**端口说明**：只需开放 80 端口（HTTPS 为 443）。后端 API 通过 Nginx 内部代理，无需额外开放端口。

### 开发环境

```bash
# 后端
cd backend && go run main.go

# Web 前端（新终端）
cd web && npm install && npm run dev

# 桌面应用（新终端）
cd desktop && npm install && npm run tauri dev
```

---

## 项目结构

```
MemoPad/
├── backend/                 # Go 后端服务
│   ├── main.go              # 主程序（单文件架构）
│   ├── go.mod               # Go 模块定义
│   ├── Dockerfile           # Docker 构建文件
│   └── .dockerignore
│
├── web/                     # Vue 3 Web 控制台
│   ├── src/
│   │   ├── main.js          # 入口文件
│   │   ├── App.vue          # 根组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── views/           # 页面组件
│   │   │   ├── Dashboard.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── TodoManage.vue
│   │   │   ├── CountdownManage.vue
│   │   │   ├── Settings.vue
│   │   │   ├── Feedback.vue
│   │   │   └── admin/       # 管理员页面
│   │   ├── components/      # 可复用组件
│   │   ├── layouts/         # 布局组件
│   │   ├── api/             # API 客户端
│   │   └── locales/         # 国际化翻译
│   ├── package.json
│   ├── Dockerfile           # Docker 构建文件
│   └── nginx.conf           # Nginx 配置（含限流）
│
├── desktop/                 # Tauri 桌面应用
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue          # 主界面组件
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── components/      # UI 组件
│   │   └── locales/         # 国际化翻译
│   ├── src-tauri/           # Rust 后端
│   │   ├── src/main.rs      # Tauri 主程序
│   │   ├── Cargo.toml       # Rust 依赖
│   │   ├── tauri.conf.json  # Tauri 配置
│   │   └── icons/           # 应用图标
│   └── package.json
│
├── miniprogram/             # 微信小程序
│   ├── pages/               # 页面
│   │   ├── login/           # 登录页
│   │   ├── dashboard/       # 仪表盘
│   │   ├── todos/           # 任务管理
│   │   ├── countdowns/      # 倒计时
│   │   ├── settings/        # 设置
│   │   ├── tickets/         # 工单反馈
│   │   └── admin-dashboard/ # 管理员面板
│   ├── components/          # 可复用组件
│   ├── utils/               # 工具函数
│   ├── app.js               # 小程序入口
│   └── app.json             # 小程序配置
│
├── .github/workflows/       # GitHub Actions
│   └── build.yml            # Tauri 构建工作流
│
├── docker-compose.yml       # 生产环境部署配置
├── compose.yml              # 开发环境部署配置
├── README.md                # 项目说明
├── INSTALL.md               # 安装指南
├── DEPLOY.md                # 部署指南
└── LICENSE                  # MIT 许可证
```

---

## API 接口

### 认证接口 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| GET | `/verify` | 验证 API Key | 是 |
| GET | `/check-admin` | 检查管理员是否存在 | 否 |
| GET | `/api-key` | 获取当前 API Key | 是 |
| POST | `/api-key/regenerate` | 重新生成 API Key | 是 |

### 任务接口 `/api/todos`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取任务列表 |
| POST | `/` | 创建任务 |
| PUT | `/:id` | 更新任务 |
| DELETE | `/:id` | 删除任务 |
| PATCH | `/:id/toggle` | 切换完成状态 |
| PATCH | `/:id/pin` | 切换置顶状态 |

### 倒计时接口 `/api/countdowns`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取倒计时列表 |
| POST | `/` | 创建倒计时 |
| PUT | `/:id` | 更新倒计时 |
| DELETE | `/:id` | 删除倒计时 |

### 分类接口 `/api/categories`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取分类列表 |
| POST | `/` | 创建分类 |
| PUT | `/:id` | 更新分类 |
| DELETE | `/:id` | 删除分类 |

### 统计接口 `/api/stats`

- 返回任务完成率、优先级分布、倒计时统计

### 工单接口 `/api/tickets`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取用户工单列表 |
| POST | `/` | 创建工单 |
| GET | `/:id` | 获取工单详情 |

### 管理员接口 `/api/admin`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 获取用户列表 |
| PATCH | `/users/:id/disable` | 禁用用户 |
| PATCH | `/users/:id/enable` | 启用用户 |
| DELETE | `/users/:id` | 删除用户 |
| GET | `/config` | 获取系统配置 |
| PUT | `/config` | 更新系统配置 |
| GET | `/stats` | 系统统计 |
| GET | `/tickets` | 获取所有工单 |
| PUT | `/tickets/:id` | 更新工单状态 |
| DELETE | `/tickets/:id` | 删除工单 |

---

## 用户角色

### 普通用户
- 管理个人任务和倒计时
- 创建和管理分类
- 提交反馈工单
- 查看个人统计数据
- 管理个人 API Key

### 管理员
- 用户管理（查看、禁用、删除）
- 工单处理（回复、更新状态）
- 系统配置（开放/关闭注册）
- 全局数据统计
- 无个人任务管理功能（专注于系统管理）

---

## 安全特性

1. **认证机制**
   - bcrypt 密码哈希
   - API Key 格式：`mp_` 前缀 + 64 位十六进制字符
   - 支持 API Key 重新生成

2. **访问控制**
   - 基于角色的权限（admin / user）
   - 用户数据隔离
   - 管理员专属接口保护

3. **限流保护**
   - 后端：IP 限流，自动封禁
   - Nginx：请求频率和并发连接限制

4. **HTTPS/TLS**
   - TLS 1.2 / 1.3
   - 安全加密套件

---

## 数据存储

- **数据库**：SQLite (`memo.db`)
- **存储位置**：Docker 容器内 `/app/data/`
- **持久化**：Docker Volume `backend-data`
- **备份**：直接复制数据目录即可

---

## 下载

- **桌面应用**：[GitHub Releases](https://github.com/Bryce199805/MemoPad/releases)
- **微信小程序**：搜索「MemoPad」（如有发布）

---

## 文档

- [安装指南](INSTALL.md) - 详细的安装步骤
- [部署指南](DEPLOY.md) - 生产环境 Docker 部署

---

## 许可证

[MIT License](LICENSE)

---

## 贡献

欢迎提交 Issue 和 Pull Request！

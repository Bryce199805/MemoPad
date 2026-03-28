# 安装指南

本文档详细介绍 MemoPad 的安装和配置步骤。

---

## 系统要求

### 服务端
- Docker 20.10+
- Docker Compose 2.0+
- 服务器：任意 Linux 发行版（推荐 Ubuntu 20.04+）
- 内存：最低 512MB
- 存储：最低 1GB

### 客户端
- **桌面组件**：Windows 10/11（64位）
- **Web 控制台**：任意现代浏览器（Chrome、Firefox、Safari、Edge）
- **微信小程序**：微信 App 8.0+

---

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 获取 API Key

首次启动会自动生成管理员账户和 API Key：

```bash
docker logs memopad-backend
```

输出示例：
```
========================================
  MemoPad Backend Started
  Port: 3000
  Data Directory: /app/data
========================================
Admin account created!
Username: admin
Password: <random-password>
API Key: mp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
========================================
```

**重要**：请保存 API Key，后续登录需要使用。

### 4. 访问应用

| 服务 | 地址 |
|------|------|
| Web 控制台 | `http://YOUR_SERVER_IP` |
| 桌面组件 | [Releases](https://github.com/Bryce199805/MemoPad/releases) 下载 |

---

## 防火墙配置

只需开放 HTTP 端口（默认 80）：

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80
sudo ufw allow 443  # 如果使用 HTTPS

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

**注意**：后端 API 端口（3000）通过 Nginx 内部代理，无需对外开放。

---

## 桌面组件配置

### 安装步骤

1. 从 [Releases](https://github.com/Bryce199805/MemoPad/releases) 下载最新版本
2. 运行安装程序（NSIS 安装包）
3. 安装完成后启动应用

### 连接配置

1. 点击右上角 **⚙ 设置** 按钮
2. 在 **高级设置** 中输入：
   - **服务器地址**：`http://YOUR_SERVER_IP`
   - **API Key**：从服务端日志获取
3. 点击 **测试连接** 验证
4. 保存设置

### 功能说明

| 功能 | 说明 |
|------|------|
| 快速添加 | 点击 + 按钮快速创建任务/倒计时 |
| 透明度调节 | 滑动调节窗口透明度 |
| 始终置顶 | 窗口保持在所有窗口之上 |
| 透明背景 | 开启毛玻璃效果 |
| 主题切换 | 深色/浅色/透明三种主题 |
| 系统托盘 | 最小化到托盘，右键菜单操作 |

---

## 配置详解

### 环境变量

在 `docker-compose.yml` 中配置：

```yaml
services:
  backend:
    environment:
      - GIN_MODE=release          # 运行模式
      - DATA_DIR=/app/data        # 数据目录
      - ADMIN_USERNAME=admin      # 可选：指定管理员用户名
      - ADMIN_PASSWORD=yourpwd    # 可选：指定管理员密码
```

### 数据持久化

数据存储在 Docker Volume 中：

```yaml
volumes:
  backend-data:  # 数据库和配置存储位置
```

查看数据位置：
```bash
docker volume inspect memopad_backend-data
```

数据文件：
- `memo.db` - SQLite 数据库
- `api_key.txt` - API Key 存储（旧版，现在存储在数据库中）

### 端口配置

修改 `docker-compose.yml`：

```yaml
services:
  web:
    ports:
      - "8080:80"   # HTTP 端口
      - "8443:443"  # HTTPS 端口
```

### HTTPS 配置

1. 准备 SSL 证书：
```bash
mkdir -p /opt/memopad/ssl
cp your-cert.pem /opt/memopad/ssl/cert.pem
cp your-key.pem /opt/memopad/ssl/key.pem
```

2. 修改 `docker-compose.yml`：
```yaml
services:
  web:
    volumes:
      - /opt/memopad/ssl:/etc/nginx/ssl:ro
```

3. 重启服务：
```bash
docker compose down && docker compose up -d
```

---

## 用户注册控制

### 关闭开放注册

1. 以管理员身份登录 Web 控制台
2. 进入 **Admin > Config** 页面
3. 关闭 **Allow Registration** 选项

关闭后，新用户无法自行注册，只能由管理员创建。

### 创建用户

1. 管理员在 **Admin > Users** 页面点击 **Add User**
2. 填写用户名、密码、邮箱
3. 提交创建

---

## API Key 管理

### 查看 API Key

1. 登录 Web 控制台
2. 进入 **Settings** 页面
3. 在 **API Key** 区域查看

### 重新生成 API Key

在 Settings 页面点击 **Regenerate** 按钮。

**注意**：重新生成后，旧 Key 立即失效，所有客户端需要更新配置。

---

## 故障排除

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| API Key required 错误 | 确认 API Key 输入正确，无多余空格 |
| Connection refused | 检查防火墙是否开放端口 |
| 桌面组件空白 | 在设置中配置服务器地址和 API Key |
| 容器无法启动 | 运行 `docker logs memopad-backend` 查看日志 |
| 登录后跳转失败 | 清除浏览器缓存，检查路由配置 |
| 注册按钮不可用 | 管理员已在系统配置中关闭注册 |

### 查看日志

```bash
# 后端日志
docker logs memopad-backend

# Web 服务日志
docker logs memopad-web

# 实时查看
docker logs -f memopad-backend
```

### 重启服务

```bash
docker compose restart
```

### 完全重置

```bash
# 停止并删除容器和数据
docker compose down -v

# 重新启动（会重新初始化数据库）
docker compose up -d
```

---

## 数据备份

### 备份数据

```bash
# 创建备份目录
mkdir -p ~/memopad-backup

# 复制数据卷内容
docker run --rm -v memopad_backend-data:/data -v ~/memopad-backup:/backup alpine cp -a /data /backup/
```

### 恢复数据

```bash
# 停止服务
docker compose down

# 恢复数据
docker run --rm -v memopad_backend-data:/data -v ~/memopad-backup:/backup alpine cp -a /backup/data/ /data/

# 重启服务
docker compose up -d
```

---

## 升级

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

---

## 开发环境

### 后端开发

```bash
cd backend
go mod download
go run main.go
```

后端运行在 `http://localhost:3000`

### Web 前端开发

```bash
cd web
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，自动代理到后端

### 桌面应用开发

```bash
cd desktop
npm install
npm run tauri dev
```

需要安装 Rust 和 Tauri CLI。

---

## 更多信息

- [部署指南](DEPLOY.md) - 生产环境详细部署
- [API 文档](README.md#api-接口) - 完整 API 参考

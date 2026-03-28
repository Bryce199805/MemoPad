# 部署指南

本文档详细介绍 MemoPad 在生产环境的部署配置。

---

## 快速部署

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. 重新登录后部署
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# 3. 获取 API Key
docker logs memopad-backend
```

访问地址：`http://YOUR_SERVER_IP`

---

## 架构说明

```
                    ┌─────────────────────────┐
                    │      Nginx (80/443)     │
                    │   Web Static + API Proxy│
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
    ┌─────────┴─────────┐           ┌────────────┴────────────┐
    │   Static Files    │           │    /api/* Proxied       │
    │   (Vue SPA)       │           │    → backend:3000       │
    │   index.html      │           │    (Internal Network)   │
    │   /assets/*       │           └────────────┬────────────┘
    └───────────────────┘                        │
                                      ┌──────────┴──────────┐
                                      │   Go Backend (3000)  │
                                      │   REST API           │
                                      │   SQLite Database    │
                                      │   Rate Limiting      │
                                      └─────────────────────┘
```

**安全设计**：后端 API 端口（3000）不对外开放，所有请求通过 Nginx 代理转发。

---

## Docker Compose 配置

### 完整配置文件

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: memopad-backend
    restart: unless-stopped
    volumes:
      - backend-data:/app/data
    environment:
      - GIN_MODE=release
      - DATA_DIR=/app/data
      # 可选：预设管理员账户
      # - ADMIN_USERNAME=admin
      # - ADMIN_PASSWORD=secure_password
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build: ./web
    container_name: memopad-web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/memopad/ssl:/etc/nginx/ssl:ro
    depends_on:
      backend:
        condition: service_healthy

volumes:
  backend-data:
```

### 配置说明

| 配置项 | 说明 |
|--------|------|
| `backend-data` | 数据持久化卷，存储数据库和配置 |
| `GIN_MODE=release` | 生产模式，减少日志输出 |
| `DATA_DIR=/app/data` | 数据存储路径 |
| `ADMIN_USERNAME` | 可选，预设管理员用户名 |
| `ADMIN_PASSWORD` | 可选，预设管理员密码 |

---

## 防火墙配置

### Ubuntu/Debian (ufw)

```bash
# 开放 HTTP
sudo ufw allow 80/tcp

# 开放 HTTPS
sudo ufw allow 443/tcp

# 查看状态
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp

# 重载配置
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-ports
```

### iptables

```bash
# HTTP
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## HTTPS 配置

### 方案一：Nginx + Let's Encrypt（推荐）

1. 安装 Certbot：
```bash
sudo apt install certbot python3-certbot-nginx
```

2. 准备证书目录：
```bash
sudo mkdir -p /opt/memopad/ssl
```

3. 申请证书：
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

4. 复制证书：
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/memopad/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/memopad/ssl/key.pem
```

5. 设置自动续期：
```bash
# 创建续期脚本
cat << 'EOF' | sudo tee /opt/memopad/renew-cert.sh
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/memopad/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/memopad/ssl/key.pem
docker restart memopad-web
EOF

sudo chmod +x /opt/memopad/renew-cert.sh

# 添加定时任务
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /opt/memopad/renew-cert.sh") | sudo crontab -
```

### 方案二：自签名证书

```bash
# 创建目录
sudo mkdir -p /opt/memopad/ssl

# 生成自签名证书（有效期 365 天）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/memopad/ssl/key.pem \
  -out /opt/memopad/ssl/cert.pem \
  -subj "/CN=localhost"
```

### 方案三：Caddy 反向代理

创建 `Caddyfile`：

```
yourdomain.com {
    reverse_proxy memopad-web:80
}
```

运行 Caddy：
```bash
docker run -d --name caddy \
  --network memopad_default \
  -v ./Caddyfile:/etc/caddy/Caddyfile \
  -p 80:80 -p 443:443 \
  caddy:latest
```

---

## Nginx 安全配置

项目已内置安全配置（`web/nginx.conf`）：

### 限流配置

| 区域 | 限制 | 说明 |
|------|------|------|
| general | 10 req/s, burst 30 | 通用 API |
| auth | 5 req/min | 登录/注册 |
| admin | 10 req/s, burst 20 | 管理员接口 |
| conn_limit | 20 connections/IP | 并发连接 |

### 安全头

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 自定义配置

如需修改，编辑 `web/nginx.conf` 后重新构建：

```bash
docker compose up -d --build web
```

---

## 数据管理

### 数据位置

| 文件 | 说明 | 路径 |
|------|------|------|
| memo.db | SQLite 数据库 | `/app/data/memo.db` |
| 数据卷 | Docker Volume | `memopad_backend-data` |

### 备份

```bash
# 方法一：导出数据卷
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/memopad-$(date +%Y%m%d).tar.gz /data

# 方法二：直接复制
docker cp memopad-backend:/app/data ./backup/
```

### 恢复

```bash
# 停止服务
docker compose down

# 恢复数据
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd)/backup:/backup \
  alpine sh -c "cd / && tar xzf /backup/memopad-*.tar.gz"

# 启动服务
docker compose up -d
```

### 数据迁移

从旧服务器迁移到新服务器：

```bash
# 旧服务器
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/memopad-data.tar.gz /data

# 传输文件
scp memopad-data.tar.gz user@new-server:~

# 新服务器
docker compose up -d  # 先启动创建卷
docker compose down
docker run --rm \
  -v memopad_backend-data:/data \
  -v ~:/backup \
  alpine sh -c "cd / && tar xzf /backup/memopad-data.tar.gz"
docker compose up -d
```

---

## 监控与日志

### 查看日志

```bash
# 后端日志
docker logs memopad-backend

# Web 服务日志
docker logs memopad-web

# 实时跟踪
docker logs -f memopad-backend

# 最近 100 行
docker logs --tail 100 memopad-backend
```

### 健康检查

```bash
# 检查容器状态
docker ps

# 检查容器健康
docker inspect --format='{{.State.Health.Status}}' memopad-backend

# 测试 API
curl http://localhost/health
```

### 资源使用

```bash
# 查看资源占用
docker stats memopad-backend memopad-web
```

---

## 更新与升级

### 常规更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build
```

### 无缓存重建

```bash
docker compose build --no-cache
docker compose up -d
```

### 指定版本

```bash
# 检出特定版本
git checkout v1.0.0

# 部署
docker compose up -d --build
```

---

## 桌面应用部署

### Windows 自动启动

1. 创建 `MemoDesk.exe` 快捷方式
2. 按 `Win + R`，输入 `shell:startup`
3. 将快捷方式粘贴到启动文件夹

### 企业批量部署

1. 下载安装包
2. 使用组策略或 SCCM 分发
3. 配置统一的服务器地址和 API Key

---

## 性能优化

### 后端优化

- 使用内存缓存热点数据
- 定期清理过期数据
- 监控数据库大小

### Nginx 优化

已内置配置：
- Gzip 压缩
- 静态资源缓存
- 连接复用

### 资源监控

```bash
# 设置内存限制
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## 故障排除

### 常见问题

| 问题 | 诊断 | 解决方案 |
|------|------|----------|
| 无法访问 Web | `curl localhost` | 检查防火墙、容器状态 |
| API 401 错误 | 查看后端日志 | 验证 API Key 正确 |
| 容器启动失败 | `docker logs` | 检查配置、端口冲突 |
| 数据库锁定 | 重启容器 | 检查磁盘空间 |
| 内存不足 | `docker stats` | 增加资源限制 |

### 完全重置

```bash
# 停止并删除所有容器和数据
docker compose down -v

# 重新部署
docker compose up -d
```

---

## 安全建议

1. **使用 HTTPS**：生产环境必须启用 HTTPS
2. **定期备份**：设置自动备份任务
3. **更新系统**：定期更新 Docker 和系统补丁
4. **监控日志**：关注异常登录和请求
5. **限制注册**：在系统配置中关闭开放注册
6. **强密码**：管理员使用强密码

---

## 更多信息

- [安装指南](INSTALL.md) - 详细安装步骤
- [项目文档](README.md) - 项目概览和 API 参考

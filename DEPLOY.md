# Deployment Guide

This document provides detailed instructions for deploying MemoPad in a production environment.

---

## Quick Deploy

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Deploy MemoPad (after re-login)
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# 3. Get API Key
docker logs memopad-backend
```

Access: `http://YOUR_SERVER_IP`

---

## Architecture

```
                    ┌─────────────────────────┐
                    │      Nginx (80/443)     │
                    │   Web Static + API Proxy│
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
    ┌─────────┴─────────┐           ┌────────────┴────────────┐
    │   Static Files    │           │  /api/* + /ws Proxied   │
    │   (Vue SPA)       │           │    → backend:3000       │
    │   index.html      │           │    (Internal Network)   │
    │   /assets/*       │           └────────────┬────────────┘
    └───────────────────┘                        │
                                      ┌──────────┴──────────┐
                                      │   Go Backend (3000)  │
                                      │   REST API           │
                                      │   WebSocket (/ws)    │
                                      │   SQLite Database    │
                                      │   Rate Limiting      │
                                      └─────────────────────┘
```

**Security Design**: The backend API port (3000) is not exposed externally. All requests are proxied through Nginx.

---

## Docker Compose Configuration

### Full Configuration

```yaml
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
      # Optional: Pre-configure admin account
      # - ADMIN_USERNAME=admin
      # - ADMIN_PASSWORD=secure_password
      # Required for production: CORS origin whitelist (comma-separated)
      # - ALLOWED_ORIGINS=https://your-domain.com
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
      - backend

volumes:
  backend-data:
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `backend-data` | Persistent volume for database and config |
| `GIN_MODE=release` | Production mode, reduced logging |
| `DATA_DIR=/app/data` | Data storage path |
| `ADMIN_USERNAME` | Optional, pre-set admin username |
| `ADMIN_PASSWORD` | Optional, pre-set admin password |
| `ALLOWED_ORIGINS` | CORS whitelist — comma-separated origins (e.g. `https://your-domain.com`). If unset, all cross-origin requests are blocked. |

---

## Firewall Configuration

### Ubuntu/Debian (ufw)

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# Allow ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp

# Reload
sudo firewall-cmd --reload

# Check status
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

## HTTPS Configuration

### Option 1: Nginx + Let's Encrypt (Recommended)

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Create SSL directory:
```bash
sudo mkdir -p /opt/memopad/ssl
```

3. Request certificate:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

4. Copy certificates:
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/memopad/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/memopad/ssl/cert.key
```

5. Set up auto-renewal:
```bash
# Create renewal script
cat << 'EOF' | sudo tee /opt/memopad/renew-cert.sh
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/memopad/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/memopad/ssl/cert.key
docker restart memopad-web
EOF

sudo chmod +x /opt/memopad/renew-cert.sh

# Add cron job
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /opt/memopad/renew-cert.sh") | sudo crontab -
```

### Option 2: Self-signed Certificate

```bash
# Create directory
sudo mkdir -p /opt/memopad/ssl

# Generate self-signed certificate (365 days validity)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/memopad/ssl/cert.key \
  -out /opt/memopad/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Option 3: Caddy Reverse Proxy

Create `Caddyfile`:

```
yourdomain.com {
    reverse_proxy memopad-web:80
}
```

Run Caddy:
```bash
docker run -d --name caddy \
  --network memopad_default \
  -v ./Caddyfile:/etc/caddy/Caddyfile \
  -p 80:80 -p 443:443 \
  caddy:latest
```

---

## Nginx Security Configuration

Security features are built-in (`web/nginx.conf`):

### Rate Limiting

| Zone | Limit | Description |
|------|-------|-------------|
| api_limit (general) | 10 req/s, burst 30 | General API endpoints |
| api_limit (admin) | 10 req/s, burst 20 | Admin endpoints (same zone, smaller burst) |
| login_limit | 5 req/min | Login/Register endpoints |
| conn_limit | 20 connections/IP | Concurrent connections |

### Security Headers

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Customization

Edit `web/nginx.conf` and rebuild:

```bash
docker compose up -d --build web
```

---

## Data Management

### Data Locations

| File | Description | Path |
|------|-------------|------|
| memo.db | SQLite database | `/app/data/memo.db` |
| Volume | Docker Volume | `memopad_backend-data` |

### Backup

```bash
# Method 1: Export volume
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/memopad-$(date +%Y%m%d).tar.gz /data

# Method 2: Direct copy
docker cp memopad-backend:/app/data ./backup/
```

### Restore

```bash
# Stop services
docker compose down

# Restore data
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd)/backup:/backup \
  alpine sh -c "cd / && tar xzf /backup/memopad-*.tar.gz"

# Start services
docker compose up -d
```

### Migration

Migrating from old server to new server:

```bash
# Old server
docker run --rm \
  -v memopad_backend-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/memopad-data.tar.gz /data

# Transfer file
scp memopad-data.tar.gz user@new-server:~

# New server
docker compose up -d  # Start to create volume
docker compose down
docker run --rm \
  -v memopad_backend-data:/data \
  -v ~:/backup \
  alpine sh -c "cd / && tar xzf /backup/memopad-data.tar.gz"
docker compose up -d
```

---

## Monitoring and Logs

### View Logs

```bash
# Backend logs
docker logs memopad-backend

# Web service logs
docker logs memopad-web

# Real-time tracking
docker logs -f memopad-backend

# Last 100 lines
docker logs --tail 100 memopad-backend
```

### Health Check

```bash
# Check container status
docker ps

# Check container health
docker inspect --format='{{.State.Health.Status}}' memopad-backend

# Test API
curl http://localhost/health
```

### Resource Usage

```bash
# View resource consumption
docker stats memopad-backend memopad-web
```

---

## Updates and Upgrades

### Regular Update

```bash
# Pull latest code
git pull origin master

# Rebuild and restart
docker compose up -d --build
```

### No-cache Rebuild

```bash
docker compose build --no-cache
docker compose up -d
```

### Specific Version

```bash
# Checkout specific version
git checkout v0.7.0

# Deploy
docker compose up -d --build
```

---

## Desktop App Deployment

### Windows Auto-start

1. Create shortcut to `MemoDesk.exe`
2. Press `Win + R`, type `shell:startup`
3. Paste shortcut into startup folder

### Enterprise Deployment

1. Download installer
2. Distribute via Group Policy or SCCM
3. Configure unified server URL and API Key

---

## Performance Optimization

### Backend Optimization

- Use memory cache for hot data
- Periodically clean expired data
- Monitor database size

### Nginx Optimization

Built-in features:
- Gzip compression
- Static asset caching
- Connection reuse

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## Troubleshooting

### Common Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Cannot access Web | `curl localhost` | Check firewall, container status |
| API 401 error | Check backend logs | Verify API Key is correct |
| Container fails to start | `docker logs` | Check config, port conflicts |
| Database locked | Restart container | Check disk space |
| Out of memory | `docker stats` | Increase resource limits |

### Complete Reset

```bash
# Stop and remove all containers and data
docker compose down -v

# Redeploy
docker compose up -d
```

---

## Security Recommendations

1. **Use HTTPS**: HTTPS is required for production
2. **Regular Backups**: Set up automated backup tasks
3. **System Updates**: Regularly update Docker and system patches
4. **Monitor Logs**: Watch for abnormal logins and requests
5. **Limit Registration**: Disable open registration in system config
6. **Strong Passwords**: Use strong passwords for admin accounts

---

## More Information

- [Installation Guide](INSTALL.md) - Detailed installation steps
- [API Reference](API.md) - Complete API documentation

# Deployment Guide

## Quick Deploy

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Deploy MemoPad
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# Get API Key
docker logs memopad-backend
```

Access: `http://YOUR_SERVER_IP`

## Architecture

```
                    ┌─────────────────┐
                    │   Nginx (80)    │
                    │   Web + Proxy   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────┴─────────┐       ┌──────────┴──────────┐
    │   Static Files    │       │   /api/* proxied    │
    │   (Web Frontend)  │       │   to backend:3000   │
    └───────────────────┘       └──────────┬──────────┘
                                           │
                                ┌──────────┴──────────┐
                                │   Go Backend (3000)  │
                                │   REST API + SQLite  │
                                └─────────────────────┘
```

**All internal communication happens within Docker network. Only port 80 is exposed.**

## Firewall

Only open port 80:

```bash
sudo ufw allow 80
```

The backend API is not directly exposed - it's proxied through Nginx.

## SSL/HTTPS (Optional)

### Using Caddy (Automatic HTTPS)

Create `Caddyfile`:

```
yourdomain.com {
    reverse_proxy memopad-web:80
}
```

Run:
```bash
docker run -d --name caddy \
  -v ./Caddyfile:/etc/caddy/Caddyfile \
  -p 80:80 -p 443:443 \
  caddy:latest
```

### Using Nginx + Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Data Persistence

| File | Description |
|------|-------------|
| `data/memo.db` | SQLite database |
| `data/api_key.txt` | API key |

Backup:
```bash
cp -r data/ backup/
```

## Desktop Widget

1. Download from [Releases](https://github.com/Bryce199805/MemoPad/releases)
2. Install and run
3. Enter API Key in Settings

### Auto-start on Windows

1. Create shortcut to `MemoDesk.exe`
2. Press `Win + R`, type `shell:startup`
3. Paste the shortcut

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't access web | Check firewall allows port 80 |
| API returns 401 | Verify API key is correct |
| Container won't start | `docker logs memopad-backend` |
| Web can't connect to API | Check both containers running: `docker ps` |

## Monitoring

```bash
# View logs
docker logs -f memopad-backend
docker logs -f memopad-web

# Check status
docker ps
```

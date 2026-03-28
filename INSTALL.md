# Installation Guide

This document provides detailed installation and configuration instructions for MemoPad.

---

## System Requirements

### Server
- Docker 20.10+
- Docker Compose 2.0+
- OS: Any Linux distribution (Ubuntu 20.04+ recommended)
- Memory: Minimum 512MB
- Storage: Minimum 1GB

### Clients
- **Desktop Widget**: Windows 10/11 (64-bit)
- **Web Dashboard**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **WeChat Mini Program**: WeChat App 8.0+

---

## Quick Deploy

### 1. Clone the Repository

```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
```

### 2. Start Services

```bash
docker compose up -d
```

### 3. Get API Key

The admin account and API key are auto-generated on first run:

```bash
docker logs memopad-backend
```

Output example:
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

**Important**: Save the API key securely for later use.

### 4. Access the Application

| Service | URL |
|---------|-----|
| Web Dashboard | `http://YOUR_SERVER_IP` |
| Desktop Widget | Download from [Releases](https://github.com/Bryce199805/MemoPad/releases) |

---

## Firewall Configuration

Only HTTP port (default 80) needs to be open:

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80
sudo ufw allow 443  # For HTTPS

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

**Note**: The backend API port (3000) is proxied internally through Nginx and does not need to be exposed.

---

## Desktop Widget Setup

### Installation

1. Download the latest version from [Releases](https://github.com/Bryce199805/MemoPad/releases)
2. Run the installer (NSIS package)
3. Launch the application after installation

### Connection Configuration

1. Click the **⚙ Settings** button in the top right
2. In **Advanced Settings**, enter:
   - **Server URL**: `http://YOUR_SERVER_IP`
   - **API Key**: Obtained from server logs
3. Click **Test Connection** to verify
4. Save settings

### Features

| Feature | Description |
|---------|-------------|
| Quick Add | Click + button to quickly create todos/countdowns |
| Opacity | Adjust window transparency |
| Always on Top | Keep window above all others |
| Transparent Background | Enable glassmorphism effect |
| Theme | Dark/Light/Glass themes |
| System Tray | Minimize to tray with right-click menu |

---

## Configuration Details

### Environment Variables

Configure in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - GIN_MODE=release          # Run mode
      - DATA_DIR=/app/data        # Data directory
      # Optional: Pre-configure admin account
      # - ADMIN_USERNAME=admin
      # - ADMIN_PASSWORD=your_password
```

### Data Persistence

Data is stored in a Docker Volume:

```yaml
volumes:
  backend-data:  # Database and config storage
```

View volume location:
```bash
docker volume inspect memopad_backend-data
```

Data files:
- `memo.db` - SQLite database
- `api_key.txt` - API key storage (legacy, now stored in database)

### Port Configuration

Modify `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "8080:80"   # HTTP port
      - "8443:443"  # HTTPS port
```

### HTTPS Configuration

1. Prepare SSL certificates:
```bash
mkdir -p /opt/memopad/ssl
cp your-cert.pem /opt/memopad/ssl/cert.pem
cp your-key.pem /opt/memopad/ssl/key.pem
```

2. Update `docker-compose.yml`:
```yaml
services:
  web:
    volumes:
      - /opt/memopad/ssl:/etc/nginx/ssl:ro
```

3. Restart services:
```bash
docker compose down && docker compose up -d
```

---

## User Registration Control

### Disable Open Registration

1. Login to Web Dashboard as admin
2. Navigate to **Admin > Config**
3. Disable **Allow Registration**

After disabling, new users cannot self-register and must be created by an administrator.

### Create Users

1. Admin navigates to **Admin > Users**
2. Click **Add User**
3. Enter username, password, and email
4. Submit to create

---

## API Key Management

### View API Key

1. Login to Web Dashboard
2. Navigate to **Settings**
3. View in **API Key** section

### Regenerate API Key

Click **Regenerate** button in Settings.

**Note**: After regeneration, the old key becomes invalid immediately. All clients must be updated with the new key.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API Key required error | Verify API key is correct without extra spaces |
| Connection refused | Check if firewall allows the port |
| Desktop widget blank | Configure server URL and API Key in settings |
| Container won't start | Run `docker logs memopad-backend` for details |
| Login redirect fails | Clear browser cache, check routing config |
| Registration button disabled | Admin has disabled registration in system config |

### View Logs

```bash
# Backend logs
docker logs memopad-backend

# Web service logs
docker logs memopad-web

# Real-time logs
docker logs -f memopad-backend
```

### Restart Services

```bash
docker compose restart
```

### Complete Reset

```bash
# Stop and remove containers and data
docker compose down -v

# Restart (will reinitialize database)
docker compose up -d
```

---

## Data Backup

### Backup

```bash
# Create backup directory
mkdir -p ~/memopad-backup

# Copy volume contents
docker run --rm -v memopad_backend-data:/data -v ~/memopad-backup:/backup alpine cp -a /data /backup/
```

### Restore

```bash
# Stop services
docker compose down

# Restore data
docker run --rm -v memopad_backend-data:/data -v ~/memopad-backup:/backup alpine cp -a /backup/data/ /data/

# Restart services
docker compose up -d
```

---

## Upgrading

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

---

## Development Environment

### Backend Development

```bash
cd backend
go mod download
go run main.go
```

Backend runs at `http://localhost:3000`

### Web Frontend Development

```bash
cd web
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` with auto-proxy to backend

### Desktop App Development

```bash
cd desktop
npm install
npm run tauri dev
```

Requires Rust and Tauri CLI to be installed.

---

## More Information

- [Deployment Guide](DEPLOY.md) - Detailed production deployment
- [API Reference](API.md) - Complete API documentation

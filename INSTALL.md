# Installation Guide

This document covers system requirements, client setup, and local development. For Docker production deployment, see the [Deployment Guide](DEPLOY.md).

---

## System Requirements

### Server

- Docker 20.10+
- Docker Compose 2.0+
- OS: Any Linux distribution (Ubuntu 20.04+ recommended)
- Memory: Minimum 512MB RAM
- Storage: Minimum 1GB

### Clients

- **Desktop Widget**: Windows 10/11 (64-bit)
- **Web Dashboard**: Any modern browser (Chrome, Firefox, Safari, Edge)
- **WeChat Mini Program**: WeChat App 8.0+

---

## Quick Deploy

```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# Get admin credentials and API key from logs
docker logs memopad-backend
```

Access the web dashboard at `http://YOUR_SERVER_IP`. For full production setup (HTTPS, firewall, backup), see [DEPLOY.md](DEPLOY.md).

---

## Desktop Widget Setup

### Installation

1. Download the latest release from [GitHub Releases](https://github.com/Bryce199805/MemoPad/releases)
2. Run the installer (NSIS package)
3. Launch the application

### Connection Configuration

1. Click the **⚙ Settings** button (top right)
2. In **Advanced Settings**, enter:
   - **Server URL**: `http://YOUR_SERVER_IP`
   - **API Key**: From server logs (`docker logs memopad-backend`)
3. Click **Test Connection** to verify, then save

### Features

| Feature | Description |
|---------|-------------|
| Quick Add | + button to instantly create todos/countdowns |
| Opacity | Adjust window transparency |
| Always on Top | Keep widget above all other windows |
| Transparent Background | Glassmorphism effect |
| Theme | Dark / Light / Glass themes |
| Language | English / Chinese (中文) |
| System Tray | Minimize to tray; right-click for menu |

---

## WeChat Mini Program Setup

### Prerequisites

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- A WeChat developer account with a registered Mini Program AppID

### Configuration

1. Copy the example config:
   ```bash
   cp miniprogram/config.example.js miniprogram/config.js
   ```

2. Edit `miniprogram/config.js` and fill in your values:
   ```js
   const config = {
     baseUrl: 'https://your-server-ip-or-domain',
     appId: 'your-wechat-appid'
   }
   ```

3. Open WeChat Developer Tools, import the `miniprogram/` directory as a project, and set your AppID.

4. Click **Preview** or **Upload** to deploy to WeChat.

---

## User Registration Control

### Disable Open Registration

1. Login to the Web Dashboard as admin
2. Navigate to **Admin → Config**
3. Toggle off **Allow Registration**

Once disabled, new users cannot self-register. An admin account must create users manually through the WeChat Mini Program admin panel or directly via the API.

---

## API Key Management

### View API Key

1. Login to the Web Dashboard
2. Navigate to **Settings**
3. View in the **API Key** section (click the eye icon to reveal)

### Regenerate API Key

Click **Regenerate** in Settings. The old key is invalidated immediately — update all clients with the new key.

---

## i18n (Language Support)

The web dashboard and desktop widget both support **English** and **Chinese (Simplified)**. Language can be switched from within the application settings. The WeChat Mini Program also includes localization files for both languages.

---

## Development Environment

### Backend

```bash
cd backend
go mod download
go run main.go
```

Runs at `http://localhost:3000`.

### Web Frontend

```bash
cd web
npm install
npm run dev
```

Runs at `http://localhost:5173` with API requests automatically proxied to the backend.

### Desktop App

```bash
cd desktop
npm install
npm run tauri dev
```

**Prerequisites**: Rust toolchain and Tauri CLI. See the [Tauri Prerequisites Guide](https://tauri.app/start/prerequisites/) for platform-specific setup instructions.

---

## More Information

- [Deployment Guide](DEPLOY.md) — Production Docker deployment, HTTPS, backups
- [API Reference](API.md) — Complete API documentation

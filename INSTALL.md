# Installation Guide

## Prerequisites

- **Server**: Any server with Docker (for backend)
- **Clients**: Windows 10/11 (desktop), any modern browser (web)

## Server Setup

### 1. Deploy Backend

```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d
```

### 2. Get API Key

```bash
docker logs memopad-backend
```

Save the API key securely - you'll need it for all clients.

### 3. Access the API

The API will be available at `http://YOUR_SERVER_IP:3000`

## Client Setup

### Web Dashboard

**Option 1: Direct Access (Development)**

Configure your server's firewall to allow port 3000, then access:
```
http://YOUR_SERVER_IP:3000
```

Note: The backend only serves the API. For a proper web interface, use Option 2.

**Option 2: With Web Frontend (Recommended)**

1. Build the web app:
```bash
cd web
npm install
npm run build
```

2. Serve the `dist` folder with Nginx or Caddy (see [DEPLOY.md](DEPLOY.md))

3. Access via your domain or `http://YOUR_SERVER_IP`

### Desktop Widget (Windows)

**Option 1: Download from Releases (Recommended)**

1. Go to [Releases](https://github.com/Bryce199805/MemoPad/releases)
2. Download the latest `MemoDesk_x.x.x_x64-setup.exe`
3. Install and run
4. Enter your API Key in Settings

**Option 2: Build from Source**

Requirements: Rust, Node.js 22+

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build
cd desktop
npm install
npm run tauri build
```

The executable will be at `desktop/src-tauri/target/release/MemoDesk.exe`

## Configuration

### API Key

On first startup, the backend generates an API Key. You need this key to:
- Access the web interface
- Connect the desktop widget
- Access from other devices

If lost, delete `api_key.txt` on the server to regenerate.

### Change Port

Default port is 3000. Edit `compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:3000"  # Change 8080 to your desired port
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API Key required error | Verify the API key is correct |
| Connection refused | Check if backend is running, verify firewall rules |
| Desktop widget blank | Set API Key in widget settings |
| Docker container won't start | Run `docker logs memopad-backend` |

For more details, see [DEPLOY.md](DEPLOY.md).

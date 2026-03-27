# Installation Guide

## Prerequisites

- **OS**: Windows 10/11, macOS, Linux
- **Backend Server**: Any server with Docker or Go 1.23+

## Server Installation

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
```

2. Start with Docker Compose:
```bash
docker-compose up -d
```

3. Get the API Key from the container logs:
```bash
docker logs memopad-backend
```

### Option 2: Manual Installation

1. Install Go 1.23+:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install golang-go

# macOS
brew install go
```

2. Run the backend:
```bash
cd backend
go run main.go
```

## Client Installation

### Web Interface

1. Build the web app:
```bash
cd web
npm install
npm run build
```

2. Serve the `dist` folder with any web server (Nginx, Caddy, etc.)

3. Access the web interface and enter your API Key

### Desktop Widget (Windows)

1. Install Rust and Node.js:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js
# Download from https://nodejs.org/
```

2. Install Tauri CLI:
```bash
npm install -g @tauri-apps/cli
```

3. Build the desktop app:
```bash
cd desktop
npm install
npm run tauri build
```

4. Find the executable in:
```
desktop/src-tauri/target/release/MemoDesk.exe  # Windows
desktop/src-tauri/target/release/MemoDesk      # Linux/macOS
```

## Configuration

### API Key

On first startup, the backend generates an API Key. You need this key to:
- Access the web interface
- Connect the desktop widget
- Access from mobile devices

Save the API Key securely. If lost, delete `api_key.txt` on the server to regenerate.

### Port

Default port is 3000. To change, modify the `docker-compose.yml` or set `PORT` environment variable.

## Troubleshooting

### "API Key required" error
- Make sure you're using the correct API Key
- Check if the backend is running
- Verify network connectivity to the server

### Desktop widget shows blank
- Ensure API Key is configured in the widget settings
- Check if backend URL is correct (default: http://localhost:3000)

### Docker container won't start
```bash
docker logs memo-desk-backend
```
Check for error messages.

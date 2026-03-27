# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)

A desktop todo and countdown widget with multi-device sync.

## Features

### Desktop Widget

- **Floating Window**: Transparent, always-on-top widget that stays on your desktop
- **Glassmorphism UI**: Beautiful gradient background with blur effect
- **Quick Add**: Create todos instantly without opening the main app
- **Pinned Items**: Important tasks and countdowns displayed at the top
- **Position & Opacity**: Customize widget position and transparency

### Web Dashboard

- **Modern Interface**: Clean card-based design with smooth animations
- **Dark Mode**: Full dark theme support
- **Statistics**: Visual progress tracking and completion rates
- **Category Management**: Organize todos with custom categories and colors
- **Responsive**: Works on desktop, tablet, and mobile browsers

### Todo Management

- **Priority Levels**: High, Medium, Low with color coding
- **Pin to Top**: Keep important tasks visible
- **Categories**: Group and filter todos by custom categories
- **Completion Tracking**: Mark tasks done with visual feedback

### Countdown Timers

- **Visual Progress**: Progress bars show time remaining
- **Urgency Indicators**: Color-coded urgency (overdue, due soon, upcoming)
- **Pin Important Dates**: Keep critical countdowns at the top

### Multi-Device Sync

- **Unified API**: Single backend serves all clients
- **Real-time Updates**: Changes sync across devices instantly
- **Secure Access**: API key authentication for all endpoints

## Tech Stack

- **Backend**: Go 1.23 / Gin / GORM / SQLite
- **Desktop**: Tauri v2 / Vue 3 / TailwindCSS
- **Web**: Vue 3 / Vue Router / Pinia / TailwindCSS

## Quick Start

### Docker Deployment (Recommended)

```bash
# 1. Clone and start
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad
docker compose up -d

# 2. Get API Key
docker logs memopad-backend

# 3. Access web interface
# Open http://YOUR_SERVER_IP in browser
```

**Ports**: Only port 80 needs to be open. The backend API is proxied internally through Nginx.

### Development

```bash
# 1. Start backend
cd backend && go run main.go

# 2. Start web (new terminal)
cd web && npm install && npm run dev

# 3. Start desktop (new terminal)
cd desktop && npm install && npm run dev
```

## Desktop App

Download the Windows desktop widget from [Releases](https://github.com/Bryce199805/MemoPad/releases).

After installation, enter your server URL and API Key in settings.

## Project Structure

```
MemoPad/
├── backend/          # Go REST API
├── web/              # Vue 3 web dashboard (Docker + Nginx)
├── desktop/          # Tauri desktop widget
├── compose.yml       # Docker compose config
├── INSTALL.md        # Detailed installation guide
└── DEPLOY.md         # Deployment guide
```

## Documentation

- [Installation Guide](INSTALL.md) - Step-by-step setup instructions
- [Deployment Guide](DEPLOY.md) - Production deployment with Docker

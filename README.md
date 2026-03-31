# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**MemoPad** is a multi-platform task management application with a unified backend API serving multiple frontend clients: a web dashboard, desktop widget, and WeChat mini program.

---

## Overview

| Platform | Tech Stack | Description |
|----------|------------|-------------|
| Backend API | Go 1.23 / Gin / GORM / SQLite | RESTful API + WebSocket server |
| Web Dashboard | Vue 3 / Vue Router / Pinia / TailwindCSS | Responsive admin panel |
| Desktop Widget | Tauri 2.0 / Vue 3 / Rust | Windows floating widget |
| WeChat Mini Program | WeChat Mini Program Framework | Mobile access in WeChat |

---

## Features

### Core Features

#### Todo Management
- **Priority Levels**: High / Medium / Low with color coding
- **Pin to Top**: Keep important tasks visible
- **Categories**: Custom categories with colors
- **Due Dates**: Set task deadlines
- **Batch Operations**: Toggle, complete, or delete multiple todos at once
- **Completion Tracking**: Visual progress statistics

#### Countdown Timers
- **Visual Progress**: Progress bars show time remaining
- **Urgency Indicators**: Overdue / Due soon / Normal status
- **Pin Important Dates**: Keep critical countdowns at the top

#### Multi-Device Sync
- **Unified API**: Single backend serves all clients
- **Real-time Sync**: WebSocket pushes changes across devices instantly
- **Secure Authentication**: API Key based authentication

### Platform Features

#### Desktop Widget (Tauri)
- **Floating Window**: Transparent, always-on-top widget
- **Glassmorphism UI**: Beautiful gradient background with blur effect
- **Quick Add**: Create todos instantly without opening main app
- **Position & Opacity**: Customize widget position and transparency
- **System Tray**: Minimize to tray with context menu
- **Edge Snapping**: Window snaps to screen edges

#### Web Dashboard
- **Modern Interface**: Card-based design with smooth animations
- **Dark / Light Theme**: Full theme support with toggle
- **Statistics**: Visual progress tracking and completion rates
- **Responsive Design**: Desktop, tablet, and mobile support
- **Admin Panel**: User management, ticket handling, system config
- **i18n**: English and Chinese (Simplified) language support

#### WeChat Mini Program
- **Quick Access**: Use directly within WeChat
- **Full Features**: Todo and countdown management
- **Admin Entry**: Admin functions available in-app

---

## Quick Start

### Docker Deployment (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# 2. Start services
docker compose up -d

# 3. Get admin credentials and API key (auto-generated on first run)
docker logs memopad-backend

# 4. Access web interface
# Open http://YOUR_SERVER_IP in browser
```

**Ports**: Only port 80 (and 443 for HTTPS) need to be open. The backend runs internally and is proxied through Nginx.

### Development

```bash
# Backend
cd backend && go run main.go

# Web frontend (new terminal)
cd web && npm install && npm run dev

# Desktop app (new terminal) — requires Rust + Tauri CLI
cd desktop && npm install && npm run tauri dev
```

---

## Project Structure

```
MemoPad/
├── backend/                 # Go backend service
│   ├── main.go              # Single-file architecture: routes, models, handlers
│   ├── go.mod
│   └── Dockerfile
│
├── web/                     # Vue 3 web dashboard
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/          # Vue Router configuration
│   │   ├── stores/          # Pinia stores (auth, todo, countdown, category)
│   │   ├── i18n/            # vue-i18n setup
│   │   ├── locales/         # Translation files (en.json, zh.json)
│   │   ├── styles/          # Global CSS variables and design tokens
│   │   ├── views/           # Page components
│   │   │   ├── Dashboard.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── TodoManage.vue
│   │   │   ├── CountdownManage.vue
│   │   │   ├── Settings.vue
│   │   │   ├── Feedback.vue
│   │   │   └── admin/       # AdminDashboard, AdminUsers, AdminTickets, AdminConfig
│   │   ├── components/      # TodoItem.vue + ui/ (Badge, Button, Card, StatCard)
│   │   ├── layouts/         # DefaultLayout.vue
│   │   └── api/             # client.js, websocket.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf           # Nginx with rate limiting, WebSocket proxy, HTTPS
│
├── desktop/                 # Tauri desktop widget
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── components/      # TodoCard.vue
│   │   ├── stores/          # Pinia state management
│   │   ├── locales/         # i18n translations
│   │   └── style.css
│   ├── src-tauri/           # Rust backend
│   │   ├── src/main.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── package.json
│
├── miniprogram/             # WeChat mini program
│   ├── pages/               # login, dashboard, todos, countdowns, settings,
│   │                        # tickets, admin-dashboard
│   ├── components/
│   ├── utils/
│   ├── locales/             # en.js, zh.js
│   ├── images/
│   ├── config.example.js    # Copy to config.js and fill in AppID + server URL
│   └── app.json
│
├── .github/workflows/
│   └── build.yml            # Tauri desktop release build
│
├── docker-compose.yml       # Production deployment
├── README.md
├── INSTALL.md
├── DEPLOY.md
├── API.md
└── LICENSE
```

---

## User Roles

### Regular User
- Manage personal todos and countdowns
- Create and manage categories
- Submit feedback tickets
- View personal statistics
- Manage personal API key

### Administrator
- User management (view, disable, delete)
- Ticket handling (reply, update status)
- System configuration (enable/disable registration)
- Global statistics

---

## Documentation

| Document | Description |
|----------|-------------|
| [INSTALL.md](INSTALL.md) | Client setup, WeChat mini program, development environment |
| [DEPLOY.md](DEPLOY.md) | Production Docker deployment, HTTPS, backup, monitoring |
| [API.md](API.md) | Complete REST API and WebSocket reference |

---

## License

[MIT License](LICENSE)

---

## Contributing

Issues and Pull Requests are welcome!

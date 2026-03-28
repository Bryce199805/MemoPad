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
| Backend API | Go 1.23 / Gin / GORM / SQLite | RESTful API server |
| Web Dashboard | Vue 3 / Vue Router / Pinia / TailwindCSS | Responsive admin panel |
| Desktop Widget | Tauri 2.0 / Vue 3 / Rust | Windows floating widget |
| WeChat Mini Program | WeChat Mini Program Framework | Mobile access in WeChat |

---

## Features

### Core Features

#### Todo Management
- **Priority Levels**: High/Medium/Low with color coding
- **Pin to Top**: Keep important tasks visible
- **Categories**: Custom categories with colors
- **Due Dates**: Set task deadlines
- **Completion Tracking**: Visual progress statistics

#### Countdown Timers
- **Visual Progress**: Progress bars show time remaining
- **Urgency Indicators**: Overdue/Due soon/Normal status
- **Pin Important Dates**: Keep critical countdowns at the top

#### Multi-Device Sync
- **Unified API**: Single backend serves all clients
- **Real-time Sync**: Changes sync across devices instantly
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
- **Dark Mode**: Full dark theme support
- **Statistics**: Visual progress tracking and completion rates
- **Responsive Design**: Desktop, tablet, and mobile support
- **Admin Panel**: User management, ticket handling, system config

#### WeChat Mini Program
- **Quick Access**: Use directly within WeChat
- **Full Features**: Todo and countdown management
- **Admin Entry**: Admin functions available

---

## Quick Start

### Docker Deployment (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# 2. Start services
docker compose up -d

# 3. Get API Key (auto-generated on first run)
docker logs memopad-backend

# 4. Access web interface
# Open http://YOUR_SERVER_IP in browser
```

**Ports**: Only port 80 needs to be open. The backend API is proxied internally through Nginx.

### Development

```bash
# Backend
cd backend && go run main.go

# Web frontend (new terminal)
cd web && npm install && npm run dev

# Desktop app (new terminal)
cd desktop && npm install && npm run tauri dev
```

---

## Project Structure

```
MemoPad/
├── backend/                 # Go backend service
│   ├── main.go              # Main program (single file architecture)
│   ├── go.mod               # Go module definition
│   └── Dockerfile           # Docker build file
│
├── web/                     # Vue 3 web dashboard
│   ├── src/
│   │   ├── main.js          # Entry point
│   │   ├── App.vue          # Root component
│   │   ├── router/          # Vue Router configuration
│   │   ├── stores/          # Pinia state management
│   │   ├── views/           # Page components
│   │   │   ├── Dashboard.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── TodoManage.vue
│   │   │   ├── CountdownManage.vue
│   │   │   ├── Settings.vue
│   │   │   ├── Feedback.vue
│   │   │   └── admin/       # Admin pages
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Layout components
│   │   └── api/             # API client
│   ├── package.json
│   ├── Dockerfile           # Docker build file
│   └── nginx.conf           # Nginx config with rate limiting
│
├── desktop/                 # Tauri desktop app
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue          # Main widget UI
│   │   ├── stores/          # Pinia state management
│   │   └── locales/         # i18n translations
│   ├── src-tauri/           # Rust backend
│   │   ├── src/main.rs      # Tauri main program
│   │   ├── Cargo.toml       # Rust dependencies
│   │   └── tauri.conf.json  # Tauri configuration
│   └── package.json
│
├── miniprogram/             # WeChat mini program
│   ├── pages/               # Pages
│   │   ├── login/           # Login page
│   │   ├── dashboard/       # Dashboard
│   │   ├── todos/           # Todo management
│   │   ├── countdowns/      # Countdowns
│   │   ├── settings/        # Settings
│   │   ├── tickets/         # Feedback tickets
│   │   └── admin-dashboard/ # Admin panel
│   ├── components/          # Reusable components
│   ├── utils/               # Utility functions
│   └── app.json             # Mini program config
│
├── .github/workflows/       # GitHub Actions
│   └── build.yml            # Tauri build workflow
│
├── docker-compose.yml       # Production deployment
├── compose.yml              # Development deployment
├── README.md
├── INSTALL.md
├── DEPLOY.md
├── API.md
└── LICENSE
```

---

## API Endpoints

### Authentication `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login with credentials | No |
| GET | `/verify` | Verify API key | Yes |
| GET | `/check-admin` | Check if admin exists | No |
| GET | `/api-key` | Get current API key | Yes |
| POST | `/api-key/regenerate` | Regenerate API key | Yes |

### Todos `/api/todos`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all todos |
| POST | `/` | Create todo |
| PUT | `/:id` | Update todo |
| DELETE | `/:id` | Delete todo |
| PATCH | `/:id/toggle` | Toggle done status |
| PATCH | `/:id/pin` | Toggle pinned status |

### Countdowns `/api/countdowns`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all countdowns |
| POST | `/` | Create countdown |
| PUT | `/:id` | Update countdown |
| DELETE | `/:id` | Delete countdown |

### Categories `/api/categories`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List categories |
| POST | `/` | Create category |
| PUT | `/:id` | Update category |
| DELETE | `/:id` | Delete category |

### Statistics `/api/stats`

- Returns todo completion rate, priority breakdown, countdown statistics

### Tickets `/api/tickets`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's tickets |
| POST | `/` | Create ticket |
| GET | `/:id` | Get ticket details |

### Admin `/api/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| PATCH | `/users/:id/disable` | Disable user |
| PATCH | `/users/:id/enable` | Enable user |
| DELETE | `/users/:id` | Delete user |
| GET | `/config` | Get system config |
| PUT | `/config` | Update system config |
| GET | `/stats` | System statistics |
| GET | `/tickets` | List all tickets |
| PUT | `/tickets/:id` | Update ticket |
| DELETE | `/tickets/:id` | Delete ticket |

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
- No personal task management features

---

## Security Features

1. **Authentication**
   - bcrypt password hashing
   - API Key format: `mp_` prefix + 64 hex characters
   - API key regeneration support

2. **Access Control**
   - Role-based permissions (admin/user)
   - User data isolation
   - Admin-only endpoints protection

3. **Rate Limiting**
   - Backend: IP-based rate limiting with auto-blocking
   - Nginx: Request frequency and connection limits

4. **HTTPS/TLS**
   - TLS 1.2 / 1.3 support
   - Secure cipher suites

---

## Data Storage

- **Database**: SQLite (`memo.db`)
- **Location**: `/app/data/` in Docker container
- **Persistence**: Docker Volume `backend-data`
- **Backup**: Simple directory copy

---

## Downloads

- **Desktop App**: [GitHub Releases](https://github.com/Bryce199805/MemoPad/releases)

---

## Documentation

- [Installation Guide](INSTALL.md) - Detailed installation steps
- [Deployment Guide](DEPLOY.md) - Production deployment with Docker
- [API Reference](API.md) - Complete API documentation

---

## License

[MIT License](LICENSE)

---

## Contributing

Issues and Pull Requests are welcome!

# MemoPad

[![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)](https://golang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)](https://tauri.app/)

A desktop todo and countdown widget with multi-device sync.

## Features

| Feature | Description |
|---------|-------------|
| Desktop Widget | Floating transparent window, glassmorphism effect, always on top |
| Web Dashboard | Responsive interface, dark mode, full CRUD operations |
| Multi-device Sync | Unified API, real-time sync across devices |
| Todo Management | Priority levels, pin to top, categories, completion tracking |
| Countdown Timers | Target date tracking, progress visualization, urgency indicators |
| i18n | English and Chinese support |

## Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      MemoPad                            │
├─────────────────────┬───────────────────────────────────┤
│   Desktop Client    │          Web Dashboard            │
│   Tauri + Vue 3     │        Vue 3 + Pinia              │
│   TailwindCSS       │      Vue Router + TailwindCSS     │
└─────────┬───────────┴───────────────┬───────────────────┘
          │                           │
          └───────────┬───────────────┘
                      │
          ┌───────────┴───────────┐
          │      REST API         │
          │   Go + Gin + GORM     │
          └───────────┬───────────┘
                      │
          ┌───────────┴───────────┐
          │       SQLite          │
          └───────────────────────┘
```

## Quick Start

### Development

```bash
# 1. Start backend
cd backend && go run main.go

# 2. Start web (new terminal)
cd web && npm install && npm run dev

# 3. Start desktop (new terminal)
cd desktop && npm install && npm run dev
```

### Docker Deployment

```bash
docker compose up -d
docker logs memopad-backend  # Get auto-generated API Key
```

## API Reference

All endpoints require `X-API-Key` header for authentication.

### Todos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | List all todos |
| POST | `/api/todos` | Create todo |
| PUT | `/api/todos/:id` | Update todo |
| DELETE | `/api/todos/:id` | Delete todo |
| PATCH | `/api/todos/:id/toggle` | Toggle done status |
| PATCH | `/api/todos/:id/pin` | Toggle pinned status |

### Countdowns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/countdowns` | List all countdowns |
| POST | `/api/countdowns` | Create countdown |
| PUT | `/api/countdowns/:id` | Update countdown |
| DELETE | `/api/countdowns/:id` | Delete countdown |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Project Structure

```
MemoPad/
├── backend/          # Go backend service
│   ├── main.go       # Entry point
│   ├── Dockerfile    # Docker build
│   └── go.mod        # Dependencies
├── web/              # Vue 3 web app
│   └── src/
│       ├── views/    # Page components
│       ├── stores/   # Pinia stores
│       └── api/      # API client
├── desktop/          # Tauri desktop app
│   ├── src/          # Vue frontend
│   └── src-tauri/    # Rust config
├── compose.yml
├── INSTALL.md        # Installation guide
└── DEPLOY.md         # Deployment guide
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `VITE_API_URL` | http://localhost:3000 | API base URL |

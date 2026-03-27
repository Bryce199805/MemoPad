# MemoPad

A beautiful desktop widget and web dashboard for managing todos and countdowns with multi-device sync.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go](https://img.shields.io/badge/Go-1.23+-00ADD8.svg)
![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0+-24C8D8.svg)

## Features

- **Desktop Widget**: Floating transparent widget with glassmorphism effect, always on top
- **Web Dashboard**: Modern responsive management interface with dark mode
- **Multi-device Sync**: Single API serves all your devices
- **Todo Management**: Priority levels, pin to top, categories, completion tracking
- **Countdown Timers**: Track important dates with visual progress indicators
- **i18n**: English and Chinese language support
- **Secure**: API key authentication, input validation, CORS protection

## Screenshots

Desktop Widget:
- Gradient purple-blue theme with glassmorphism
- Pinned items section for important tasks
- Real-time countdown with color-coded urgency

Web Dashboard:
- Modern card-based UI with smooth animations
- Statistics overview with progress visualization
- Full CRUD operations for todos, countdowns, categories

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Desktop Widget │     │  Web Interface  │
│   (Tauri/Vue)   │     │    (Vue.js)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │   Go API    │
              │  (Port 3000)│
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              │   SQLite    │
              └─────────────┘
```

## Tech Stack

- **Backend**: Go 1.23+ / Gin / GORM / SQLite
- **Desktop**: Tauri v2 / Vue 3 / TailwindCSS
- **Web**: Vue 3 / Vue Router / Pinia / TailwindCSS
- **Deployment**: Docker / docker-compose

## Quick Start

### Prerequisites

- Go 1.23+
- Node.js 22+ (LTS)
- Docker (for deployment)
- Rust (for desktop build)

### Development

1. Start backend:
```bash
cd backend
go run main.go
```

2. Start web interface:
```bash
cd web
npm install
npm run dev
```

3. Start desktop widget:
```bash
cd desktop
npm install
npm run dev
```

## Docker Deployment

```bash
docker-compose up -d
```

The API key will be displayed on first startup. Save it securely.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |

## API Endpoints

All endpoints require `X-API-Key` header.

- `GET /api/todos` - List all todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `PATCH /api/todos/:id/toggle` - Toggle done
- `PATCH /api/todos/:id/pin` - Pin/unpin
- `GET /api/countdowns` - List countdowns
- `POST /api/countdowns` - Create countdown
- `PUT /api/countdowns/:id` - Update countdown
- `DELETE /api/countdowns/:id` - Delete countdown
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/stats` - Get statistics

## License

MIT

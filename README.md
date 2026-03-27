# MemoDesk

A desktop widget and web manager for todos and countdowns with multi-device sync.

## Features

- **Desktop Widget**: Floating transparent widget for Windows with frosted glass effect
- **Web Admin Interface**: Full-featured management dashboard
- **Multi-device Sync**: Access your data from any device via cloud server
- **Todo Management**: Priority (High/Medium/Low), Pin to top, Categories
- **Countdown**: Track important dates with countdown timers
- **i18n**: English and Chinese language support
- **API Key Authentication**: Secure access to your data

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

- **Backend**: Go + Gin + GORM + SQLite
- **Desktop**: Tauri v2 + Vue 3 + TailwindCSS
- **Web**: Vue 3 + Vue Router + Pinia + TailwindCSS
- **Container**: Docker

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker (for deployment)

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

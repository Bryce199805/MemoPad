# Changelog

All notable changes to MemoPad are documented here.

---

## [0.7.0] - 2026-03-31

First public test release.

### Features

#### Core
- **Todo Management** — priority levels (high/medium/low), categories with custom colors, due dates, pin to top, batch complete/delete/toggle
- **Countdown Timers** — visual progress, urgency indicators (overdue/due soon/normal), pin important dates
- **Multi-Device Sync** — WebSocket real-time push across all connected clients
- **API Key Authentication** — secure token for desktop and mobile clients

#### Web Dashboard
- Responsive card-based UI with dark/light theme toggle
- Full i18n support: English and Chinese (Simplified)
- Statistics dashboard with completion rate, priority breakdown, upcoming deadlines
- Admin panel: user management (view/disable/delete), ticket handling, system configuration (enable/disable registration)
- Ticket system with multi-reply threads, unread badge on sidebar nav, user-initiated close
- Two-column layout on Feedback and Settings pages

#### Desktop Widget (Windows)
- Floating transparent always-on-top window with glassmorphism UI
- Quick add todos/countdowns without opening main app
- Adjustable opacity and position, edge snapping
- System tray with context menu
- Dark/Light/Glass themes, English/Chinese language
- Windows NSIS installer, auto-built via GitHub Actions

#### WeChat Mini Program
- Full todo and countdown management within WeChat
- Admin entry for admin users
- i18n: English and Chinese

#### Backend
- Go 1.23 / Gin / GORM / SQLite single-binary server
- RESTful API + WebSocket server on port 3000
- Docker deployment with Nginx reverse proxy (port 80/443)
- Rate limiting, CORS configuration, IDOR protection
- Auto-close resolved tickets after 3 days

### Improvements

- Admin ticket list rewritten as paginated table with search, status dropdown selector, and reply thread modal
- Feedback page uses two-column grid layout for better space utilization
- Unread reply badge on Feedback sidebar nav item
- Resolved tickets automatically closed after 3 days
- Login error messages mapped to i18n keys
- Username validation: letters, numbers, underscores only (3–50 chars)
- Security: IDOR prevention in create handlers, failed-login-only rate limiting

### Bug Fixes

- Browser tab title corrected from "MemoDesk" to "MemoPad"
- Added favicon (SVG, matches sidebar logo)
- Dashboard nav active state no longer always highlighted
- Various hardcoded strings replaced with i18n keys across web and miniprogram
- Fixed duplicate content between INSTALL.md and DEPLOY.md
- Corrected API documentation field names and missing endpoints

---

[0.7.0]: https://github.com/Bryce199805/MemoPad/releases/tag/v0.7.0

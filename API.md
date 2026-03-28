# API Reference

This document provides detailed description of all MemoPad backend API endpoints.

---

## Basic Information

- **Base URL**: `http://YOUR_SERVER_IP/api`
- **Authentication**: API Key via `X-API-Key` request header
- **Content Format**: JSON
- **Character Encoding**: UTF-8

---

## Authentication

### API Key Format

```
mp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Prefix: `mp_`
- Length: 67 characters (3-char prefix + 64-char hex)

### Request Example

```bash
curl -X GET http://localhost/api/todos \
  -H "X-API-Key: mp_your_api_key_here"
```

### Authentication Errors

```json
{
  "error": "API key required"
}
```

```json
{
  "error": "Invalid API key"
}
```

---

## Authentication Endpoints `/api/auth`

### Register User

**POST** `/api/auth/register`

Create a new user account.

**Request Body**:
```json
{
  "username": "string (3-50 chars)",
  "password": "string (min 6 chars)",
  "email": "string (optional)"
}
```

**Response** `201`:
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "api_key": "mp_xxxx..."
}
```

**Error Responses**:
- `400`: Username already exists / Invalid parameters
- `403`: Registration is closed

---

### Login

**POST** `/api/auth/login`

Login with username and password.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response** `200`:
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "disabled": false,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "api_key": "mp_xxxx..."
}
```

**Error Responses**:
- `401`: Invalid username or password
- `403`: Account is disabled

---

### Verify API Key

**GET** `/api/auth/verify`

Verify if the current API key is valid.

**Response** `200`:
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "john",
    "role": "user"
  }
}
```

**Error Responses**:
- `401`: Invalid API key

---

### Check Admin Exists

**GET** `/api/auth/check-admin`

Check if an admin account exists in the system.

**Response** `200`:
```json
{
  "exists": true
}
```

---

### Get API Key

**GET** `/api/auth/api-key`

Get the current user's API key.

**Response** `200`:
```json
{
  "api_key": "mp_xxxx..."
}
```

---

### Regenerate API Key

**POST** `/api/auth/api-key/regenerate`

Generate a new API key. The old key becomes invalid immediately.

**Response** `200`:
```json
{
  "message": "API key regenerated",
  "api_key": "mp_new_key..."
}
```

---

## Todo Endpoints `/api/todos`

### List Todos

**GET** `/api/todos`

Get all todos for the current user.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "content": "Complete project documentation",
      "priority": "high",
      "done": false,
      "pinned": true,
      "due_date": "2024-02-01T00:00:00Z",
      "category_id": 1,
      "category": {
        "id": 1,
        "name": "Work",
        "color": "#3B82F6"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

---

### Create Todo

**POST** `/api/todos`

Create a new todo.

**Request Body**:
```json
{
  "content": "string (required)",
  "priority": "high|medium|low (default: medium)",
  "due_date": "ISO8601 date (optional)",
  "category_id": "number (optional)",
  "pinned": "boolean (default: false)"
}
```

**Response** `201`:
```json
{
  "message": "Todo created",
  "todo": {
    "id": 1,
    "content": "New task",
    "priority": "medium",
    "done": false,
    "pinned": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Update Todo

**PUT** `/api/todos/:id`

Update a specific todo.

**Request Body**:
```json
{
  "content": "string (optional)",
  "priority": "high|medium|low (optional)",
  "due_date": "ISO8601 date or null (optional)",
  "category_id": "number or null (optional)",
  "pinned": "boolean (optional)"
}
```

**Response** `200`:
```json
{
  "message": "Todo updated",
  "todo": { ... }
}
```

---

### Delete Todo

**DELETE** `/api/todos/:id`

Delete a specific todo.

**Response** `200`:
```json
{
  "message": "Todo deleted"
}
```

---

### Toggle Done Status

**PATCH** `/api/todos/:id/toggle`

Toggle the done status of a todo.

**Response** `200`:
```json
{
  "message": "Todo toggled",
  "todo": {
    "id": 1,
    "done": true,
    ...
  }
}
```

---

### Toggle Pinned Status

**PATCH** `/api/todos/:id/pin`

Toggle the pinned status of a todo.

**Response** `200`:
```json
{
  "message": "Pin status updated",
  "todo": {
    "id": 1,
    "pinned": true,
    ...
  }
}
```

---

## Countdown Endpoints `/api/countdowns`

### List Countdowns

**GET** `/api/countdowns`

Get all countdowns for the current user.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Project Deadline",
      "target_date": "2024-06-01T00:00:00Z",
      "priority": "high",
      "pinned": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Create Countdown

**POST** `/api/countdowns`

Create a new countdown.

**Request Body**:
```json
{
  "title": "string (required)",
  "target_date": "ISO8601 date (required)",
  "priority": "high|medium|low (default: medium)",
  "pinned": "boolean (default: false)"
}
```

**Response** `201`:
```json
{
  "message": "Countdown created",
  "countdown": { ... }
}
```

---

### Update Countdown

**PUT** `/api/countdowns/:id`

Update a specific countdown.

**Request Body**:
```json
{
  "title": "string (optional)",
  "target_date": "ISO8601 date (optional)",
  "priority": "high|medium|low (optional)",
  "pinned": "boolean (optional)"
}
```

**Response** `200`:
```json
{
  "message": "Countdown updated",
  "countdown": { ... }
}
```

---

### Delete Countdown

**DELETE** `/api/countdowns/:id`

Delete a specific countdown.

**Response** `200`:
```json
{
  "message": "Countdown deleted"
}
```

---

## Category Endpoints `/api/categories`

### List Categories

**GET** `/api/categories`

Get all categories for the current user.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Work",
      "color": "#3B82F6",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Create Category

**POST** `/api/categories`

Create a new category.

**Request Body**:
```json
{
  "name": "string (required)",
  "color": "hex color (default: #6B7280)"
}
```

**Response** `201`:
```json
{
  "message": "Category created",
  "category": { ... }
}
```

---

### Update Category

**PUT** `/api/categories/:id`

Update a specific category.

**Request Body**:
```json
{
  "name": "string (optional)",
  "color": "hex color (optional)"
}
```

**Response** `200`:
```json
{
  "message": "Category updated",
  "category": { ... }
}
```

---

### Delete Category

**DELETE** `/api/categories/:id`

Delete a specific category. Associated todos will be unlinked.

**Response** `200`:
```json
{
  "message": "Category deleted"
}
```

---

## Stats Endpoint `/api/stats`

### Get Statistics

**GET** `/api/stats`

Get statistics for the current user.

**Response** `200`:
```json
{
  "data": {
    "todos": {
      "total": 20,
      "done": 8,
      "pending": 12,
      "completion_rate": 40,
      "by_priority": {
        "high": 5,
        "medium": 10,
        "low": 5
      }
    },
    "countdowns": {
      "total": 5,
      "due_soon": 2,
      "overdue": 1
    }
  }
}
```

---

## Ticket Endpoints `/api/tickets`

### List Tickets

**GET** `/api/tickets`

Get tickets for the current user.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "subject": "Feature request",
      "message": "I would like to suggest...",
      "status": "open",
      "reply": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Create Ticket

**POST** `/api/tickets`

Create a new ticket.

**Request Body**:
```json
{
  "subject": "string (required)",
  "message": "string (required)"
}
```

**Response** `201`:
```json
{
  "message": "Ticket created",
  "ticket": { ... }
}
```

---

### Get Ticket Details

**GET** `/api/tickets/:id`

Get details of a specific ticket.

**Response** `200`:
```json
{
  "data": {
    "id": 1,
    "subject": "Feature request",
    "message": "I would like to suggest...",
    "status": "resolved",
    "reply": "Thank you for your suggestion!",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T09:00:00Z"
  }
}
```

---

## Admin Endpoints `/api/admin`

All admin endpoints require user role to be `admin`.

### List Users

**GET** `/api/admin/users`

Get all users with statistics.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "role": "user",
      "disabled": false,
      "created_at": "2024-01-15T10:30:00Z",
      "stats": {
        "todos": 15,
        "countdowns": 3
      }
    }
  ]
}
```

---

### Disable User

**PATCH** `/api/admin/users/:id/disable`

Disable a user account.

**Response** `200`:
```json
{
  "message": "User disabled"
}
```

---

### Enable User

**PATCH** `/api/admin/users/:id/enable`

Enable a user account.

**Response** `200`:
```json
{
  "message": "User enabled"
}
```

---

### Delete User

**DELETE** `/api/admin/users/:id`

Delete a user and all their data.

**Response** `200`:
```json
{
  "message": "User deleted"
}
```

---

### Get System Config

**GET** `/api/admin/config`

Get system configuration.

**Response** `200`:
```json
{
  "data": {
    "registration_enabled": true
  }
}
```

---

### Update System Config

**PUT** `/api/admin/config`

Update system configuration.

**Request Body**:
```json
{
  "registration_enabled": false
}
```

**Response** `200`:
```json
{
  "message": "Config updated",
  "config": { ... }
}
```

---

### Get System Statistics

**GET** `/api/admin/stats`

Get global system statistics.

**Response** `200`:
```json
{
  "data": {
    "users": {
      "total": 50,
      "active": 45,
      "disabled": 5
    },
    "todos": {
      "total": 500,
      "completed": 200
    },
    "countdowns": {
      "total": 100
    },
    "tickets": {
      "total": 20,
      "open": 5
    }
  }
}
```

---

### List All Tickets

**GET** `/api/admin/tickets`

Get all tickets from all users.

**Response** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "username": "john",
      "subject": "Bug report",
      "message": "...",
      "status": "open",
      "reply": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Update Ticket

**PUT** `/api/admin/tickets/:id`

Update ticket status and reply.

**Request Body**:
```json
{
  "status": "open|in_progress|resolved|closed",
  "reply": "string (optional)"
}
```

**Response** `200`:
```json
{
  "message": "Ticket updated",
  "ticket": { ... }
}
```

---

### Delete Ticket

**DELETE** `/api/admin/tickets/:id`

Delete a ticket.

**Response** `200`:
```json
{
  "message": "Ticket deleted"
}
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / Invalid parameters |
| 401 | Unauthorized / Authentication failed |
| 403 | Forbidden / Insufficient permissions |
| 404 | Resource not found |
| 429 | Too many requests |
| 500 | Internal server error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General API | 10 req/s, burst 30 |
| Login/Register | 5 req/min |
| Admin Endpoints | 10 req/s, burst 20 |
| Concurrent Connections | 20 per IP |

Exceeding limits returns `429 Too Many Requests`.

---

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| id | number | User ID |
| username | string | Username (3-50 chars) |
| email | string | Email address |
| role | string | Role (admin/user) |
| disabled | boolean | Whether disabled |
| created_at | datetime | Created timestamp |

### Todo

| Field | Type | Description |
|-------|------|-------------|
| id | number | Todo ID |
| content | string | Todo content |
| priority | string | Priority (high/medium/low) |
| done | boolean | Whether completed |
| pinned | boolean | Whether pinned |
| due_date | datetime | Due date |
| category_id | number | Category ID |
| created_at | datetime | Created timestamp |
| updated_at | datetime | Updated timestamp |

### Countdown

| Field | Type | Description |
|-------|------|-------------|
| id | number | Countdown ID |
| title | string | Title |
| target_date | datetime | Target date |
| priority | string | Priority |
| pinned | boolean | Whether pinned |
| created_at | datetime | Created timestamp |

### Category

| Field | Type | Description |
|-------|------|-------------|
| id | number | Category ID |
| name | string | Category name |
| color | string | Color (hex) |
| created_at | datetime | Created timestamp |

### Ticket

| Field | Type | Description |
|-------|------|-------------|
| id | number | Ticket ID |
| subject | string | Subject |
| message | string | Message content |
| status | string | Status (open/in_progress/resolved/closed) |
| reply | string | Admin reply |
| created_at | datetime | Created timestamp |
| updated_at | datetime | Updated timestamp |

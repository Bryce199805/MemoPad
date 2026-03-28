# API 参考文档

本文档详细描述 MemoPad 后端 API 的所有接口。

---

## 基础信息

- **Base URL**: `http://YOUR_SERVER_IP/api`
- **认证方式**: API Key 通过 `X-API-Key` 请求头传递
- **内容格式**: JSON
- **字符编码**: UTF-8

---

## 认证说明

### API Key 格式

```
mp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- 前缀：`mp_`
- 长度：67 字符（前缀 3 字符 + 64 字符十六进制）

### 请求示例

```bash
curl -X GET http://localhost/api/todos \
  -H "X-API-Key: mp_your_api_key_here"
```

### 认证错误

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

## 认证接口 `/api/auth`

### 用户注册

**POST** `/api/auth/register`

创建新用户账户。

**请求体**:
```json
{
  "username": "string (3-50 chars)",
  "password": "string (min 6 chars)",
  "email": "string (optional)"
}
```

**响应** `201`:
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

**错误响应**:
- `400`: 用户名已存在 / 参数无效
- `403`: 注册已关闭

---

### 用户登录

**POST** `/api/auth/login`

使用用户名和密码登录。

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应** `200`:
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

**错误响应**:
- `401`: 用户名或密码错误
- `403`: 账户已被禁用

---

### 验证 API Key

**GET** `/api/auth/verify`

验证当前 API Key 是否有效。

**响应** `200`:
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

**错误响应**:
- `401`: API Key 无效

---

### 检查管理员存在

**GET** `/api/auth/check-admin`

检查系统是否已存在管理员账户。

**响应** `200`:
```json
{
  "exists": true
}
```

---

### 获取 API Key

**GET** `/api/auth/api-key`

获取当前用户的 API Key。

**响应** `200`:
```json
{
  "api_key": "mp_xxxx..."
}
```

---

### 重新生成 API Key

**POST** `/api/auth/api-key/regenerate`

重新生成 API Key，旧 Key 立即失效。

**响应** `200`:
```json
{
  "message": "API key regenerated",
  "api_key": "mp_new_key..."
}
```

---

## 任务接口 `/api/todos`

### 获取任务列表

**GET** `/api/todos`

获取当前用户的所有任务。

**响应** `200`:
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

### 创建任务

**POST** `/api/todos`

创建新任务。

**请求体**:
```json
{
  "content": "string (required)",
  "priority": "high|medium|low (default: medium)",
  "due_date": "ISO8601 date (optional)",
  "category_id": "number (optional)",
  "pinned": "boolean (default: false)"
}
```

**响应** `201`:
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

### 更新任务

**PUT** `/api/todos/:id`

更新指定任务。

**请求体**:
```json
{
  "content": "string (optional)",
  "priority": "high|medium|low (optional)",
  "due_date": "ISO8601 date or null (optional)",
  "category_id": "number or null (optional)",
  "pinned": "boolean (optional)"
}
```

**响应** `200`:
```json
{
  "message": "Todo updated",
  "todo": { ... }
}
```

---

### 删除任务

**DELETE** `/api/todos/:id`

删除指定任务。

**响应** `200`:
```json
{
  "message": "Todo deleted"
}
```

---

### 切换完成状态

**PATCH** `/api/todos/:id/toggle`

切换任务的完成状态。

**响应** `200`:
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

### 切换置顶状态

**PATCH** `/api/todos/:id/pin`

切换任务的置顶状态。

**响应** `200`:
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

## 倒计时接口 `/api/countdowns`

### 获取倒计时列表

**GET** `/api/countdowns`

获取当前用户的所有倒计时。

**响应** `200`:
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

### 创建倒计时

**POST** `/api/countdowns`

创建新倒计时。

**请求体**:
```json
{
  "title": "string (required)",
  "target_date": "ISO8601 date (required)",
  "priority": "high|medium|low (default: medium)",
  "pinned": "boolean (default: false)"
}
```

**响应** `201`:
```json
{
  "message": "Countdown created",
  "countdown": { ... }
}
```

---

### 更新倒计时

**PUT** `/api/countdowns/:id`

更新指定倒计时。

**请求体**:
```json
{
  "title": "string (optional)",
  "target_date": "ISO8601 date (optional)",
  "priority": "high|medium|low (optional)",
  "pinned": "boolean (optional)"
}
```

**响应** `200`:
```json
{
  "message": "Countdown updated",
  "countdown": { ... }
}
```

---

### 删除倒计时

**DELETE** `/api/countdowns/:id`

删除指定倒计时。

**响应** `200`:
```json
{
  "message": "Countdown deleted"
}
```

---

## 分类接口 `/api/categories`

### 获取分类列表

**GET** `/api/categories`

获取当前用户的所有分类。

**响应** `200`:
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

### 创建分类

**POST** `/api/categories`

创建新分类。

**请求体**:
```json
{
  "name": "string (required)",
  "color": "hex color (default: #6B7280)"
}
```

**响应** `201`:
```json
{
  "message": "Category created",
  "category": { ... }
}
```

---

### 更新分类

**PUT** `/api/categories/:id`

更新指定分类。

**请求体**:
```json
{
  "name": "string (optional)",
  "color": "hex color (optional)"
}
```

**响应** `200`:
```json
{
  "message": "Category updated",
  "category": { ... }
}
```

---

### 删除分类

**DELETE** `/api/categories/:id`

删除指定分类。删除后会解除与任务的关联。

**响应** `200`:
```json
{
  "message": "Category deleted"
}
```

---

## 统计接口 `/api/stats`

### 获取统计数据

**GET** `/api/stats`

获取当前用户的统计数据。

**响应** `200`:
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

## 工单接口 `/api/tickets`

### 获取工单列表

**GET** `/api/tickets`

获取当前用户的工单列表。

**响应** `200`:
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

### 创建工单

**POST** `/api/tickets`

创建新工单。

**请求体**:
```json
{
  "subject": "string (required)",
  "message": "string (required)"
}
```

**响应** `201`:
```json
{
  "message": "Ticket created",
  "ticket": { ... }
}
```

---

### 获取工单详情

**GET** `/api/tickets/:id`

获取指定工单的详情。

**响应** `200`:
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

## 管理员接口 `/api/admin`

所有管理员接口需要用户角色为 `admin`。

### 获取用户列表

**GET** `/api/admin/users`

获取所有用户列表及统计信息。

**响应** `200`:
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

### 禁用用户

**PATCH** `/api/admin/users/:id/disable`

禁用指定用户账户。

**响应** `200`:
```json
{
  "message": "User disabled"
}
```

---

### 启用用户

**PATCH** `/api/admin/users/:id/enable`

启用指定用户账户。

**响应** `200`:
```json
{
  "message": "User enabled"
}
```

---

### 删除用户

**DELETE** `/api/admin/users/:id`

删除指定用户及其所有数据。

**响应** `200`:
```json
{
  "message": "User deleted"
}
```

---

### 获取系统配置

**GET** `/api/admin/config`

获取系统配置。

**响应** `200`:
```json
{
  "data": {
    "registration_enabled": true
  }
}
```

---

### 更新系统配置

**PUT** `/api/admin/config`

更新系统配置。

**请求体**:
```json
{
  "registration_enabled": false
}
```

**响应** `200`:
```json
{
  "message": "Config updated",
  "config": { ... }
}
```

---

### 获取系统统计

**GET** `/api/admin/stats`

获取系统全局统计。

**响应** `200`:
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

### 获取所有工单

**GET** `/api/admin/tickets`

获取所有用户的工单。

**响应** `200`:
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

### 更新工单

**PUT** `/api/admin/tickets/:id`

更新工单状态和回复。

**请求体**:
```json
{
  "status": "open|in_progress|resolved|closed",
  "reply": "string (optional)"
}
```

**响应** `200`:
```json
{
  "message": "Ticket updated",
  "ticket": { ... }
}
```

---

### 删除工单

**DELETE** `/api/admin/tickets/:id`

删除指定工单。

**响应** `200`:
```json
{
  "message": "Ticket deleted"
}
```

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": "Error message description"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / 认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 限流说明

| 接口类型 | 限制 |
|----------|------|
| 通用 API | 10 请求/秒，突发 30 |
| 登录/注册 | 5 请求/分钟 |
| 管理员接口 | 10 请求/秒，突发 20 |
| 并发连接 | 20 连接/IP |

超出限制返回 `429 Too Many Requests`。

---

## 数据模型

### User

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 用户 ID |
| username | string | 用户名 (3-50字符) |
| email | string | 邮箱 |
| role | string | 角色 (admin/user) |
| disabled | boolean | 是否禁用 |
| created_at | datetime | 创建时间 |

### Todo

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 任务 ID |
| content | string | 任务内容 |
| priority | string | 优先级 (high/medium/low) |
| done | boolean | 是否完成 |
| pinned | boolean | 是否置顶 |
| due_date | datetime | 截止日期 |
| category_id | number | 分类 ID |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### Countdown

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 倒计时 ID |
| title | string | 标题 |
| target_date | datetime | 目标日期 |
| priority | string | 优先级 |
| pinned | boolean | 是否置顶 |
| created_at | datetime | 创建时间 |

### Category

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 分类 ID |
| name | string | 分类名称 |
| color | string | 颜色 (十六进制) |
| created_at | datetime | 创建时间 |

### Ticket

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 工单 ID |
| subject | string | 主题 |
| message | string | 内容 |
| status | string | 状态 (open/in_progress/resolved/closed) |
| reply | string | 管理员回复 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

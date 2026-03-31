# API 参考

本文档提供 MemoPad 后端所有 API 端点的详细说明。

---

## 基本信息

- **基础 URL**：`http://YOUR_SERVER_IP/api`
- **身份验证**：通过 `X-API-Key` 请求头传递 API Key
- **内容格式**：JSON
- **字符编码**：UTF-8

### CORS 配置

跨域请求由 `ALLOWED_ORIGINS` 环境变量控制。在生产环境中设置为允许的源列表（逗号分隔）：

```
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

如果未设置，所有跨域请求将被阻止。

---

## 健康检查

### 健康状态

**GET** `/health`

检查后端服务是否运行。无需身份验证。

**响应** `200`:
```json
{
  "status": "ok"
}
```

---

## WebSocket

### 实时同步

**GET** `/ws`

建立 WebSocket 连接，实现跨设备实时数据同步。

**身份验证**：将 API key 作为查询参数传递：
```
wss://YOUR_SERVER_IP/ws?api_key=mp_your_api_key_here
```

**注意**：WebSocket 端点使用 URL 查询参数进行身份验证（而非 `X-API-Key` 请求头），因为 WebSocket 协议在握手阶段不支持自定义请求头。

当待办/倒计时数据变更时，服务器会推送更新事件。客户端收到消息后应重新获取相关数据。

---

## 身份验证

### API Key 格式

```
mp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- 前缀：`mp_`
- 长度：67 字符（3 字符前缀 + 64 字符十六进制）

### 请求示例

```bash
curl -X GET http://localhost/api/todos \
  -H "X-API-Key: mp_your_api_key_here"
```

### 身份验证错误

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

## 身份验证端点 `/api/auth`

### 用户注册

**POST** `/api/auth/register`

创建新用户账户。

**请求体**:
```json
{
  "username": "string (3-50 字符)",
  "password": "string (最少 6 字符)",
  "email": "string (可选)"
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
    "created_at": "2026-01-15T10:30:00Z"
  },
  "api_key": "mp_xxxx..."
}
```

**错误响应**:
- `400`: 用户名已存在 / 参数无效
- `403`: 注册已关闭

---

### 登录

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
    "created_at": "2026-01-15T10:30:00Z"
  },
  "api_key": "mp_xxxx..."
}
```

**错误响应**:
- `401`: 用户名或密码错误
- `403`: 账户已禁用

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

### 检查管理员是否存在

**GET** `/api/auth/check-admin`

检查系统中是否存在管理员账户。

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

生成新的 API Key。旧密钥立即失效。

**响应** `200`:
```json
{
  "message": "API key regenerated",
  "api_key": "mp_new_key..."
}
```

---

### 删除账户

**DELETE** `/api/auth/account`

永久删除当前用户账户及所有关联数据。

**响应** `200`:
```json
{
  "message": "Account deleted"
}
```

---

## 待办端点 `/api/todos`

### 获取待办列表

**GET** `/api/todos`

获取当前用户的所有待办事项。

**响应** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "content": "完成项目文档",
      "priority": "high",
      "done": false,
      "pinned": true,
      "due_date": "2026-02-01T00:00:00Z",
      "category_id": 1,
      "category": {
        "id": 1,
        "name": "工作",
        "color": "#3B82F6"
      },
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-15T12:00:00Z"
    }
  ]
}
```

---

### 创建待办

**POST** `/api/todos`

创建新的待办事项。

**请求体**:
```json
{
  "content": "string (必填)",
  "priority": "high|medium|low (默认: medium)",
  "due_date": "ISO8601 日期 (可选)",
  "category_id": "number (可选)",
  "pinned": "boolean (默认: false)"
}
```

**响应** `201`:
```json
{
  "message": "Todo created",
  "todo": {
    "id": 1,
    "content": "新任务",
    "priority": "medium",
    "done": false,
    "pinned": false,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

---

### 更新待办

**PUT** `/api/todos/:id`

更新指定的待办事项。

**请求体**:
```json
{
  "content": "string (可选)",
  "priority": "high|medium|low (可选)",
  "due_date": "ISO8601 日期或 null (可选)",
  "category_id": "number 或 null (可选)",
  "pinned": "boolean (可选)"
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

### 删除待办

**DELETE** `/api/todos/:id`

删除指定的待办事项。

**响应** `200`:
```json
{
  "message": "Todo deleted"
}
```

---

### 切换完成状态

**PATCH** `/api/todos/:id/toggle`

切换待办事项的完成状态。

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

切换待办事项的置顶状态。

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

### 批量删除待办

**DELETE** `/api/todos/batch`

批量删除待办事项。

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

**响应** `200`:
```json
{
  "message": "Todos deleted"
}
```

---

### 批量切换完成状态

**PATCH** `/api/todos/batch/toggle`

批量切换待办事项的完成状态。

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

**响应** `200`:
```json
{
  "message": "Todos toggled"
}
```

---

### 批量标记完成

**PATCH** `/api/todos/batch/done`

批量将待办事项标记为完成。

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

**响应** `200`:
```json
{
  "message": "Todos marked as done"
}
```

---

## 倒计时端点 `/api/countdowns`

### 获取倒计时列表

**GET** `/api/countdowns`

获取当前用户的所有倒计时。

**响应** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "title": "项目截止日期",
      "target_date": "2026-06-01T00:00:00Z",
      "priority": "high",
      "pinned": true,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

### 创建倒计时

**POST** `/api/countdowns`

创建新的倒计时。

**请求体**:
```json
{
  "title": "string (必填)",
  "target_date": "ISO8601 日期 (必填)",
  "priority": "high|medium|low (默认: medium)",
  "pinned": "boolean (默认: false)"
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

更新指定的倒计时。

**请求体**:
```json
{
  "title": "string (可选)",
  "target_date": "ISO8601 日期 (可选)",
  "priority": "high|medium|low (可选)",
  "pinned": "boolean (可选)"
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

删除指定的倒计时。

**响应** `200`:
```json
{
  "message": "Countdown deleted"
}
```

---

### 批量删除倒计时

**DELETE** `/api/countdowns/batch`

批量删除倒计时。

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

**响应** `200`:
```json
{
  "message": "Countdowns deleted"
}
```

---

## 分类端点 `/api/categories`

### 获取分类列表

**GET** `/api/categories`

获取当前用户的所有分类。

**响应** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "name": "工作",
      "color": "#3B82F6",
      "created_at": "2026-01-15T10:30:00Z"
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
  "name": "string (必填)",
  "color": "十六进制颜色 (默认: #6B7280)"
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

更新指定的分类。

**请求体**:
```json
{
  "name": "string (可选)",
  "color": "十六进制颜色 (可选)"
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

删除指定的分类。关联的待办事项将解除链接。

**响应** `200`:
```json
{
  "message": "Category deleted"
}
```

---

## 统计端点 `/api/stats`

### 获取统计信息

**GET** `/api/stats`

获取当前用户的统计信息。

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

## 工单端点 `/api/tickets`

### 获取工单列表

**GET** `/api/tickets`

获取当前用户的工单。

**响应** `200`:
```json
{
  "data": [
    {
      "id": 1,
      "title": "功能建议",
      "description": "我想建议...",
      "priority": "medium",
      "status": "open",
      "reply": null,
      "reply_read_at": null,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-15T10:30:00Z"
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
  "title": "string (必填)",
  "description": "string (可选)",
  "priority": "high|medium|low (默认: medium)"
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
    "title": "功能建议",
    "description": "我想建议...",
    "priority": "medium",
    "status": "resolved",
    "reply": "感谢您的建议！",
    "reply_read_at": null,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-16T09:00:00Z"
  }
}
```

---

### 标记回复已读

**PUT** `/api/tickets/:id/read`

将管理员回复标记为已读。当用户打开有未读回复的工单时自动调用。

**响应** `200`:
```json
{
  "success": true
}
```

---

### 获取未读回复数量

**GET** `/api/tickets/unread-count`

获取有未读管理员回复的工单数量。

**响应** `200`:
```json
{
  "count": 3
}
```

---

### 关闭工单

**PUT** `/api/tickets/:id/close`

关闭当前用户拥有的工单。只有状态为 `open`、`in_progress` 或 `resolved` 的工单可以关闭。

**响应** `200`:
```json
{
  "message": "Ticket closed"
}
```

---

## 管理员端点 `/api/admin`

所有管理员端点要求用户角色为 `admin`。

### 获取用户列表

**GET** `/api/admin/users`

获取所有用户及其统计信息。

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
      "created_at": "2026-01-15T10:30:00Z",
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

禁用用户账户。

**响应** `200`:
```json
{
  "message": "User disabled"
}
```

---

### 启用用户

**PATCH** `/api/admin/users/:id/enable`

启用用户账户。

**响应** `200`:
```json
{
  "message": "User enabled"
}
```

---

### 删除用户

**DELETE** `/api/admin/users/:id`

删除用户及其所有数据。

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

获取全局系统统计。

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
      "title": "Bug 报告",
      "description": "...",
      "priority": "high",
      "status": "open",
      "reply": null,
      "created_at": "2026-01-15T10:30:00Z"
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
  "reply": "string (可选)"
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

删除工单。

**响应** `200`:
```json
{
  "message": "Ticket deleted"
}
```

---

### 添加工单回复

**POST** `/api/admin/tickets/:id/replies`

向工单追加回复。重置用户的已读状态，使其看到通知。如果工单已关闭，会自动重新打开为 `in_progress`。

**请求体**:
```json
{
  "content": "我们已修复该问题，请重试。"
}
```

**响应** `201`:
```json
{
  "data": {
    "id": 1,
    "ticket_id": 5,
    "content": "我们已修复该问题，请重试。",
    "created_at": "2026-03-31T14:30:00Z"
  }
}
```

---

### 删除工单回复

**DELETE** `/api/admin/tickets/:id/replies/:replyId`

删除工单中的指定回复。

**响应** `200`:
```json
{
  "message": "Reply deleted"
}
```

---

## 错误响应格式

所有错误遵循统一格式：

```json
{
  "error": "错误信息描述"
}
```

### HTTP 状态码

| 代码 | 描述 |
|------|-------------|
| 200 | 成功 |
| 201 | 已创建 |
| 400 | 请求错误 / 参数无效 |
| 401 | 未授权 / 身份验证失败 |
| 403 | 禁止访问 / 权限不足 |
| 404 | 资源未找到 |
| 429 | 请求过多 |
| 500 | 服务器内部错误 |

---

## 速率限制

| 端点类型 | 限制 |
|---------------|-------|
| 常规 API | 10 次/秒，突发 30 次 |
| 登录/注册 | 5 次/分钟 |
| 管理员端点 | 10 次/秒，突发 20 次 |
| 并发连接 | 每 IP 20 个 |

超出限制返回 `429 Too Many Requests`。

---

## 数据模型

### 用户

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 用户 ID |
| username | string | 用户名 (3-50 字符) |
| email | string | 邮箱地址 |
| role | string | 角色 (admin/user) |
| disabled | boolean | 是否禁用 |
| created_at | datetime | 创建时间 |

### 待办

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 待办 ID |
| content | string | 待办内容 |
| priority | string | 优先级 (high/medium/low) |
| done | boolean | 是否完成 |
| pinned | boolean | 是否置顶 |
| due_date | datetime | 截止日期 |
| category_id | number | 分类 ID |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 倒计时

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 倒计时 ID |
| title | string | 标题 |
| target_date | datetime | 目标日期 |
| priority | string | 优先级 (high/medium/low) |
| pinned | boolean | 是否置顶 |
| created_at | datetime | 创建时间 |

### 分类

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 分类 ID |
| name | string | 分类名称 |
| color | string | 颜色 (十六进制) |
| created_at | datetime | 创建时间 |

### 工单

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 工单 ID |
| title | string | 工单标题 |
| description | string | 详细描述 |
| priority | string | 优先级 (high/medium/low) |
| status | string | 状态 (open/in_progress/resolved/closed) |
| reply | string | 旧版管理员回复（已弃用，请使用 replies） |
| reply_read_at | datetime | 用户阅读回复的时间 (null = 未读) |
| resolved_at | datetime | 工单设为已解决的时间（用于自动关闭） |
| replies | TicketReply[] | 管理员回复数组 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 工单回复

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| id | number | 回复 ID |
| ticket_id | number | 所属工单 ID |
| content | string | 回复内容 (最多 2000 字符) |
| created_at | datetime | 创建时间 |

> **注意**：已解决的工单会在 3 天后自动关闭。

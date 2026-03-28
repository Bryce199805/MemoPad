<template>
  <div class="admin-page">
    <div class="page-header">
      <h1>Admin Panel</h1>
      <p class="subtitle">User management and system configuration</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.total || 0 }}</span>
          <span class="stat-label">Total Users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.active || 0 }}</span>
          <span class="stat-label">Active Users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon data"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.data?.todos || 0 }}</span>
          <span class="stat-label">Total Todos</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon recent"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.recent || 0 }}</span>
          <span class="stat-label">New This Week</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'users' }]" @click="activeTab = 'users'">
        Users
      </button>
      <button :class="['tab', { active: activeTab === 'config' }]" @click="activeTab = 'config'">
        System Config
      </button>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <Card>
        <template #header>User Management</template>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Todos</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td class="username">{{ user.username }}</td>
                <td>{{ user.email || '-' }}</td>
                <td>
                  <Badge :variant="user.role === 'admin' ? 'primary' : 'default'">
                    {{ user.role }}
                  </Badge>
                </td>
                <td>{{ user.todo_count }} / {{ user.countdown_count }}</td>
                <td>
                  <Badge :variant="user.disabled ? 'danger' : 'success'">
                    {{ user.disabled ? 'Disabled' : 'Active' }}
                  </Badge>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td class="actions">
                  <Button
                    v-if="!user.disabled"
                    variant="ghost"
                    size="sm"
                    @click="disableUser(user.id)"
                    :disabled="user.role === 'admin'"
                  >
                    Disable
                  </Button>
                  <Button
                    v-else
                    variant="secondary"
                    size="sm"
                    @click="enableUser(user.id)"
                  >
                    Enable
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    @click="deleteUser(user)"
                    :disabled="user.role === 'admin'"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <Card>
        <template #header>System Configuration</template>
        <div class="config-list">
          <div class="config-item">
            <div class="config-info">
              <span class="config-label">User Registration</span>
              <span class="config-desc">Allow new users to register accounts</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="config.registration_enabled" @change="updateConfig" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import api from '../api/client'

const activeTab = ref('users')
const users = ref([])
const stats = ref({})
const config = ref({
  registration_enabled: true
})

async function fetchUsers() {
  try {
    const res = await api.get('/api/admin/users')
    users.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

async function fetchStats() {
  try {
    const res = await api.get('/api/admin/stats')
    stats.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchConfig() {
  try {
    const res = await api.get('/api/admin/config')
    config.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch config:', e)
  }
}

async function updateConfig() {
  try {
    await api.put('/api/admin/config', config.value)
  } catch (e) {
    console.error('Failed to update config:', e)
  }
}

async function disableUser(id) {
  if (!confirm('Disable this user?')) return
  try {
    await api.patch(`/api/admin/users/${id}/disable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to disable user')
  }
}

async function enableUser(id) {
  try {
    await api.patch(`/api/admin/users/${id}/enable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to enable user')
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}" and all their data? This cannot be undone.`)) return
  try {
    await api.delete(`/api/admin/users/${user.id}`)
    fetchUsers()
    fetchStats()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete user')
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchUsers()
  fetchStats()
  fetchConfig()
})
</script>

<style scoped>
.admin-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.users { background: rgba(99, 102, 241, 0.2); }
.stat-icon.active { background: rgba(34, 197, 94, 0.2); }
.stat-icon.data { background: rgba(59, 130, 246, 0.2); }
.stat-icon.recent { background: rgba(245, 158, 11, 0.2); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}

.tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

/* Table */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}

.data-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  font-size: 14px;
  color: var(--text-primary);
}

.data-table tr:hover td {
  background: var(--bg-tertiary);
}

.username {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

/* Config */
.config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-label {
  font-weight: 600;
  color: var(--text-primary);
}

.config-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 28px;
  transition: all var(--transition-fast);
}

.slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-secondary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .slider {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toggle input:checked + .slider::before {
  transform: translateX(24px);
  background-color: white;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }
}
</style>

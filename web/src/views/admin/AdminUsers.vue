<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>{{ $t('admin.userManagement') }}</h1>
      <p class="subtitle">{{ $t('admin.manageUsers') }}</p>
    </div>

    <Card>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ $t('admin.username') }}</th>
              <th>{{ $t('admin.email') }}</th>
              <th>{{ $t('admin.role') }}</th>
              <th>{{ $t('admin.todosCountdowns') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th>{{ $t('admin.created') }}</th>
              <th>{{ $t('admin.actions') }}</th>
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
                  {{ user.disabled ? $t('admin.disabled') : $t('admin.active') }}
                </Badge>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td class="actions">
                <Button
                  v-if="!user.disabled"
                  variant="ghost"
                  size="sm"
                  @click="disableUser(user.id)"
                  :disabled="user.role === 'admin' || user.id === currentUserId"
                >
                  {{ $t('admin.disable') }}
                </Button>
                <Button
                  v-else
                  variant="secondary"
                  size="sm"
                  @click="enableUser(user.id)"
                >
                  {{ $t('admin.enable') }}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  @click="deleteUser(user)"
                  :disabled="user.role === 'admin' || user.id === currentUserId"
                >
                  {{ $t('common.delete') }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../../components/ui/Card.vue'
import Button from '../../components/ui/Button.vue'
import Badge from '../../components/ui/Badge.vue'
import api from '../../api/client'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const users = ref([])

const currentUserId = computed(() => authStore.user?.id)

async function fetchUsers() {
  try {
    const res = await api.get('/api/admin/users')
    users.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

async function disableUser(id) {
  if (!confirm(t('admin.confirmDisable'))) return
  try {
    await api.patch(`/api/admin/users/${id}/disable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedDisable'))
  }
}

async function enableUser(id) {
  try {
    await api.patch(`/api/admin/users/${id}/enable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedEnable'))
  }
}

async function deleteUser(user) {
  if (!confirm(t('admin.confirmDeleteUser', { username: user.username }))) return
  try {
    await api.delete(`/api/admin/users/${user.id}`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedDeleteUser'))
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
/* Admin Theme */
.admin-theme {
  --admin-primary: #14b8a6;
}

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

@media (max-width: 768px) {
  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(6),
  .data-table td:nth-child(6) {
    display: none;
  }
}
</style>

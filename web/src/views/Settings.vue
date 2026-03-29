<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>Settings</h1>
    </div>

    <div class="settings-grid">
      <!-- Left column -->
      <div class="settings-col">

        <!-- Profile Section -->
        <Card class="section-card">
          <template #header>Profile</template>
          <div class="profile-info">
            <div class="avatar">{{ userInitial }}</div>
            <div class="profile-details">
              <p class="username">{{ authStore.user?.username }}</p>
              <p class="role-badge" :class="authStore.user?.role">{{ authStore.user?.role }}</p>
              <p class="email">{{ authStore.user?.email || 'No email set' }}</p>
            </div>
          </div>
        </Card>

        <!-- API Key -->
        <Card class="section-card">
          <template #header>API Key</template>
          <p class="section-desc">Use this key to connect desktop and mobile apps</p>
          <div class="api-key-display">
            <input class="api-key-input" :value="showApiKey ? apiKey : '•'.repeat(32)" readonly />
            <button class="icon-btn" @click="showApiKey = !showApiKey" :title="showApiKey ? 'Hide' : 'Show'">
              <svg v-if="!showApiKey" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          <div class="api-key-actions">
            <Button variant="secondary" size="sm" @click="copyApiKey">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </Button>
            <Button variant="danger" size="sm" @click="regenerateApiKey">Regenerate</Button>
          </div>
          <p v-if="copyFeedback" class="copy-feedback">✓ Copied to clipboard</p>
        </Card>

        <!-- Theme Section -->
        <Card class="section-card">
          <template #header>Appearance</template>
          <p class="section-desc">Choose your preferred color scheme</p>
          <div class="theme-options">
            <button :class="['theme-btn', { active: theme === 'dark' }]" @click="setTheme('dark')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              Dark
            </button>
            <button :class="['theme-btn', { active: theme === 'light' }]" @click="setTheme('light')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              Light
            </button>
          </div>
        </Card>

      </div>

      <!-- Right column -->
      <div class="settings-col">

        <!-- Categories Section -->
        <Card class="section-card categories-card">
          <template #header>
            <div class="card-header-row">
              <span>Categories</span>
              <span class="header-count">{{ categories.length }}</span>
            </div>
          </template>
          <div class="category-form">
            <div class="category-color-preview" :style="{ background: newCategory.color }"></div>
            <input
              v-model="newCategory.name"
              type="text"
              placeholder="New category name..."
              @keydown.enter="addCategory"
            />
            <input v-model="newCategory.color" type="color" class="color-input" />
            <Button variant="primary" size="sm" @click="addCategory" :disabled="!newCategory.name.trim()">
              Add
            </Button>
          </div>
          <div class="category-list">
            <div v-for="cat in categories" :key="cat.id" class="category-item">
              <div class="category-color" :style="{ background: cat.color }"></div>
              <span class="category-name">{{ cat.name }}</span>
              <span class="usage-count">{{ getCategoryUsage(cat.id) }} tasks</span>
              <button class="icon-btn danger" @click="deleteCategory(cat.id, cat.name)" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
            <p v-if="categories.length === 0" class="empty-text">No categories yet</p>
          </div>
        </Card>

        <!-- Session + Danger zone -->
        <Card class="section-card">
          <template #header>Account</template>
          <div class="account-actions">
            <div class="account-action-row">
              <div>
                <p class="action-label">Session</p>
                <p class="action-desc">Sign out of your current session</p>
              </div>
              <Button variant="secondary" @click="handleLogout">Logout</Button>
            </div>
            <div v-if="!authStore.isAdmin" class="account-action-row danger-row">
              <div>
                <p class="action-label danger-label">Delete Account</p>
                <p class="action-desc">Permanently delete all your data</p>
              </div>
              <Button variant="danger" @click="handleDeleteAccount">Delete</Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCategoryStore } from '../stores/category'
import { storeToRefs } from 'pinia'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import api from '../api/client'
import { useTodoStore } from '../stores/todo'

const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const todoStore = useTodoStore()
const { categories } = storeToRefs(categoryStore)

const categoryColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

function generateRandomColor() {
  const usedColors = categories.value.map(c => c.color)
  const available = categoryColors.filter(c => !usedColors.includes(c))
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)]
  return categoryColors[Math.floor(Math.random() * categoryColors.length)]
}

const theme = ref('dark')
const newCategory = ref({ name: '', color: '#6366f1' })
const apiKey = ref('')
const showApiKey = ref(false)
const copyFeedback = ref(false)

function copyApiKey() {
  navigator.clipboard.writeText(apiKey.value)
  copyFeedback.value = true
  setTimeout(() => { copyFeedback.value = false }, 2000)
}

async function regenerateApiKey() {
  if (confirm('Regenerate API key? The old key will stop working and you will be logged out.')) {
    const res = await api.post('/api/auth/api-key/regenerate')
    if (res.data?.data?.api_key) {
      apiKey.value = res.data.data.api_key
      authStore.logout()
    }
  }
}

const userInitial = computed(() => authStore.user?.username?.charAt(0).toUpperCase() || '?')

function setTheme(t) {
  theme.value = t
  localStorage.setItem('theme', t)
  document.documentElement.classList.toggle('light', t === 'light')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function handleDeleteAccount() {
  if (!confirm('Are you sure? This action cannot be undone and all your data will be permanently deleted.')) return
  if (!confirm('Final confirmation: all todos, countdowns, and categories will be deleted.')) return
  try {
    await api.delete('/api/auth/account')
    authStore.logout()
    router.push('/login')
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete account')
  }
}

async function addCategory() {
  if (!newCategory.value.name.trim()) return
  const isDuplicate = categories.value.some(
    c => c.name.toLowerCase() === newCategory.value.name.trim().toLowerCase()
  )
  if (isDuplicate) {
    alert('A category with this name already exists')
    return
  }
  await categoryStore.createCategory(newCategory.value)
  newCategory.value = { name: '', color: generateRandomColor() }
}

function getCategoryUsage(catId) {
  return todoStore.todos.filter(t => t.category_id === catId).length
}

function deleteCategory(id, name) {
  const usage = getCategoryUsage(id)
  if (usage > 0) {
    alert(`Cannot delete "${name}": ${usage} task(s) are using it.`)
    return
  }
  if (confirm(`Delete category "${name}"?`)) {
    categoryStore.deleteCategory(id)
  }
}

onMounted(() => {
  categoryStore.fetchCategories()
  api.get('/api/auth/api-key').then(r => {
    if (r.data?.data?.api_key) apiKey.value = r.data.data.api_key
  })
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  document.documentElement.classList.toggle('light', savedTheme === 'light')
})
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Two-column grid */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.settings-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  margin-bottom: 0;
}

/* Profile */
.profile-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gradient);
  border-radius: 50%;
  font-size: 26px;
  font-weight: 700;
  color: white;
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge.admin {
  background: rgba(99, 102, 241, 0.2);
  color: var(--accent-primary);
}

.role-badge.user {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.email {
  font-size: 13px;
  color: var(--text-secondary);
}

/* API Key */
.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.api-key-display {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.api-key-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 13px;
  min-width: 0;
}

.api-key-actions {
  display: flex;
  gap: 8px;
}

.copy-feedback {
  font-size: 12px;
  color: var(--success);
  margin-top: 6px;
}

/* Icon button */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

/* Theme */
.theme-options {
  display: flex;
  gap: 12px;
}

.theme-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 14px;
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.theme-btn.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
}

/* Categories */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-count {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  color: var(--text-muted);
}

.category-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}

.category-color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
}

.category-form input[type="text"] {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
}

.color-input {
  width: 36px;
  height: 36px;
  padding: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  flex-shrink: 0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.category-item:hover {
  background: var(--bg-hover);
}

.category-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.usage-count {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.empty-text {
  text-align: center;
  color: var(--text-muted);
  padding: 28px;
  font-size: 14px;
}

/* Account section */
.account-actions {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.account-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.account-action-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.account-action-row:first-child {
  padding-top: 0;
}

.danger-row .action-label {
  color: var(--danger);
}

.action-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.action-desc {
  font-size: 12px;
  color: var(--text-muted);
}
</style>

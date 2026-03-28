<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>Settings</h1>
    </div>

    <!-- Profile Section -->
    <Card class="section-card">
      <template #header>Profile</template>
      <div class="profile-info">
        <div class="avatar">{{ userInitial }}</div>
        <div class="profile-details">
          <p class="username">{{ authStore.user?.username }}</p>
          <p class="email">{{ authStore.user?.email || 'No email set' }}</p>
        </div>
      </div>
    </Card>

    <!-- API Key -->
    <Card class="section-card">
      <template #header>API Key</template>
      <p class="api-key-desc">Use this key to connect desktop apps</p>
      <div class="api-key-row">
        <input class="api-key-input" :value="apiKey" readonly />
        <Button variant="secondary" size="sm" @click="copyApiKey">Copy</Button>
        <Button variant="danger" size="sm" @click="regenerateApiKey">Regenerate</Button>
      </div>
    </Card>

    <!-- Categories Section -->
    <Card class="section-card">
      <template #header>Categories</template>
      <div class="category-form">
        <input 
          v-model="newCategory.name" 
          type="text" 
          placeholder="Category name"
        />
        <input 
          v-model="newCategory.color" 
          type="color" 
          class="color-input"
        />
        <Button variant="primary" @click="addCategory" :disabled="!newCategory.name.trim()">
          Add
        </Button>
      </div>
      <div class="category-list">
        <div v-for="cat in categories" :key="cat.id" class="category-item">
          <div class="category-color" :style="{ background: cat.color }"></div>
          <span class="category-name">{{ cat.name }}</span>
          <span class="usage-count">{{ getCategoryUsage(cat.id) }} tasks</span>
          <button class="delete-btn" @click="deleteCategory(cat.id, cat.name)">🗑️</button>
        </div>
        <p v-if="categories.length === 0" class="empty-text">No categories yet</p>
      </div>
    </Card>

    <!-- Theme Section -->
    <Card class="section-card">
      <template #header>Theme</template>
      <div class="theme-options">
        <button 
          :class="['theme-btn', { active: theme === 'dark' }]"
          @click="setTheme('dark')"
        >
          Dark
        </button>
        <button 
          :class="['theme-btn', { active: theme === 'light' }]"
          @click="setTheme('light')"
        >
          Light
        </button>
      </div>
    </Card>

    <!-- Logout Section -->
    <Card class="section-card">
      <template #header>Session</template>
      <p class="session-text">Sign out of your account</p>
      <Button variant="secondary" @click="handleLogout">Logout</Button>
    </Card>

    <!-- Danger Zone - Only for non-admin users -->
    <Card v-if="!authStore.isAdmin" class="section-card danger-zone">
      <template #header>Delete Account</template>
      <p class="danger-text">This action cannot be undone. All your data will be permanently deleted.</p>
      <Button variant="danger" @click="handleDeleteAccount">Delete My Account</Button>
    </Card>
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

// Color palette for categories
const categoryColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

// Generate random color different from existing categories
function generateRandomColor() {
  const usedColors = categories.value.map(c => c.color)
  const available = categoryColors.filter(c => !usedColors.includes(c))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  return categoryColors[Math.floor(Math.random() * categoryColors.length)]
}

const theme = ref('dark')
const newCategory = ref({ name: '', color: '#6366f1' })
const apiKey = ref('')

const copyApiKey = () => { navigator.clipboard.writeText(apiKey.value) }

async function regenerateApiKey() {
  if (confirm('Regenerate API key? The old key will stop working.')) {
    const res = await api.post('/api/auth/api-key/regenerate')
    if (res.data?.data?.api_key) {
      apiKey.value = res.data.data.api_key
      authStore.logout()
    }
  }
}

const userInitial = computed(() => {
  return authStore.user?.username?.charAt(0).toUpperCase() || '?'
})

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
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) return
  if (!confirm('This is your last chance. Type "DELETE" to confirm.')) return
  
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
  
  // Check for duplicate category name
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
    alert(`Cannot delete category "${name}": ${usage} task(s) are using it. Please reassign or remove the category from those tasks first.`)
    return
  }
  if (confirm(`Delete category "${name}"?`)) {
    categoryStore.deleteCategory(id)
  }
}

onMounted(() => {
  categoryStore.fetchCategories()
  api.get('/api/auth/api-key').then(r => { if (r.data?.data?.api_key) apiKey.value = r.data.data.api_key })

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark'
  theme.value = savedTheme
  document.documentElement.classList.toggle('light', savedTheme === 'light')
})
</script>

<style scoped>
.settings-page {
  max-width: 600px;
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

.section-card {
  margin-bottom: 20px;
}

/* Profile */
.profile-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gradient);
  border-radius: 50%;
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.email {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Categories */
.category-form {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.category-form input[type="text"] {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.color-input {
  width: 44px;
  height: 42px;
  padding: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.category-color {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
}

.category-name {
  flex: 1;
  font-weight: 500;
}

.usage-count {
  font-size: 12px;
  color: var(--text-muted);
}

.delete-btn {
  padding: 4px 8px;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.delete-btn:hover {
  opacity: 1;
}

.empty-text {
  text-align: center;
  color: var(--text-muted);
  padding: 24px;
}

/* Theme */
.theme-options {
  display: flex;
  gap: 12px;
}

.theme-btn {
  flex: 1;
  padding: 14px 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  text-align: center;
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  background: var(--bg-hover);
}

.theme-btn.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
}

/* Danger Zone */
.danger-zone :deep(.card-header) {
  color: var(--danger);
}

.danger-text {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 14px;
}

/* Session Section */
.session-text {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 14px;
}

/* API Key */
.api-key-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.api-key-row { display: flex; gap: 8px; align-items: center; }
.api-key-input { flex: 1; padding: 10px 14px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-family: monospace; font-size: 13px; }
</style>

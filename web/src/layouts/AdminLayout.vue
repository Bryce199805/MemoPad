<template>
  <div class="admin-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="mobile-header-content">
        <span class="mobile-title">Admin</span>
        <div class="mobile-actions">
          <button @click="showMobileMenu = !showMobileMenu" class="mobile-menu-btn">
            <svg v-if="!showMobileMenu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Nav -->
      <nav v-if="showMobileMenu" class="mobile-nav">
        <router-link to="/admin" class="mobile-nav-item" @click="showMobileMenu = false">
          <span>Dashboard</span>
        </router-link>
        <router-link to="/admin/users" class="mobile-nav-item" @click="showMobileMenu = false">
          <span>Users</span>
        </router-link>
        <router-link to="/admin/tickets" class="mobile-nav-item" @click="showMobileMenu = false">
          <span>Tickets</span>
          <span v-if="openTicketCount > 0" class="mobile-badge">{{ openTicketCount }}</span>
        </router-link>
        <router-link to="/admin/config" class="mobile-nav-item" @click="showMobileMenu = false">
          <span>Config</span>
        </router-link>
        <button @click="handleLogout" class="mobile-logout">
          Logout
        </button>
      </nav>
    </header>

    <!-- Sidebar -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <router-link to="/admin" class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </router-link>
        <span class="logo-text">Admin</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/admin" class="nav-item" exact-active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Dashboard</span>
        </router-link>

        <router-link to="/admin/users" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Users</span>
        </router-link>

        <router-link to="/admin/tickets" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          <span>Tickets</span>
          <span v-if="openTicketCount > 0" class="nav-badge">{{ openTicketCount }}</span>
        </router-link>

        <router-link to="/admin/config" class="nav-item" active-class="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Config</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">{{ userInitial }}</div>
          <span class="username">{{ authStore.user?.username }}</span>
        </div>
        <button @click="handleLogout" class="logout-btn" title="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/client'

const router = useRouter()
const authStore = useAuthStore()
const openTicketCount = ref(0)
const showMobileMenu = ref(false)

const userInitial = computed(() => {
  return authStore.user?.username?.charAt(0).toUpperCase() || '?'
})

async function fetchTicketCount() {
  try {
    const res = await api.get('/api/admin/tickets')
    const tickets = res.data.data || []
    openTicketCount.value = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
  } catch (e) {
    console.error('Failed to fetch ticket count:', e)
  }
}

// Provide refresh function for child components
provide('refreshTicketCount', fetchTicketCount)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  fetchTicketCount()
})

// Expose for refresh
defineExpose({ fetchTicketCount })
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  background: var(--bg-primary);
}

/* Sidebar */
.admin-sidebar {
  width: 240px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  z-index: 100;
}

.sidebar-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  border-radius: var(--radius-md);
}

.logo svg {
  width: 20px;
  height: 20px;
  color: white;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 14px;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(20, 184, 166, 0.3);
}

.nav-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.nav-item.active .nav-badge {
  background: rgba(255, 255, 255, 0.3);
}

/* Footer */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  color: white;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.logout-btn {
  padding: 8px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.logout-btn svg {
  width: 18px;
  height: 18px;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 32px;
  min-height: 100vh;
}

/* Mobile Header */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 100;
}

.mobile-header-content {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-title {
  font-weight: 700;
  font-size: 18px;
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mobile-menu-btn {
  padding: 8px;
  color: var(--text-secondary);
}

.mobile-menu-btn svg {
  width: 24px;
  height: 24px;
}

.mobile-nav {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  padding: 8px;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
}

.mobile-nav-item.router-link-active {
  background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
  color: white;
}

.mobile-badge {
  padding: 2px 8px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.mobile-logout {
  width: 100%;
  padding: 14px 16px;
  margin-top: 8px;
  border-top: 1px solid var(--border-subtle);
  color: var(--danger);
  font-weight: 500;
  text-align: left;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-sidebar {
    display: none;
  }

  .mobile-header {
    display: block;
  }

  .main-content {
    margin-left: 0;
    margin-top: 60px;
    padding: 20px 16px;
  }
}
</style>

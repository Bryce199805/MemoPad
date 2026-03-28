import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AdminLayout from '../layouts/AdminLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/todos',
    name: 'Todos',
    component: () => import('../views/TodoManage.vue'),
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/countdowns',
    name: 'Countdowns',
    component: () => import('../views/CountdownManage.vue'),
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: () => import('../views/Feedback.vue'),
    meta: { requiresAuth: true, requiresUser: true }
  },
  // Admin routes - separate layout from user routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/AdminUsers.vue')
      },
      {
        path: 'tickets',
        name: 'AdminTickets',
        component: () => import('../views/admin/AdminTickets.vue')
      },
      {
        path: 'config',
        name: 'AdminConfig',
        component: () => import('../views/admin/AdminConfig.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization
  if (!authStore.initialized) {
    await authStore.verifyAuth()
  }

  // Check if route requires auth
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Dashboard' })
    return
  }

  // Check if route requires user (non-admin)
  if (to.meta.requiresUser && authStore.isAdmin) {
    next({ name: 'AdminDashboard' })
    return
  }

  // Redirect authenticated users away from guest pages
  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: authStore.isAdmin ? 'AdminDashboard' : 'Dashboard' })
    return
  }

  next()
})

export default router

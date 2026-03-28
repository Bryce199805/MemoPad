import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

const routes = [
  // Login - no layout
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  // User routes - with DefaultLayout
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true, requiresUser: true }
      },
      {
        path: 'todos',
        name: 'Todos',
        component: () => import('../views/TodoManage.vue'),
        meta: { requiresAuth: true, requiresUser: true }
      },
      {
        path: 'countdowns',
        name: 'Countdowns',
        component: () => import('../views/CountdownManage.vue'),
        meta: { requiresAuth: true, requiresUser: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { requiresAuth: true, requiresUser: true }
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('../views/Feedback.vue'),
        meta: { requiresAuth: true, requiresUser: true }
      }
    ]
  },
  // Admin routes - with AdminLayout
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboard.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/AdminUsers.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'tickets',
        name: 'AdminTickets',
        component: () => import('../views/admin/AdminTickets.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'config',
        name: 'AdminConfig',
        component: () => import('../views/admin/AdminConfig.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
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

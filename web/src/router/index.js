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
    meta: { requiresAuth: true, requiresUser: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'todos',
        name: 'Todos',
        component: () => import('../views/TodoManage.vue')
      },
      {
        path: 'countdowns',
        name: 'Countdowns',
        component: () => import('../views/CountdownManage.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue')
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('../views/Feedback.vue')
      }
    ]
  },
  // Admin routes - with AdminLayout
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

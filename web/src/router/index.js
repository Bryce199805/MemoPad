import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TodoManage from '../views/TodoManage.vue'
import CountdownManage from '../views/CountdownManage.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/todos', name: 'Todos', component: TodoManage },
  { path: '/countdowns', name: 'Countdowns', component: CountdownManage },
  { path: '/settings', name: 'Settings', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

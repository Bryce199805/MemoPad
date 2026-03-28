import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import en from './locales/en.json'
import zh from './locales/zh.json'
import './style.css'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'en',
  fallbackLocale: 'en',
  messages: { en, zh }
})

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')

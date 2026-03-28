<template>
  <div class="login-page">
    <!-- Animated Background -->
    <div class="login-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Login Container -->
    <div class="login-container">
      <!-- Logo -->
      <div class="login-header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1>MemoPad</h1>
        <p>Your personal task manager</p>
      </div>

      <!-- Tab Switcher -->
      <div class="login-tabs">
        <button 
          :class="['tab', { active: mode === 'login' }]"
          @click="switchMode('login')"
        >
          Sign In
        </button>
        <button 
          :class="['tab', { active: mode === 'register' }]"
          @click="switchMode('register')"
        >
          Sign Up
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label>Username</label>
          <input 
            v-model="form.username"
            type="text"
            required
            autocomplete="username"
            placeholder="Enter your username"
          />
        </div>

        <div v-if="mode === 'register'" class="form-group">
          <label>Email <span class="optional">(optional)</span></label>
          <input 
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="your@email.com"
          />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input 
            v-model="form.password"
            type="password"
            required
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :placeholder="mode === 'login' ? 'Enter your password' : 'Create a password (min 6 chars)'"
          />
        </div>

        <p v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </p>

        <button type="submit" :disabled="authStore.loading" class="submit-btn">
          <span v-if="authStore.loading" class="spinner"></span>
          <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>

      <!-- Footer -->
      <p class="login-footer">
        {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
        <button @click="switchMode(mode === 'login' ? 'register' : 'login')" class="switch-btn">
          {{ mode === 'login' ? 'Sign Up' : 'Sign In' }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mode = ref('login')
const form = reactive({
  username: '',
  email: '',
  password: ''
})

function switchMode(newMode) {
  mode.value = newMode
  authStore.clearError()
}

async function handleSubmit() {
  authStore.clearError()
  
  let success
  if (mode.value === 'login') {
    success = await authStore.login(form.username, form.password)
  } else {
    success = await authStore.register(form.username, form.password, form.email)
  }

  if (success) {
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Animated Background */
.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s infinite ease-in-out;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: var(--accent-primary);
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: var(--accent-secondary);
  bottom: -150px;
  right: -150px;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(50px, -50px) scale(1.1); }
  50% { transform: translate(-30px, 30px) scale(0.95); }
  75% { transform: translate(40px, 20px) scale(1.05); }
}

/* Container */
.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

/* Header */
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glow);
}

.logo svg {
  width: 32px;
  height: 32px;
  color: white;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Tabs */
.login-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.optional {
  font-weight: 400;
  color: var(--text-muted);
}

.form-group input {
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.form-group input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

/* Error */
.error-message {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 14px;
  text-align: center;
}

/* Submit Button */
.submit-btn {
  padding: 16px 24px;
  background: var(--accent-gradient);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 15px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer */
.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-btn {
  color: var(--accent-primary);
  font-weight: 500;
  margin-left: 4px;
}

.switch-btn:hover {
  text-decoration: underline;
}
</style>

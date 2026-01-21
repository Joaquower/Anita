<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  // Mock login delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  if (email.value && password.value) {
    // Store mock auth
    localStorage.setItem('authToken', 'mock-jwt-token-123')
    localStorage.setItem('userEmail', email.value)
    router.push('/files')
  }
  isLoading.value = false
}
</script>

<template>
  <div class="login-container">
    <div class="glass-card login-box">
      <h1 class="title">SecureDoc Vault</h1>
      <p class="subtitle">Acceso de Alta Seguridad</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label>Email Corporativo</label>
          <input type="email" v-model="email" placeholder="usuario@empresa.com" required />
        </div>
        
        <div class="input-group">
          <label>Contraseña</label>
          <input type="password" v-model="password" placeholder="••••••••" required />
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Verificando...' : 'Acceder' }}
        </button>
      </form>

      <div class="security-badges">
        <span class="badge">🔒 End-to-End Encrypted</span>
        <span class="badge">👁️ Activity Monitored</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
}

.login-box {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  color: transparent;
}

.subtitle {
  color: var(--color-text-dim);
  margin-bottom: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-dim);
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 0.5rem;
  color: white;
  font-size: 1rem;
  transition: all 0.3s;
}

.input-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.security-badges {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.badge {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
}
</style>

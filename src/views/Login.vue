<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const router = useRouter()
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 800))
  
  if (username.value) {
    localStorage.setItem('authToken', 'mock-jwt-token-123')
    localStorage.setItem('userEmail', username.value)
    router.push('/files')
  }
  isLoading.value = false
}
</script>

<template>
  <div class="login-container">
    <div class="glass-card login-box">
      <div class="welcome-header">
        <span class="icon">🦷</span>
        <h1 class="title">Notas de Ana</h1>
        <p class="subtitle">PROFESIONAL ODONTÓLOGA</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label>Usuario</label>
          <input type="text" v-model="username" placeholder="Tu nombre..." required />
        </div>
        
        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Entrando...' : 'Ingresar' }}
        </button>
      </form>

      <div class="footer-decor">
        ✨ Bienvenida ✨
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
  background: linear-gradient(135deg, #fdfbf7 0%, #ffe4e6 100%); /* Cream to Soft Pink */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.login-box {
  width: 100%;
  max-width: 380px;
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 40px rgba(255, 182, 193, 0.2);
}

.welcome-header {
  margin-bottom: 2.5rem;
}

.icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

.title {
  font-size: 2rem;
  margin-bottom: 0.2rem;
  color: #d977a5; /* Deep Pastel Pink */
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #eab308; /* Golden Yellow */
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
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
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
  margin-left: 0.5rem;
}

.input-group input {
  width: 90%;
  padding: 1rem;
  background: #fff;
  border: 2px solid #fce7f3;
  border-radius: 16px;
  color: #555;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.input-group input:focus {
  outline: none;
  border-color: #fca5a5;
  box-shadow: 0 0 0 4px rgba(252, 165, 165, 0.1);
}

.btn-primary {
  background: linear-gradient(to right, #f472b6, #fbbf24); /* Pink to kaki*/
  border: none;
  padding: 1rem;
  border-radius: 16px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 1rem;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(244, 114, 182, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.footer-decor {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #c084fc;
  opacity: 0.8;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
</style>

<script setup>
import { ref, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const files = shallowRef([])
const loading = ref(true)
const userEmail = localStorage.getItem('userEmail')

const fetchFiles = async () => {
    try {
        // En producción usará el PHP, en local intentamos usar el json si falla el php
        // Ojo: En local (localhost) el PHP no funcionará a menos que tengas un servidor PHP corriendo.
        // Pero en tu servidor real sí funcionará.
        let url = '/list-files.php'
        
        // Pequeño truco para desarrollo: si estamos en localhost y falla el PHP, intentamos el json antiguo
        if (window.location.hostname === 'localhost') {
             // En local dejamos que falle o podriamos poner un fallback, 
             // pero por ahora apuntamos directo al script que subiras.
        }

        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        
        const data = await res.json()
        if (Array.isArray(data)) {
            files.value = data
        } else {
            files.value = []
            console.error('Invalid data format in notas.json')
        }
    } catch (e) {
        console.error('Error fetching files:', e)
        files.value = []
    } finally {
        loading.value = false
    }
}

const openFile = (file) => {
    router.push({ 
        name: 'view', 
        query: { src: file.path } 
    })
}

onMounted(() => {
    fetchFiles()
})
</script>

<template>
  <div class="explorer-container">
    <div class="glass-card explorer-box">
      <div class="header">
        <h1>Mis Documentos</h1>
        <div class="user-badge">🌸 {{ userEmail }}</div>
      </div>

      <div class="file-list">
        <div v-if="loading" class="loading">Cargando notitas... 🎀</div>
        
        <div v-else-if="files.length === 0" class="empty-state">
            📂 No encontré documentos en la carpeta ./notas
        </div>

        <div 
            v-else 
            v-for="file in files" 
            :key="file.name"
            class="file-item" 
            @click="openFile(file)"
        >
            <span class="file-icon">📄</span>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-action">VER</span>
        </div>
      </div>
      
      <div class="footer-note">
        Solo para uso personal 💖
      </div>
    </div>
  </div>
</template>

<style scoped>
.explorer-container {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #fdfbf7 0%, #ffe4e6 100%);
  display: flex;
  justify-content: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.explorer-box {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(255, 182, 193, 0.2);
  border: 1px solid rgba(255,255,255,0.8);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #fce7f3;
  padding-bottom: 1rem;
}

.header h1 {
  color: #d977a5;
  font-size: 1.8rem;
  margin: 0;
}

.user-badge {
    background: #fff0f5;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.9rem;
    color: #db2777;
    border: 1px solid #fbcfe8;
    font-weight: 600;
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.file-item {
    background: #fff;
    padding: 1.5rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    border: 1px solid #f3f4f6;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.file-item:hover {
    background: #fffbfc;
    border-color: #fbcfe8;
    transform: translateX(5px);
    box-shadow: 0 4px 12px rgba(251, 207, 232, 0.4);
}

.file-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
}

.file-name {
    flex: 1;
    font-size: 1.1rem;
    color: #4b5563;
    font-weight: 500;
}

.file-action {
    font-size: 0.75rem;
    color: #9ca3af;
    letter-spacing: 1px;
    font-weight: 700;
    text-transform: uppercase;
}

.file-item:hover .file-action {
    color: #db2777;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: #9ca3af;
}

.footer-note {
    margin-top: 3rem;
    text-align: center;
    color: #d977a5;
    font-size: 0.85rem;
    opacity: 0.8;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #d977a5;
    font-weight: 600;
}
</style>

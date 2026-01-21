<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const files = ref([])
const loading = ref(true)
const userEmail = localStorage.getItem('userEmail')

const fetchFiles = async () => {
    try {
        const res = await fetch('/api/list')
        files.value = await res.json()
    } catch (e) {
        console.error(e)
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
        <h1>Documentos Seguros</h1>
        <div class="user-badge">👤 {{ userEmail }}</div>
      </div>

      <div class="file-list">
        <div v-if="loading" class="loading">Cargando documentos...</div>
        
        <div v-else-if="files.length === 0" class="empty-state">
            📂 No se encontraron documentos PDF en la carpeta ../notas
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
            <span class="file-action">BLOQUEADO</span>
        </div>
      </div>
      
      <div class="footer-note">
        ⚠️ Todo acceso queda registrado. No intente copiar.
      </div>
    </div>
  </div>
</template>

<style scoped>
.explorer-container {
  min-height: 100vh;
  padding: 2rem;
  background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
  display: flex;
  justify-content: center;
}

.explorer-box {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1rem;
}

.user-badge {
    background: rgba(59, 130, 246, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.9rem;
    color: #93c5fd;
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.file-item {
    background: rgba(255,255,255,0.03);
    padding: 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
}

.file-item:hover {
    background: rgba(255,255,255,0.07);
    border-color: var(--color-primary);
    transform: translateX(5px);
}

.file-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
}

.file-name {
    flex: 1;
    font-size: 1.1rem;
}

.file-action {
    font-size: 0.7rem;
    opacity: 0.5;
    letter-spacing: 2px;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-dim);
}

.footer-note {
    margin-top: 3rem;
    text-align: center;
    color: var(--color-danger);
    font-size: 0.8rem;
    opacity: 0.7;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-primary);
}
</style>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const files = ref([])
const loading = ref(true)
const userEmail = localStorage.getItem('userEmail')
const expandedItems = ref({}) // To track which items have details expanded

const fetchFiles = async () => {
    try {
        const res = await fetch(import.meta.env.BASE_URL + 'notas.json')
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
    // Construct the path relative to public folder.
    const path = import.meta.env.BASE_URL + 'notas/' + file.filename
    
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = path
    link.download = file.filename // Force download with original filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

const toggleDetails = (filename) => {
    expandedItems.value[filename] = !expandedItems.value[filename]
}

// Group files: Modules (Weeks) and Extras
const modules = computed(() => {
    return files.value.filter(f => f.week).sort((a, b) => {
        // Simple alphanumeric sort might work if format remains consistent "Semana X"
        return a.week.localeCompare(b.week, undefined, { numeric: true })
    })
})

const extras = computed(() => {
    return files.value.filter(f => !f.week)
})

onMounted(() => {
    fetchFiles()
})
</script>

<template>
  <div class="course-container">
    <div class="content-wrapper">
      <header class="course-header">
        <div class="header-content">
            <h1>Programa de Estudio</h1>
            <p class="subtitle">Guía de preparación EGEL y apuntes complementarios</p>
        </div>
        <div class="user-badge">
            <span class="user-icon">🎓</span> 
            <span class="user-email">{{ userEmail }}</span>
        </div>
      </header>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando temario...</p>
      </div>

      <div v-else class="course-content">
        <!-- Main Modules Section -->
        <section class="modules-section">
            <h2 class="section-title">Módulos Semanales</h2>
            
            <div class="modules-list">
                <article 
                    v-for="file in modules" 
                    :key="file.filename"
                    class="module-card"
                >
                    <div class="module-main">
                        <div class="module-indicator">
                            <span class="week-label">{{ file.week || 'Módulo' }}</span>
                        </div>
                        
                        <div class="module-info">
                            <h3>{{ file.title }}</h3>
                            <p class="description">{{ file.description }}</p>
                        </div>

                        <div class="module-actions">
                            <button @click="openFile(file)" class="btn-primary">
                                <span class="icon">📂</span> Abrir Apuntes
                            </button>
                            <button 
                                v-if="file.details" 
                                @click="toggleDetails(file.filename)"
                                class="btn-secondary"
                                :class="{ 'active': expandedItems[file.filename] }"
                            >
                                {{ expandedItems[file.filename] ? 'Ocultar Detalles' : 'Ver Temario' }}
                            </button>
                        </div>
                    </div>

                    <div 
                        v-if="file.details && expandedItems[file.filename]" 
                        class="module-details"
                    >
                        <div class="details-content" v-html="file.details"></div>
                    </div>
                </article>
            </div>
        </section>

        <!-- Extras Section -->
        <section v-if="extras.length > 0" class="extras-section">
            <h2 class="section-title">Material Adicional</h2>
            <div class="extras-grid">
                <div 
                    v-for="file in extras" 
                    :key="file.filename"
                    class="extra-card"
                    @click="openFile(file)"
                >
                    <div class="extra-icon">📎</div>
                    <div class="extra-info">
                        <h4>{{ file.title }}</h4>
                        <p>{{ file.description }}</p>
                    </div>
                    <div class="arrow-icon">→</div>
                </div>
            </div>
        </section>
      </div>

      <footer class="course-footer">
        <p>Documentación exclusiva para uso académico 📚</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Base Layout */
.course-container {
    min-height: 100vh;
    background-color: #fff0f5; /* Piel/Rosa muy claro */
    color: #333;
    font-family: 'Quicksand', sans-serif;
    padding: 2rem;
    padding-bottom: 6rem;
}

.content-wrapper {
    max-width: 900px;
    margin: 0 auto;
}

/* Header */
.course-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4rem;
    padding-bottom: 2rem;
    border-bottom: 2px dashed #ffb7c5; /* Dashed pink line */
    position: relative;
}

.course-header::after {
    display: none; /* Remove old gradient line */
}

.header-content h1 {
    font-family: 'Dancing Script', cursive; /* Barbie-like font */
    font-size: 4rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
    color: #e0218a; /* Barbie Hot Pink */
    background: none;
    -webkit-text-fill-color: initial;
    text-shadow: 3px 3px 0px rgba(255, 182, 193, 0.4);
}

.subtitle {
    margin-top: 0.5rem;
    font-size: 1.2rem;
    color: #888;
    font-weight: 500;
}

.user-badge {
    background: white;
    padding: 0.6rem 1.2rem;
    border-radius: 99px;
    border: 2px solid #ffb7c5;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 1rem;
    color: #e0218a;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(224, 33, 138, 0.1);
}

/* Section Titles */
.section-title {
    font-family: 'Dancing Script', cursive;
    font-size: 2.2rem;
    font-weight: 700;
    color: #e0218a;
    margin-bottom: 2rem;
    padding-left: 1rem;
    border-left: 5px solid #e0218a;
}

/* Timeline & Modules */
.modules-section {
    position: relative;
}

.modules-list {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;
    padding-left: 2rem;
}

.modules-list::before {
    content: '';
    position: absolute;
    left: 0px;
    top: 20px;
    bottom: 20px;
    width: 4px;
    background: #ffb7c5; /* Soft pink line */
    border-radius: 4px;
    opacity: 1;
}

.module-card {
    background: white;
    border-radius: 25px;
    border: 2px solid #ffe4e6;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 10px 20px rgba(255, 182, 193, 0.2);
}

/* Heart/Dot on timeline */
.module-card::before {
    content: '♥';
    position: absolute;
    left: -2.6rem;
    top: 1.8rem;
    width: 24px;
    height: 24px;
    text-align: center;
    line-height: 24px;
    font-size: 1.5rem;
    color: #e0218a;
    background: #fff0f5;
    border-radius: 50%;
    z-index: 10;
    border: none;
}

.module-card:hover {
    transform: translateY(-5px) scale(1.01);
    box-shadow: 0 15px 30px rgba(224, 33, 138, 0.2);
    border-color: #ff69b4;
}

.module-main {
    display: flex;
    padding: 2rem;
    gap: 2rem;
    align-items: flex-start;
}

.module-indicator {
    flex-shrink: 0;
}

.week-label {
    background: #e0218a;
    color: white;
    padding: 0.5rem 1.2rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    box-shadow: 0 4px 10px rgba(224, 33, 138, 0.3);
}

.module-info {
    flex: 1;
}

.module-info h3 {
    margin: 0 0 0.8rem 0;
    font-size: 1.6rem;
    font-weight: 700;
    color: #333;
    font-family: 'Quicksand', sans-serif;
}

.description {
    margin: 0;
    color: #666;
    line-height: 1.7;
    font-size: 1.05rem;
}

.module-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 170px;
}

.btn-primary {
    background: #e0218a; /* Barbie Hot Pink */
    color: white;
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 50px; /* Fully rounded */
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    transition: all 0.2s;
    box-shadow: 0 5px 15px rgba(224, 33, 138, 0.4);
    font-size: 1rem;
}

.btn-primary:hover {
    transform: translateY(-3px);
    background: #c21875;
    box-shadow: 0 8px 20px rgba(224, 33, 138, 0.6);
}

.btn-secondary {
    background: white;
    border: 2px solid #e0218a;
    color: #e0218a;
    padding: 0.8rem 1rem;
    border-radius: 50px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.95rem;
    text-align: center;
}

.btn-secondary:hover {
    background: #fff0f5;
}

.btn-secondary.active {
    background: #e0218a;
    color: white;
}

/* Module Details */
.module-details {
    background: #fafafa;
    border-top: 2px dashed #ffb7c5;
    padding: 0;
    overflow: hidden;
}

.details-content {
    padding: 2rem 2rem 2rem 6.5rem;
    font-size: 1rem;
    color: #555;
}

.details-content :deep(h3) {
    color: #e0218a;
    font-family: 'Dancing Script', cursive;
    font-size: 1.8rem;
    text-transform: none;
    margin-bottom: 1rem;
}

.details-content :deep(li)::before {
    content: '💖';
    font-size: 0.8rem;
    margin-right: 0.5rem;
    color: #e0218a;
}

.details-content :deep(strong) {
    color: #e0218a;
    font-weight: 700;
}

/* Extras Section */
.extras-section {
    margin-top: 6rem;
    padding-top: 3rem;
    border-top: 3px dotted #ffb7c5;
}

.extras-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
}

.extra-card {
    background: white;
    border: 2px solid #ffe4e6;
    border-radius: 20px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.extra-card:hover {
    background: #fff0f5;
    border-color: #e0218a;
    transform: translateY(-5px);
}

.extra-icon {
    font-size: 2rem;
    background: #ffe4e6;
    color: #e0218a;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.extra-info h4 {
    color: #333;
    font-weight: 700;
}

.extra-info p {
    color: #777;
}

/* Footer */
.course-footer {
    border-top: 1px solid #ffb7c5;
    color: #e0218a;
}

.loading-state {
    color: #e0218a;
}

.spinner {
    border: 4px solid #ffe4e6;
    border-top-color: #e0218a;
}

/* Responsive */
@media (max-width: 768px) {
    .course-container {
        padding: 1rem;
        padding-bottom: 5rem;
    }

    .content-wrapper {
        width: 100%;
    }

    .header-content h1 {
        font-size: 3rem;
    }

    .course-header {
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2.5rem;
        align-items: center;
        text-align: center;
    }

    .user-badge {
        align-self: center;
    }

    /* Timeline Adjustments */
    .modules-list {
        padding-left: 1.5rem;  
        gap: 2rem;
    }

    .modules-list::before {
        left: 6px; 
    }
    
    .module-card::before {
        left: -2.3rem;
        top: 1.5rem;
        background: transparent;
        font-size: 2rem;
    }

    .module-card {
        border-radius: 20px;
    }

    .module-main {
        flex-direction: column;
        padding: 1.5rem;
        gap: 1.2rem;
    }

    .module-info h3 {
        font-size: 1.4rem;
    }

    /* Make buttons full width and touch-friendly */
    .module-actions {
        width: 100%;
        margin-top: 0.5rem;
        gap: 1rem;
    }

    .btn-primary, .btn-secondary {
        width: 100%;
        padding: 1rem; 
    }

    .details-content {
        padding: 1.5rem;
    }

    .extras-grid {
        grid-template-columns: 1fr;
    }
}
</style>


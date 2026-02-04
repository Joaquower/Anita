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
        const res = await fetch('/notas.json')
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
    // Assuming files are in 'notas/' directory.
    const path = `/notas/${file.filename}`
    router.push({ 
        name: 'view', 
        query: { src: path } 
    })
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
    background-color: #0f172a; /* Slate 900 */
    color: #e2e8f0; /* Slate 200 */
    font-family: 'Inter', sans-serif;
    padding: 2rem;
    padding-bottom: 6rem; /* Extra space for footer */
}

.content-wrapper {
    max-width: 900px; /* Slightly tighter for better reading width */
    margin: 0 auto;
}

/* Header */
.course-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    position: relative;
}

.course-header::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100px;
    height: 3px;
    background: linear-gradient(90deg, #ec4899, #8b5cf6);
}

.header-content h1 {
    font-size: 3rem;
    font-weight: 800;
    margin: 0;
    line-height: 1.1;
    background: linear-gradient(to right, #f472b6, #a78bfa); 
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
}

.subtitle {
    margin-top: 1rem;
    font-size: 1.2rem;
    color: #94a3b8;
    font-weight: 300;
}

.user-badge {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(8px);
    padding: 0.6rem 1.2rem;
    border-radius: 99px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 0.95rem;
    color: #cbd5e1;
    transition: transform 0.2s;
}

.user-badge:hover {
    transform: translateY(-2px);
    border-color: #ec4899;
}

/* Section Titles */
.section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 2rem;
    padding-left: 1rem;
    border-left: 4px solid #ec4899;
}

/* Timeline & Modules */
.modules-section {
    position: relative;
}

/* vertical line for timeline */
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
    width: 2px;
    background: linear-gradient(to bottom, #ec4899, #6366f1 80%, rgba(99, 102, 241, 0));
    opacity: 0.3;
}

.module-card {
    background: #1e293b; 
    border-radius: 20px;
    border: 1px solid rgba(51, 65, 85, 0.5);
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

/* Dot on timeline */
.module-card::before {
    content: '';
    position: absolute;
    left: -2.45rem; /* Align with timeline line */
    top: 2rem;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #0f172a;
    border: 3px solid #ec4899;
    z-index: 10;
}

.module-card:hover {
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    border-color: #6366f1;
    transform: translateY(-4px);
}

.module-card:hover::before {
    background: #ec4899;
    box-shadow: 0 0 15px #ec4899;
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
    background: rgba(99, 102, 241, 0.1);
    color: #a5b4fc;
    padding: 0.4rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 1px solid rgba(99, 102, 241, 0.2);
}

.module-info {
    flex: 1;
}

.module-info h3 {
    margin: 0 0 0.8rem 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.02em;
}

.description {
    margin: 0;
    color: #94a3b8;
    line-height: 1.7;
    font-size: 1rem;
}

.module-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 160px;
}

.btn-primary {
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    color: white;
    border: none;
    padding: 0.9rem 1.2rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.2);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(236, 72, 153, 0.4);
    filter: brightness(1.1);
}

.btn-secondary {
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.95rem;
    text-align: center;
}

.btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #cbd5e1;
}

.btn-secondary.active {
    background: rgba(236, 72, 153, 0.1);
    color: #f472b6;
    border-color: #f472b6;
}

/* Module Details */
.module-details {
    background: rgba(15, 23, 42, 0.5); /* Darker background for contrast */
    border-top: 1px solid rgba(51, 65, 85, 0.5);
    padding: 0;
    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
}

.details-content {
    padding: 2rem 2rem 2rem 6.5rem; /* Align text with title above */
    font-size: 1rem;
    color: #cbd5e1;
}

.details-content :deep(h3) {
    color: #f472b6;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0;
    margin-bottom: 1rem;
}

.details-content :deep(ul) {
    padding-left: 1.2rem;
    margin: 0;
    list-style-type: none; /* Custom bullets */
}

.details-content :deep(li) {
    margin-bottom: 0.8rem;
    line-height: 1.6;
    position: relative;
    padding-left: 0.5rem;
}

.details-content :deep(li)::before {
    content: '•';
    color: #ec4899;
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-left: -1em;
}

.details-content :deep(strong) {
    color: #fff;
    font-weight: 600;
}

/* Extras Section */
.extras-section {
    margin-top: 6rem;
    padding-top: 3rem;
    border-top: 1px dashed #334155;
}

.extras-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
}

.extra-card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.extra-card:hover {
    background: rgba(30, 41, 59, 0.8);
    border-color: #6366f1;
    transform: translateY(-4px);
}

.extra-icon {
    font-size: 2rem;
    background: rgba(148, 163, 184, 0.1);
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
}

.extra-info h4 {
    margin: 0 0 0.3rem 0;
    font-size: 1.05rem;
    color: #f1f5f9;
}

.extra-info p {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
}

/* Footer */
.course-footer {
    margin-top: 6rem;
    text-align: center;
    padding: 2rem;
    color: #475569;
    font-size: 0.9rem;
    letter-spacing: 1px;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #94a3b8;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(99, 102, 241, 0.1);
    border-top-color: #ec4899;
    border-radius: 50%;
    margin-bottom: 1.5rem;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes slideDown {
    from {
        opacity: 0;
        max-height: 0;
    }
    to {
        opacity: 1;
        max-height: 1000px; /* Arbitrary large number */
    }
}

/* Responsive */
@media (max-width: 768px) {
    .modules-list {
        padding-left: 1.5rem;  /* Reduce spacing */
    }
    
    .module-card::before {
        left: -1.9rem; /* Re-align dot */
    }

    .module-main {
        flex-direction: column;
        padding: 1.5rem;
    }
    
    .module-actions {
        width: 100%;
        flex-direction: row;
        margin-top: 1rem;
    }

    .btn-primary, .btn-secondary {
        flex: 1;
    }

    .details-content {
        padding: 1.5rem; /* Remove indentation on mobile */
    }
    
    .course-header {
        flex-direction: column;
        gap: 1rem;
    }
}
</style>


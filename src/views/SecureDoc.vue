<script setup>
import { ref, onMounted, onUnmounted, shallowRef, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import QRCode from 'qrcode'
import { useWindowFocus } from '@vueuse/core'

/* CSS for TextLayer - vital for selection */
import 'pdfjs-dist/web/pdf_viewer.css'
import StickyNote from '../components/StickyNote.vue'
import ProtectionStrip from '../components/ProtectionStrip.vue'

/**
 * CONFIGURATION & STATE
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
// Force disable offscreen canvas to avoid potential structured clone errors or environment support issues
// This might fix "Invalid PDF structure" if it comes from worker message passing failures.
// Actually, this option is usually passed to getDocument, not global options, but let's check correct usage.
// Correction: It goes into getDocument params usually.

const router = useRouter()
const route = useRoute()
const focused = useWindowFocus()
const userEmail = localStorage.getItem('userEmail') || 'usuario@anonimo.com'

// Get PDF URL
const pdfUrl = route.query.src || '/api/file?name=example.pdf'

// References
const pdfDoc = shallowRef(null)
const pages = ref([]) // Array of page numbers
const scale = ref(1.5)

// State
const loading = ref(true)
const error = ref(null)
const useFallback = ref(false)

// Study Tools State
const notes = ref([])
const nextNoteId = ref(1)
const showTimer = ref(false)
const timerMinutes = ref(25)
const timerSeconds = ref(0)
const timerActive = ref(false)
let timerInterval = null

// Security State
const warningCount = ref(0)
const showWarning = ref(false)
const warningMessage = ref('')
const timestamp = ref(new Date().toLocaleTimeString())
const qrCodeUrl = ref('')
const dynamicWatermarkPos = ref({ x: 10, y: 10 })

// Anti-Screenshot State
const screenshotAttempts = ref(0)
const isBlocked = ref(false)
const MAX_ATTEMPTS = 3

// Mobile State
const showMobileMenu = ref(false)

/**
 * TOOLS LOGIC
 */
const addNote = () => {
  notes.value.push({ 
    id: nextNoteId.value++, 
    x: 100 + (notes.value.length * 20), 
    y: 100 + (notes.value.length * 20)
  })
}

const removeNote = (id) => {
  notes.value = notes.value.filter(n => n.id !== id)
}

const toggleTimer = () => {
    if (timerActive.value) {
        clearInterval(timerInterval)
        timerActive.value = false
    } else {
        timerActive.value = true
        timerInterval = setInterval(() => {
            if (timerSeconds.value === 0) {
                if (timerMinutes.value === 0) {
                    clearInterval(timerInterval)
                    alert("¡Tiempo terminado! 🍅")
                    timerActive.value = false
                    return
                }
                timerMinutes.value--
                timerSeconds.value = 59
            } else {
                timerSeconds.value--
            }
        }, 1000)
    }
}

/**
 * SECURITY MECHANISMS (Relaxed for Study Mode)
 */
// NOTE: We allow key combos for study (Ctrl+C might be needed for notes), 
// but we keep the watermark and "no right click save" if possible.
// Actually, to select text properly, right click or standard interactions are needed.
// We will relax "Disable Context Menu" to allow copy.

const triggerSecurityViolation = (msg) => {
  warningCount.value++
  warningMessage.value = `${msg}`
  showWarning.value = true
  setTimeout(() => { showWarning.value = false }, 2000)
}

const handleScreenshotAttempt = () => {
    screenshotAttempts.value++
    if (screenshotAttempts.value >= MAX_ATTEMPTS) {
        isBlocked.value = true
        // Optional: Send report to server here
    } else {
        triggerSecurityViolation(`¡Advertencia! Intento de captura detectado (${screenshotAttempts.value}/${MAX_ATTEMPTS}) 🚫`)
    }
}

const handleKeydown = (e) => {
    // Mac: Cmd + Shift + 3, 4, 5
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault()
        handleScreenshotAttempt()
    }
    
    // Windows: Win + Shift + S
    if (e.metaKey && e.shiftKey && e.key === 's') { // 'Meta' is Windows key often
        e.preventDefault()
        handleScreenshotAttempt()
    }
    
    // Print Screen (handled often by keyup but let's try)
    if (e.key === 'PrintScreen') {
        e.preventDefault()
        handleScreenshotAttempt()
    }
}

// Additional hook for PrintScreen which is often a keyup event
const handleKeyup = (e) => {
    if (e.key === 'PrintScreen') {
        handleScreenshotAttempt()
    }
}

/**
 * RENDERING LOGIC (Canvas + TextLayer)
 */
const loadingProgress = ref(0)
const renderingProgress = ref(0)
const totalPagesToRender = ref(0)

const renderPage = async (pageNum) => {
  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value })
    
    // Support high DPI
    const outputScale = window.devicePixelRatio || 1
    
    // 1. Setup Canvas
    const canvas = document.getElementById(`pdf-page-${pageNum}`)
    if (!canvas) return
    const context = canvas.getContext('2d')

    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = Math.floor(viewport.width) + "px"
    canvas.style.height = Math.floor(viewport.height) + "px"
    
    const transform = outputScale !== 1 
      ? [outputScale, 0, 0, outputScale, 0, 0] 
      : null

    await page.render({
      canvasContext: context,
      transform: transform,
      viewport: viewport
    }).promise

    // 2. Setup TextLayer
    const textLayerDiv = document.getElementById(`text-layer-${pageNum}`)
    if (textLayerDiv) {
        textLayerDiv.style.width = Math.floor(viewport.width) + "px"
        textLayerDiv.style.height = Math.floor(viewport.height) + "px"
        textLayerDiv.innerHTML = '' // Clear if re-rendering

        const textContent = await page.getTextContent()
        
        // Use PDF.js internal TextLayer rendering
        await pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
        }).promise
    }
    
    // Update rendering progress
    renderingProgress.value++

  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err)
  }
}

const loadPdf = async () => {
  loading.value = true
  error.value = null
  loadingProgress.value = 0
  renderingProgress.value = 0
  
  try {
    const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/cmaps/',
        cMapPacked: true,
        // Disable stream if that's causing range request issues
        disableRange: true, 
        disableStream: true
    })
    
    loadingTask.onProgress = (p) => {
        if (p.total > 0) {
            loadingProgress.value = Math.round((p.loaded / p.total) * 100)
        } else {
            // Fake progress if total unknown
            if(loadingProgress.value < 90) loadingProgress.value += 5
        }
    }
    
    pdfDoc.value = await loadingTask.promise
    loadingProgress.value = 100 // Download complete
    
    const numPages = pdfDoc.value.numPages
    totalPagesToRender.value = numPages
    pages.value = Array.from({ length: numPages }, (_, i) => i + 1)
    
    // DO NOT turn off loading yet. Wait for render.
    await nextTick()
    
    // Retry finding elements
    let attempts = 0
    while (!document.getElementById(`pdf-page-1`) && attempts < 20) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
    }
    
    for (let i = 1; i <= numPages; i++) {
        await renderPage(i)
        // Keep loading screen until at least 1st page or few are done?
        // User asked "hasta que cargue todo". Ideally we wait strictly.
    }
    
    loading.value = false // Done!
    
  } catch (err) {
    console.error('Error loading PDF:', err)
    // Switch to fallback iframe mode immediately
    useFallback.value = true
    error.value = "Abriendo visor nativo..."
    loading.value = false
  }
}

// Lifecycle
let intervalId
onMounted(async () => {
  await loadPdf()
  
  // Relaxed security: removed contextmenu blocker to allow Copy.
  document.addEventListener('keydown', handleKeydown) 
  document.addEventListener('keyup', handleKeyup)
  
  qrCodeUrl.value = await QRCode.toDataURL(`Student:${userEmail}`)
  
  intervalId = setInterval(() => {
    timestamp.value = new Date().toLocaleTimeString()
    dynamicWatermarkPos.value = {
        x: Math.random() * 80,
        y: Math.random() * 80
    }
  }, 3000)
})

onUnmounted(() => {
  clearInterval(intervalId)
  clearInterval(timerInterval)
  document.body.classList.remove('blur-content')
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <div class="secure-viewer no-select">
    
    <!-- BLOCKED OVERLAY -->
    <div v-if="isBlocked" class="blocked-overlay">
        <div class="blocked-content">
            <h1>🚫 ACCESO BLOQUEADO 🚫</h1>
            <p>Se han detectado múltiples intentos de captura de pantalla.</p>
            <p>Por seguridad, el documento ha sido ocultado.</p>
            <button @click="$router.push('/')">Volver al Inicio</button>
        </div>
    </div>

    <!-- PROTECTION STRIP REMOVED BY USER REQUEST (Tapa mucho texto) -->
    
    <!-- Study Toolbar (Desktop & Mobile Adaptado) -->
    <!-- On mobile, this will be a bottom bar or overlay -->
    <div class="study-toolbar glass-panel" :class="{ 'mobile-hidden': !showMobileMenu }">
        <div class="tool-group">
            <button class="tool-btn" @click="addNote" title="Agregar Nota">
                📝 Nota
            </button>
            <div class="timer-control">
                <button class="tool-btn" @click="toggleTimer" :class="{active: timerActive}">
                    🍅 {{ String(timerMinutes).padStart(2, '0') }}:{{ String(timerSeconds).padStart(2, '0') }}
                </button>
            </div>
            <!-- Extra mobile-only Close button for menu -->
            <button class="tool-btn mobile-only" @click="showMobileMenu = false">
                🔽 Ocultar
            </button>
        </div>
        <div class="tool-info">Modo Estudio 🎓</div>
    </div>

    <!-- Mobile Menu Toggle Button (Floating) -->
    <button class="mobile-menu-toggle" @click="showMobileMenu = !showMobileMenu" v-if="!showMobileMenu">
        🛠️ Herramientas
    </button>

    <!-- Sticky Notes Overlay -->
    <div class="notes-layer">
        <StickyNote 
            v-for="note in notes" 
            :key="note.id" 
            :id="note.id"
            :initialX="note.x"
            :initialY="note.y"
            @delete="removeNote"
        />
    </div>

    <!-- Navigation -->
    <div class="top-bar">
        <button @click="router.push('/files')" class="back-btn">
            ← <span class="desktop-text">Mis Documentos</span>
        </button>
        <span class="doc-title">Vista de Estudio</span>
    </div>

    <!-- Fallback Viewer (Iframe) -> Activates on Error -->
    <div v-if="useFallback" class="fallback-container">
        <div class="fallback-header">
            <p>⚠️ El visor avanzado falló. Usando visor nativo.</p>
            <p class="debug-url">Intentando cargar: {{ pdfUrl }}</p>
        </div>
        <iframe :src="pdfUrl" class="native-viewer"></iframe>
    </div>

    <!-- Scrollable Content (Advanced Viewer) -->
    <div v-else class="scroll-container">
        <!-- Loading State -->
        <div v-if="loading" class="loading-msg">
            <div class="loading-content">
                <p>Preparando tus notas... 🎀</p>
                <div class="progress-section">
                    <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Canvas Pages -->
        <div v-else class="pdf-pages">
            <div 
                v-for="page in pages" 
                :key="page" 
                class="page-wrapper"
            >
                <canvas :id="`pdf-page-${page}`"></canvas>
                <div :id="`text-layer-${page}`" class="textLayer"></div>
            </div>
        </div>
    </div>

    <!-- Watermarks (Subtle for study) -->
    <div v-if="!useFallback" class="watermark-layer">
        <div 
            class="floating-mark"
            :style="{ top: dynamicWatermarkPos.y + '%', left: dynamicWatermarkPos.x + '%' }"
        >
            {{ userEmail }} 🌸
        </div>
    </div>
  </div>
</template>

<style>
/* PDF.js TextLayer styles override to match new structure if needed */
.textLayer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    opacity: 0.2; /* Make text invisible but selectable. Increase to debug. */
    line-height: 1.0;
}

::selection {
    background: rgba(251, 207, 232, 0.5); /* Pink Highlight */
    color: transparent;
}
</style>

<style scoped>
.native-viewer {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
}

.fallback-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
}

.fallback-header {
    background: #ffe4e6;
    color: #e0218a;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.9rem;
    border-bottom: 1px solid #ffb7c5;
}

.debug-url {
    font-family: monospace;
    font-size: 0.8rem;
    margin-top: 0.2rem;
    color: #555;
}


.secure-viewer {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: #fff0f5; /* Lavender Blush */
    overflow: hidden;
    font-family: 'Quicksand', sans-serif;
    display: flex;
    flex-direction: column;
}

.study-toolbar {
    position: absolute;
    left: 2rem;
    top: 50%;
    transform: translateY(-50%);
    background: white;
    padding: 1rem;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(224, 33, 138, 0.1);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 2px solid #ffb7c5;
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.tool-btn {
    background: white;
    border: 2px solid #e0218a;
    padding: 0.6rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    color: #e0218a;
    transition: all 0.2s;
    font-size: 0.9rem;
}

.tool-btn:hover {
    background: #e0218a;
    color: white;
    transform: translateX(2px);
}

.tool-btn.active {
    background: #e0218a;
    color: white;
}

.tool-info {
    font-size: 0.8rem;
    text-align: center;
    color: #e0218a;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-weight: 700;
    letter-spacing: 2px;
}

.top-bar {
    padding: 0.8rem 2rem;
    background: white;
    border-bottom: 2px solid #ffb7c5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 50;
    box-shadow: 0 2px 10px rgba(224, 33, 138, 0.1);
}

.back-btn {
    background: white;
    border: 2px solid #e0218a;
    color: #e0218a;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
}

.back-btn:hover {
    background: #e0218a;
    color: white;
}

.doc-title {
    font-family: 'Dancing Script', cursive;
    font-size: 1.5rem;
    font-weight: 700;
    color: #e0218a;
}

.scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff0f5;
}

.pdf-pages {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    width: 100%;
}

.page-wrapper {
    position: relative;
    box-shadow: 0 10px 30px rgba(224, 33, 138, 0.15);
    border-radius: 4px;
    background: white;
    border: 1px solid #ffe4e6;
}

canvas {
    display: block;
    /* background-color: white;  <-- Removed to avoid potential blanking if PDF renders transparently */
}

/* ... existing block & watermark CSS ... */
.watermark-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 200;
}

.floating-mark {
    position: absolute;
    color: rgba(224, 33, 138, 0.1); /* Pink watermark */
    font-size: 1.2rem;
    font-weight: bold;
    transform: rotate(-15deg);
    transition: all 3s ease-in-out;
}

.blocked-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white; /* Less aggressive block screen? Or keep dark? User asked for white. */
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #e0218a;
    text-align: center;
}

.blocked-content h1 {
    font-size: 3rem;
    color: #e0218a;
    margin-bottom: 2rem;
    font-family: 'Dancing Script', cursive;
}

.blocked-content p {
    font-size: 1.5rem;
    color: #555;
    margin-bottom: 1rem;
}

.blocked-content button {
    margin-top: 2rem;
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background: #e0218a;
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: background 0.2s;
}

.blocked-content button:hover {
    background: #c21875;
}

/* Mobile Responsiveness */
.mobile-menu-toggle {
    display: none;
}
.mobile-only {
    display: none;
}

@media (max-width: 768px) {
    .secure-viewer {
        height: 100vh;
        width: 100vw;
    }

    .top-bar {
        padding: 0.8rem 1rem;
    }
    
    .desktop-text {
        display: none;
    }

    .doc-title {
        font-size: 1.2rem;
        max-width: 70%;
    }

    .mobile-menu-toggle {
        display: block;
        position: fixed;
        bottom: 6rem;
        left: 1rem;
        z-index: 1500;
        background: #e0218a;
        color: white;
        border: none;
        padding: 0.8rem 1.2rem;
        border-radius: 99px;
        box-shadow: 0 4px 15px rgba(224, 33, 138, 0.4);
        font-weight: 600;
        cursor: pointer;
    }

    .study-toolbar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        transform: translateY(0);
        width: 100%;
        border-radius: 20px 20px 0 0;
        padding: 1.5rem;
        background: white;
        border: none;
        box-shadow: 0 -10px 40px rgba(224, 33, 138, 0.2);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
    }

    .study-toolbar.mobile-hidden {
        transform: translateY(110%);
    }

    .tool-info {
        display: none;
    }

    .tool-group {
        flex-direction: row;
        width: 100%;
        justify-content: space-around;
        align-items: center;
    }

    .tool-btn {
        flex: 1;
        text-align: center;
        padding: 1rem;
        margin: 0 0.2rem;
        height: auto;
        border: 2px solid #e0218a; /* Keep pink border */
    }

    .mobile-only {
        display: block;
        background: white;
        color: #e0218a;
    }

    .scroll-container {
        padding: 1rem 0.5rem 6rem 0.5rem;
    }

    .page-wrapper {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 100%;
    }
    
    canvas {
        width: 100% !important;
        height: auto !important;
    }
    
    .textLayer {
        width: 100% !important;
        height: auto !important;
    }
}


.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 300px;
}

.progress-section {
    width: 100%;
}

.progress-bar {
    width: 100%;
    height: 10px;
    background: white;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #ffb7c5;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: #e0218a;
    transition: width 0.3s ease;
}

.progress-fill.render-fill {
    background: #9b59b6; /* Purple for render phase */
}

.progress-text {
    font-size: 0.8rem;
    color: #e0218a;
    font-weight: bold;
}
</style>

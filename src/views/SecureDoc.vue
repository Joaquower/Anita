<script setup>
import { ref, onMounted, onUnmounted, shallowRef, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import QRCode from 'qrcode'
import { useWindowFocus } from '@vueuse/core'

/* CSS for TextLayer - vital for selection */
import 'pdfjs-dist/web/pdf_viewer.css'
import StickyNote from '../components/StickyNote.vue'
import ProtectionStrip from '../components/ProtectionStrip.vue'

/**
 * CONFIGURATION & STATE
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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

  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err)
  }
}

const loadPdf = async () => {
  loading.value = true
  error.value = null
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl)
    pdfDoc.value = await loadingTask.promise
    
    const numPages = pdfDoc.value.numPages
    pages.value = Array.from({ length: numPages }, (_, i) => i + 1)
    
    loading.value = false
    await nextTick()
    
    // Retry finding elements
    let attempts = 0
    while (!document.getElementById(`pdf-page-1`) && attempts < 20) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
    }
    
    for (let i = 1; i <= numPages; i++) {
        await renderPage(i)
    }
  } catch (err) {
    console.error('Error loading PDF:', err)
    error.value = "Error cargando documento 😿"
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

    <!-- PROTECTION STRIP (Always visible or conditioned?) -->
    <!-- The user wanted a strip that covers PART to force partial screenshots -->
    <ProtectionStrip v-if="!isBlocked" />
    
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

    <!-- Scrollable Content -->
    <div class="scroll-container">
        <div v-if="loading" class="loading-msg">Preparando tus notas... 🎀</div>
        <div v-else-if="error" class="error-msg">{{ error }}</div>
        
        <div v-else class="pdf-pages">
            <div 
                v-for="page in pages" 
                :key="page" 
                class="page-wrapper"
            >
                <!-- Canvas Layer (Image) -->
                <canvas :id="`pdf-page-${page}`"></canvas>
                
                <!-- Text Layer (Selectable) -->
                <div :id="`text-layer-${page}`" class="textLayer"></div>
            </div>
        </div>
    </div>

    <!-- Watermarks (Subtle for study) -->
    <div class="watermark-layer">
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
.secure-viewer {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: #fdfbf7;
    overflow: hidden;
    font-family: 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
}

.study-toolbar {
    position: absolute;
    left: 2rem;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    padding: 1rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid #fce7f3;
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tool-btn {
    background: white;
    border: 1px solid #fbcfe8;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    color: #db2777;
    transition: all 0.2s;
    font-size: 0.9rem;
}

.tool-btn:hover {
    background: #fff0f5;
    transform: translateX(2px);
}

.tool-btn.active {
    background: #fbcfe8;
    color: #831843;
}

.tool-info {
    font-size: 0.7rem;
    text-align: center;
    color: #9ca3af;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
}

.top-bar {
    padding: 0.8rem 2rem;
    background: white;
    border-bottom: 2px solid #fff0f5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 50;
}

.back-btn {
    background: transparent;
    border: none;
    color: #db2777;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
}

.scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fdfbf7;
}

.pdf-pages {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    width: 100%;
}

.page-wrapper {
    position: relative; /* Critical for TextLayer positioning */
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    border-radius: 2px;
    background: white;
}

canvas {
    display: block;
    background-color: white;
}

.watermark-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 200; /* Above text but below notes */
}

.floating-mark {
    position: absolute;
    color: rgba(219, 39, 119, 0.1);
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
    background: rgba(0, 0, 0, 0.95);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    text-align: center;
}

.blocked-content h1 {
    font-size: 3rem;
    color: #ef4444;
    margin-bottom: 2rem;
}

.blocked-content p {
    font-size: 1.5rem;
    margin-bottom: 1rem;
}

.blocked-content button {
    margin-top: 2rem;
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.blocked-content button:hover {
    background: #b91c1c;
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
        height: 100vh; /* Ensure full viewport */
        width: 100vw;
    }

    /* Top Bar adjustments */
    .top-bar {
        padding: 0.8rem 1rem;
    }
    
    .desktop-text {
        display: none;
    }

    .doc-title {
        font-size: 0.9rem;
        max-width: 70%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Toolbar transformation */
    .mobile-menu-toggle {
        display: block;
        position: fixed;
        bottom: 6rem; /* Above chatbot trigger */
        left: 1rem;
        z-index: 1500;
        background: #ec4899;
        color: white;
        border: none;
        padding: 0.8rem 1.2rem;
        border-radius: 99px;
        box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
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
        border-radius: 16px 16px 0 0;
        padding: 1.5rem;
        background: rgba(255, 255, 255, 0.98);
        border: none;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
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
        display: none; /* Hide vertical text on mobile */
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
    }

    .mobile-only {
        display: block;
        background: #f1f5f9;
        color: #64748b;
        border-color: #cbd5e1;
    }

    /* PDF Canvas scaling */
    .scroll-container {
        padding: 1rem 0.5rem 6rem 0.5rem; /* Padding bottom for space */
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
        /* Text layer scaling is tricky on CSS-resized canvas. 
           For perfect selection on mobile we would need JS resize. 
           Basic CSS 'transform' might be needed. 
           For now, let's reset width to match CSS width */
        width: 100% !important;
        height: auto !important;
        /* Disable text selection potentially if misalignment occurs too much */
    }
}
</style>

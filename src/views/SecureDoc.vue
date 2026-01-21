<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as pdfjsLib from 'pdfjs-dist'
import QRCode from 'qrcode'
import { useWindowFocus } from '@vueuse/core'

/**
 * CONFIGURATION & STATE
 */
// Point to the worker we copied to public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const router = useRouter()
const route = useRoute()
const focused = useWindowFocus() // Detect tab switching
const userEmail = localStorage.getItem('userEmail') || 'usuario@anonimo.com'

// Get PDF URL from query param or fallback to dummy
const pdfUrl = route.query.src || '/api/file?name=example_secure.pdf'

const canvasRef = ref(null)
const pdfDoc = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.5)
const loading = ref(true)

// Security State
const warningCount = ref(0)
const lastScrollY = ref(0)
const lockout = ref(false)
const showWarning = ref(false)
const warningMessage = ref('')
const timestamp = ref(new Date().toLocaleTimeString())

// Dynamic Security Elements
const qrCodeUrl = ref('')
const dynamicWatermarkPos = ref({ x: 10, y: 10 })

/**
 * SECURITY MECHANISMS
 */

// 1. Snapshot Detection (PrintScreen)
const handleKeydown = (e) => {
  // Prevent common copy/save shortcuts
  if (
    (e.ctrlKey && (e.key === 'c' || e.key === 's' || e.key === 'p')) ||
    (e.metaKey && (e.key === 'c' || e.key === 's' || e.key === 'p')) ||
    e.key === 'PrintScreen'
  ) {
    e.preventDefault()
    triggerSecurityViolation('Intento de copia o captura detectado')
  }
}

// 2. Tab Switching / Focus Loss
// If they switch tabs (potentially to capture tool), obscure content
const handleVisibilityChange = () => {
    if (document.hidden || !focused.value) {
        document.body.classList.add('blur-content')
    } else {
        document.body.classList.remove('blur-content')
    }
}

// 3. Right Click Disable
const disableContextMenu = (e) => {
  e.preventDefault()
  return false
}

// 4. Scroll Limiter (The "Progressive Disclosure")
// We only want a small window to be visible. 
// We will use a mask on the container.
// But for "impossible to screenshot full page", we can just render the logic here.
// In this implementation, we use a fixed height container with overflow hidden
// and move the canvas inside based on scroll, but visually restrict the viewable area.

// 5. Trigger Violation
const triggerSecurityViolation = (msg) => {
  warningCount.value++
  warningMessage.value = `${msg} (#${warningCount.value}/3)`
  showWarning.value = true
  
  // Flash warning
  setTimeout(() => {
    showWarning.value = false
  }, 2000)

  if (warningCount.value >= 3) {
    lockout.value = true
    router.push('/locked')
  }
}

/**
 * RENDERING LOGIC
 */
const renderPage = async (num) => {
  loading.value = true
  try {
    const page = await pdfDoc.value.getPage(num)
    const viewport = page.getViewport({ scale: scale.value })
    
    // Support high DPI
    const outputScale = window.devicePixelRatio || 1
    
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = Math.floor(viewport.width) + "px"
    canvas.style.height = Math.floor(viewport.height) + "px"
    
    const transform = outputScale !== 1 
      ? [outputScale, 0, 0, outputScale, 0, 0] 
      : null

    const renderContext = {
      canvasContext: context,
      transform: transform,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
    loading.value = false
  } catch (err) {
    console.error('Error rendering page:', err)
    loading.value = false
  }
}

const loadPdf = async () => {
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl)
    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    renderPage(currentPage.value)
  } catch (err) {
    console.error('Error loading PDF:', err)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage(currentPage.value)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage(currentPage.value)
  }
}

// Periodic Tasks
let intervalId
onMounted(async () => {
  await loadPdf()
  
  // Disable native interactions
  document.addEventListener('contextmenu', disableContextMenu)
  document.addEventListener('keydown', handleKeydown)
  
  // Generate a unique tracking QR
  qrCodeUrl.value = await QRCode.toDataURL(`User:${userEmail}|Session:${Date.now()}|IP:127.0.0.1`)
  
  // Interval for updating timestamp and moving watermarks
  intervalId = setInterval(() => {
    timestamp.value = new Date().toLocaleTimeString()
    // Random movement for watermark
    dynamicWatermarkPos.value = {
        x: Math.random() * 80,
        y: Math.random() * 80
    }
  }, 2000)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', disableContextMenu)
  document.removeEventListener('keydown', handleKeydown)
  clearInterval(intervalId)
  document.body.classList.remove('blur-content')
})

// Watch focus to blur content
import { watch } from 'vue'
watch(focused, (isFocused) => {
    if (!isFocused) {
        document.body.classList.add('blur-content')
        triggerSecurityViolation('Foco perdido - Sistema de seguridad activado')
    } else {
        document.body.classList.remove('blur-content')
    }
})

</script>

<template>
  <div class="secure-viewer no-select no-context">
    <!-- Security Overlays -->
    <div class="moire-overlay"></div>
    
    <!-- Glitch Warning Bubble -->
    <div v-if="showWarning" class="warning-popup glitch-text">
        ⚠️ {{ warningMessage }}
    </div>

    <!-- Floating Dynamic Details (Watermarks) -->
    <div class="watermark-layer">
        <div 
            class="floating-mark"
            :style="{ 
                top: dynamicWatermarkPos.y + '%', 
                left: dynamicWatermarkPos.x + '%' 
            }"
        >
            {{ userEmail }} <br>
            {{ timestamp }}
        </div>
        
        <!-- Forensics Hidden Marks (Micro text) -->
        <div class="forensic-grid">
            <span v-for="i in 20" :key="i" class="micro-text">{{ userEmail }}</span>
        </div>
    </div>

    <!-- QR Codes spread around -->
    <div class="qr-container top-right">
        <img :src="qrCodeUrl" class="qr-code" />
    </div>
    <div class="qr-container bottom-left">
        <img :src="qrCodeUrl" class="qr-code" />
    </div>

    <!-- Main Content Area -->
    <div class="content-wrapper glass-card">
        <div class="toolbar">
             <span>Página {{ currentPage }} / {{ totalPages }}</span>
             <div class="controls">
                 <button @click="prevPage" :disabled="currentPage <= 1" class="nav-btn">←</button>
                 <button @click="nextPage" :disabled="currentPage >= totalPages" class="nav-btn">→</button>
             </div>
        </div>

        <!-- Viewport Limiter -->
        <!-- This div effectively creates the "Slit" view effect -->
        <div class="safe-viewport">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
  </div>
</template>

<style>
/* Global blur class triggered by JS */
.blur-content #app {
    filter: blur(20px) grayscale(100%);
    pointer-events: none;
}
</style>

<style scoped>
.secure-viewer {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    background-color: var(--color-bg);
    overflow: hidden;
}

.content-wrapper {
    position: relative;
    z-index: 10;
    max-width: 900px;
    width: 95%;
    height: 90vh;
    margin-top: 5vh;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden; /* Important for the security */
}

.toolbar {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.5);
    color: white;
    z-index: 20;
}

.nav-btn {
    background: var(--color-primary);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    margin-left: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
}

.nav-btn:disabled {
    background: gray;
    cursor: not-allowed;
}

/* The core logical protection: Only show limited height, scroll content inside it */
.safe-viewport {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    background: #333;
    
    /* Reveal effect: Mask edges */
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
}

canvas {
    display: block;
    margin: 0 auto;
    /* Optional: filter to make screenshots harder to OCR? */
    filter: sepia(10%); 
}

/* Security Layers */
.watermark-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
    mix-blend-mode: overlay;
}

.floating-mark {
    position: absolute;
    color: rgba(255, 255, 255, 0.15);
    font-size: 1.5rem;
    font-weight: bold;
    transform: rotate(-15deg);
    transition: all 2s ease-in-out;
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.forensic-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(10, 1fr);
    width: 100%;
    height: 100%;
    opacity: 0.03; /* Almost invisible */
}

.micro-text {
    font-size: 8px;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-container {
    position: fixed;
    z-index: 60;
    opacity: 0.4;
    transition: opacity 0.3s;
}

.qr-container:hover {
    opacity: 1; /* Punish user for looking at it? Logic says trigger alerts, here we just show it clearly */
}

.top-right { top: 20px; right: 20px; }
.bottom-left { bottom: 20px; left: 20px; }

.qr-code {
    width: 80px;
    height: 80px;
    border: 2px solid rgba(255,255,255,0.2);
}

.warning-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid red;
    padding: 2rem;
    font-size: 1.5rem;
    z-index: 99999;
    border-radius: 1rem;
    box-shadow: 0 0 50px red;
}
</style>

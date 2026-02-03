<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  id: Number,
  initialX: { type: Number, default: 100 },
  initialY: { type: Number, default: 100 },
})

const emit = defineEmits(['delete', 'update'])

const x = ref(props.initialX)
const y = ref(props.initialY)
const content = ref('')
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const startDrag = (e) => {
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - x.value,
    y: e.clientY - y.value
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  x.value = e.clientX - dragOffset.value.x
  y.value = e.clientY - dragOffset.value.y
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const deleteNote = () => {
  emit('delete', props.id)
}
</script>

<template>
  <div 
    class="sticky-note" 
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <div class="note-header" @mousedown="startDrag">
      <span>📝 Nota</span>
      <button class="close-btn" @click.stop="deleteNote">×</button>
    </div>
    <textarea 
      v-model="content" 
      placeholder="Escribe algo importante..."
      @mousedown.stop
    ></textarea>
  </div>
</template>

<style scoped>
.sticky-note {
  position: fixed;
  width: 200px;
  height: 200px;
  background-color: #fef3c7; /* Yellow post-it */
  box-shadow: 2px 4px 10px rgba(0,0,0,0.15);
  border-radius: 2px 2px 2px 16px; /* Folded corner */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #fde68a;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.note-header {
  padding: 0.5rem;
  background: rgba(0,0,0,0.05);
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #92400e;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #92400e;
  font-weight: bold;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 0.8;
}

.close-btn:hover {
  color: #b45309;
}

textarea {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.8rem;
  resize: none;
  font-family: 'Comic Sans MS', 'Segoe UI', cursive, sans-serif;
  font-size: 0.9rem;
  color: #4b5563;
  outline: none;
}

@keyframes popIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>

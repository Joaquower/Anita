<script setup>
import { computed } from 'vue'
import { useMouse, useWindowSize } from '@vueuse/core'

/* 
  Smart Positioning:
  The strip tries to stay mostly out of the user's way.
  If mouse is in the Top Half, strip goes to Bottom.
  If mouse is in the Bottom Half, strip goes to Top.
*/
const { y } = useMouse()
const { height } = useWindowSize()

const stripPosition = computed(() => {
    // If mouse is in top 50% of screen, move strip to bottom (80% down)
    // Else move to top (10% down)
    // We use percentage to be responsive
    if (y.value < height.value * 0.45) {
        return { top: '75%', transform: 'rotate(-5deg)' }
    } else if (y.value > height.value * 0.55) {
        return { top: '10%', transform: 'rotate(5deg)' }
    } else {
        // In the middle "neutral zone", stay where it was or go to edges. 
        // Let's bias towards where it was, but defaulting to bottom is safer for reading headers.
        return { top: '85%', transform: 'rotate(-2deg)' }
    }
})
</script>

<template>
  <div class="protection-strip-container" :style="stripPosition">
    <div class="protection-strip">
      <div class="strip-content">
        <!-- Using emojis and spacing to be less 'solid block' -->
        <span class="warning-text">🚫 PROTECTED DOCUMENT • NO SCREENSHOTS 🚫</span>
        <span class="warning-text">🚫 PROTECTED DOCUMENT • NO SCREENSHOTS 🚫</span>
        <span class="warning-text">🚫 PROTECTED DOCUMENT • NO SCREENSHOTS 🚫</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.protection-strip-container {
  position: absolute;
  left: 0;
  width: 100%;
  height: 12vh; /* Reduced height */
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); /* Smarter smooth transition */
}

.protection-strip {
  width: 120%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(255, 105, 180, 0.2), 
    rgba(219, 39, 119, 0.4), 
    rgba(255, 105, 180, 0.2)
  );
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(219, 39, 119, 0.15);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.strip-content {
  display: flex;
  gap: 4rem;
  white-space: nowrap;
  animation: scroll 25s linear infinite;
}

.warning-text {
  font-size: 1.2rem; /* Smaller font */
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6); /* More subtle text */
  letter-spacing: 4px;
  text-transform: uppercase;
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>

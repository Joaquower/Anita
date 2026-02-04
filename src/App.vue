<script setup>
import Chatbot from './components/Chatbot.vue'
</script>

<template>
  <RouterView />
  <Chatbot />
</template>

<style>
/* Global resets if needed */
body {
  margin: 0;
  padding: 0;
  background-color: #fff0f5; /* Lavender Blush (Light Pink) */
  color: #4a4a4a;
  font-family: 'Quicksand', sans-serif;
  overflow-x: hidden;
}

#app {
  width: 100vw;
  min-height: 100vh;
}
</style>

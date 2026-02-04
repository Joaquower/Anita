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
  background-color: #0f172a; /* Dark premium background */
  color: #f8fafc;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

#app {
  width: 100vw;
  min-height: 100vh;
}
</style>

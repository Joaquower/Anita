<script setup>
</script>

<template>
  <div class="locked-container">
    <div class="alert-box">
      <div class="icon">🚫</div>
      <h1>ACCESO DENEGADO PERMANENTEMENTE</h1>
      <p>Se ha detectado actividad sospechosa en su sesión.</p>
      
      <div class="details">
        <p><strong>Razón:</strong> Múltiples intentos de captura de pantalla detectados.</p>
        <p><strong>ID de Incidente:</strong> #SEC-{{ Math.floor(Math.random() * 100000) }}</p>
        <p><strong>IP Registrada:</strong> 192.168.x.x</p>
      </div>

      <p class="warning">
        Este incidente ha sido reportado al administrador del sistema. 
        Su cuenta ha sido bloqueada preventivamente.
      </p>
    </div>
  </div>
</template>

<style scoped>
.locked-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  color: #ef4444;
}

.alert-box {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
  border: 2px solid #ef4444;
  background: rgba(239, 68, 68, 0.1);
  animation: pulse 2s infinite;
}

.icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  text-transform: uppercase;
}

.details {
  background: rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  margin: 2rem 0;
  border-left: 4px solid #ef4444;
  text-align: left;
  font-family: monospace;
}

.warning {
  font-size: 0.9rem;
  opacity: 0.8;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
</style>

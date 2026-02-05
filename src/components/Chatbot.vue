<script setup>
    import { ref, nextTick, watch, onMounted } from 'vue'
    import { useRoute } from 'vue-router'

    const isOpen = ref(false)
    const messages = ref([
        {
            role: 'system',
            content: `Eres un tutor experto y amable especializado en la preparación para el examen EGEL de Odontología. 
    Tu conocimiento abarca Odontopediatría, Farmacología, Prótesis, Endodoncia, Salud Pública y Biomateriales.
    
    Reglas:
    1. Responde SIEMPRE en español.
    2. Mantén el foco EXCLUSIVAMENTE en temas de odontología y el examen EGEL.
    3. Si te preguntan sobre otros temas (como historia, política, deportes, etc.), responde cortésmente que solo puedes ayudar con temas de odontología.
    4. Sé claro, conciso y didáctico. Usa listas y negritas cuando sea útil.
    5. Basa tus respuestas en la práctica clínica estándar y normativa mexicana cuando aplique.`
        },
        {
            role: 'assistant',
            content: '¡Hola! Soy tu tutor personal para el EGEL. Pregúntame sobre Odontopediatría, Farmacología o cualquier tema de tus guías. ¿En qué puedo ayudarte hoy?'
        }
    ])
    const newMessage = ref('')
    const isLoading = ref(false)
    const apiKey = ref(localStorage.getItem('openai_api_key') || import.meta.env.VITE_OPENAI_API_KEY || '')
    const showSettings = ref(false)
    const chatContainer = ref(null)

    const route = useRoute()
    const isVisible = ref(false)

    // Check visibility based on route
    watch(() => route.path, (newPath) => {
        isVisible.value = newPath !== '/' && newPath !== '/login'
    }, { immediate: true })

    const scrollToBottom = async () => {
        await nextTick()
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
        }
    }

    const saveApiKey = () => {
        localStorage.setItem('openai_api_key', apiKey.value)
        showSettings.value = false
    }

    const sendMessage = async () => {
        if (!newMessage.value.trim() || isLoading.value) return

        if (!apiKey.value) {
            showSettings.value = true
            return
        }

        const userMsg = { role: 'user', content: newMessage.value }
        messages.value.push(userMsg)
        newMessage.value = ''
        isLoading.value = true
        await scrollToBottom()

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.value}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // or gpt-3.5-turbo
                    messages: messages.value.map(({ role, content }) => ({ role, content })),
                    temperature: 0.7
                })
            })

            const data = await response.json()

            if (data.error) {
                throw new Error(data.error.message)
            }

            const botMsg = data.choices[0].message
            messages.value.push(botMsg)
        } catch (error) {
            messages.value.push({
                role: 'assistant',
                content: `Error: ${error.message}. Por favor verifica tu API Key.`
            })
            if (error.message.includes('key')) {
                showSettings.value = true
            }
        } finally {
            isLoading.value = false
            await scrollToBottom()
        }
    }
</script>

<template>
    <div v-if="isVisible" class="chatbot-wrapper">
        <!-- Chat Window -->
        <transition name="slide-up">
            <div v-if="isOpen" class="chat-window">
                <div class="chat-header">
                    <div class="header-info">
                        <span class="bot-avatar">🦷</span>
                        <div>
                            <h3>Tutor EGEL</h3>
                            <span class="status">En línea</span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button @click="showSettings = !showSettings" class="icon-btn" title="Configuración">⚙️</button>
                        <button @click="isOpen = false" class="icon-btn">✕</button>
                    </div>
                </div>

                <!-- Settings Layer -->
                <div v-if="showSettings" class="settings-layer">
                    <h4>Configuración</h4>
                    <p>Ingresa tu API Key de OpenAI para activar el chat.</p>
                    <input v-model="apiKey" type="password" placeholder="sk-..." class="api-input" />
                    <button @click="saveApiKey" class="save-btn">Guardar</button>
                </div>

                <div class="chat-messages" ref="chatContainer">
                    <div v-for="(msg, index) in messages.filter(m => m.role !== 'system')" :key="index"
                        :class="['message', msg.role]">
                        <div class="message-content">
                            {{ msg.content }}
                        </div>
                    </div>
                    <div v-if="isLoading" class="message assistant">
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>

                <div class="chat-input">
                    <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Escribe tu duda..."
                        :disabled="isLoading" />
                    <button @click="sendMessage" :disabled="isLoading || !newMessage.trim()">
                        ➤
                    </button>
                </div>
            </div>
        </transition>

        <!-- Toggle Button -->
        <button class="chat-toggle" @click="isOpen = !isOpen">
            <span v-if="!isOpen" class="toggle-icon">💬</span>
            <span v-else class="toggle-icon">✕</span>
        </button>
    </div>
</template>

<style scoped>
    .chatbot-wrapper {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    }

    .chat-toggle {
        width: 60px;
        height: 60px;
        border-radius: 30px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
    }

    .chat-toggle:hover {
        transform: scale(1.05);
    }

    .toggle-icon {
        font-size: 24px;
        color: white;
    }

    .chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .chat-header {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .bot-avatar {
        background: rgba(255, 255, 255, 0.1);
        padding: 8px;
        border-radius: 50%;
        font-size: 20px;
    }

    .header-info h3 {
        margin: 0;
        font-size: 1rem;
        color: #f8fafc;
    }

    .status {
        font-size: 0.75rem;
        color: #4ade80;
    }

    .message {
        display: flex;
        margin-bottom: 1rem;
    }

    .message.user {
        justify-content: flex-end;
    }

    .message.assistant {
        justify-content: flex-start;
    }

    .message-content {
        max-width: 80%;
        padding: 0.8rem 1rem;
        border-radius: 12px;
        font-size: 0.9rem;
        line-height: 1.4;
    }

    .message.user .message-content {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border-bottom-right-radius: 2px;
    }

    .message.assistant .message-content {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        border-bottom-left-radius: 2px;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        scroll-behavior: smooth;
    }

    .chat-input {
        padding: 1rem;
        display: flex;
        gap: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
    }

    .chat-input input {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.8rem;
        border-radius: 10px;
        color: white;
        outline: none;
    }

    .chat-input input:focus {
        border-color: #6366f1;
    }

    .chat-input button {
        background: #6366f1;
        border: none;
        width: 40px;
        border-radius: 10px;
        color: white;
        cursor: pointer;
        transition: background 0.2s;
    }

    .chat-input button:hover {
        background: #4f46e5;
    }

    .chat-input button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Settings Layer */
    .settings-layer {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.98);
        z-index: 10;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: white;
    }

    .api-input {
        width: 100%;
        padding: 0.8rem;
        margin: 1rem 0;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
    }

    .save-btn {
        background: #4ade80;
        border: none;
        padding: 0.8rem 2rem;
        border-radius: 8px;
        color: #0f172a;
        font-weight: 600;
        cursor: pointer;
    }

    .icon-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 5px;
        font-size: 1.1rem;
    }

    .icon-btn:hover {
        color: white;
    }

    /* Animations */
    .slide-up-enter-active,
    .slide-up-leave-active {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .slide-up-enter-from,
    .slide-up-leave-to {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }

    .typing-indicator span {
        display: inline-block;
        width: 6px;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        margin: 0 2px;
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator span:nth-child(1) {
        animation-delay: -0.32s;
    }

    .typing-indicator span:nth-child(2) {
        animation-delay: -0.16s;
    }


    @keyframes bounce {

        0%,
        80%,
        100% {
            transform: scale(0);
        }

        40% {
            transform: scale(1);
        }
    }

    @media (max-width: 768px) {
        .chatbot-wrapper {
            /* Reset wrapper positioning context for mobile if needed, 
               but moving the window to fixed is cleaner */
            z-index: 10000;
            /* Ensure high z-index on mobile */
        }

        .chat-window {
            position: fixed;
            /* Fix to viewport, not wrapper */
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            background: #0f172a;
            /* Solid background for mobile */
        }

        .chat-header {
            padding-top: max(1rem, env(safe-area-inset-top));
            /* Safe area for notch */
        }

        .chat-toggle {
            /* Adjust toggle button position if needed, or hide it when open */
            z-index: 10001;
        }

        /* Hide toggle when open is handled by v-if on window usually? 
           The template shows toggle button is outside chat window. 
           But if full screen, we replace toggle with 'X' in header. 
           Let's hide the floating toggle when chat is open on mobile. */
    }
</style>
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import SecureDoc from '../views/SecureDoc.vue'
import Locked from '../views/Locked.vue'
import FileList from '../views/FileList.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'login',
            component: Login
        },
        {
            path: '/files',
            name: 'files',
            component: FileList,
            meta: { requiresAuth: true }
        },
        {
            path: '/view',
            name: 'view',
            component: SecureDoc,
            meta: { requiresAuth: true }
        },
        {
            path: '/locked',
            name: 'locked',
            component: Locked
        }
    ]
})

router.beforeEach((to, from, next) => {
    const isAuthenticated = localStorage.getItem('authToken')
    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'login' })
    } else {
        next()
    }
})

export default router

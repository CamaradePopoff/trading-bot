/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */
import { createRouter, createWebHistory } from 'vue-router/auto'
import { routes } from 'vue-router/auto-routes'
import { useMainStore } from '@/store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  console.log('Navigating from', from.path, 'to', to.path)
  
  // Check if route requires authentication
  const isAuthRoute = to.path !== '/login' && to.path !== '/register'
  const store = useMainStore()
  const isAuthenticated = store.isAuthenticated
  
  // Redirect to login if accessing protected route without authentication
  if (isAuthRoute && !isAuthenticated) {
    console.warn('Attempted to access protected route without authentication:', to.path)
    return '/login'
  }
  
  // Redirect to home if already authenticated and trying to access login/register
  if (!isAuthRoute && isAuthenticated) {
    return '/home'
  }
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!localStorage.getItem('vuetify:dynamic-reload')) {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err)
      localStorage.removeItem('vuetify:dynamic-reload')
    }
  } else {
    console.error(err)
  }
})

/*
router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})
*/
export default router

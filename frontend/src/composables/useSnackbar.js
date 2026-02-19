import { useMainStore } from '@/store'

/**
 * Composable for showing snackbar messages
 * @returns {Object} Object containing showSuccess, showError, showInfo methods
 */
export function useSnackbar() {
  const main = useMainStore()

  const showSnackbar = (color, text, timeout = 3000) => {
    main.$patch({ 
      snackbar: { 
        show: true, 
        color, 
        text, 
        timeout 
      } 
    })
  }

  const showSuccess = (text, timeout = 5000) => {
    showSnackbar('success', text, timeout)
  }

  const showError = (text, timeout = 5000) => {
    showSnackbar('error', text, timeout)
  }

  const showInfo = (text, timeout = 3000) => {
    showSnackbar('info', text, timeout)
  }

  const showWarning = (text, timeout = 4000) => {
    showSnackbar('warning', text, timeout)
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showSnackbar
  }
}

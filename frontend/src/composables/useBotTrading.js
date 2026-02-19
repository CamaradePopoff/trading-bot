import { ref } from 'vue'
import botService from '@services/bot.service'
import { useSnackbar } from './useSnackbar'

/**
 * Composable for bot trading actions
 * @param {Object} options - Configuration options
 * @param {Function} options.getTranslation - Function to get translation (t function from i18n)
 * @returns {Object} Object containing trading methods and state
 */
export function useBotTrading(options = {}) {
  const { getTranslation = (key) => key } = options
  const { showError, showSuccess } = useSnackbar()
  
  const isBusy = ref(false)
  const showConfirmNegativeSellingDialog = ref(false)
  
  /**
   * Check if selling would result in a negative profit and show confirmation if needed
   * @param {Object} transaction - The transaction to check
   * @param {Function} onConfirm - Callback to execute after confirmation
   */
  const checkSelling = (transaction, onConfirm) => {
    if (!transaction) return
    
    if (transaction.profit < 0) {
      showConfirmNegativeSellingDialog.value = true
      return () => {
        showConfirmNegativeSellingDialog.value = false
        onConfirm()
      }
    } else {
      onConfirm()
    }
  }
  
  /**
   * Execute a sell order
   * @param {string} botId - The bot ID
   * @param {string} transactionId - The transaction ID to sell
   */
  const sellNow = async (botId, transactionId) => {
    if (!transactionId) return
    
    isBusy.value = true
    try {
      await botService.sellNow(botId, transactionId)
      // Success is handled by the backend/websocket updates
    } catch (err) {
      showError(err.message || getTranslation('components.bot.sellFailed'))
    } finally {
      isBusy.value = false
    }
  }
  
  /**
   * Execute a buy order
   * @param {string} botId - The bot ID
   * @param {number|null} usd - Optional USD amount to buy
   */
  const buyNow = async (botId, usd = null) => {
    isBusy.value = true
    try {
      await botService.buyNow(botId, usd)
      // Success is handled by the backend/websocket updates
    } catch (err) {
      showError(err.message || getTranslation('components.bot.buyFailed'))
    } finally {
      isBusy.value = false
    }
  }
  
  /**
   * Update bot configuration
   * @param {string} botId - The bot ID
   * @param {Object} config - The new configuration
   * @param {Function} onSuccess - Optional callback on success
   */
  const updateConfig = async (botId, config, onSuccess) => {
    try {
      const response = await botService.updateConfig(botId, config)
      showSuccess(getTranslation('components.bot.configSaved'))
      if (onSuccess) {
        onSuccess(response)
      }
      return response
    } catch (err) {
      showError(err.message || getTranslation('components.bot.saveFailed'))
      throw err
    }
  }
  
  return {
    isBusy,
    showConfirmNegativeSellingDialog,
    checkSelling,
    sellNow,
    buyNow,
    updateConfig
  }
}

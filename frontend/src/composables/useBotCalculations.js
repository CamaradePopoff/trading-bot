import { computed } from 'vue'

/**
 * Composable for bot calculations
 * @param {Ref|ComputedRef} bot - The bot object (reactive)
 * @returns {Object} Object containing calculated values
 */
export function useBotCalculations(bot) {
  /**
   * Position size in USDT (amount to invest per position)
   */
  const positionSize = computed(() => {
    if (!bot.value?.config) return 0
    return bot.value.config.maxInvestment / bot.value.config.maxPositions
  })

  /**
   * Position size with boost
   */
  const positionSizeWithBoost = computed(() => {
    if (!bot.value?.config) return 0
    return positionSize.value + (bot.value.usdtBoost || 0)
  })

  /**
   * Check if bot can buy (has enough balance)
   */
  const canBuy = (usdBalance) => {
    if (!bot.value?.config || bot.value.config.simulation) return true
    return positionSizeWithBoost.value <= usdBalance
  }

  /**
   * Get the crypto symbol without the exchange asset suffix
   */
  const cryptoSymbol = computed(() => {
    if (!bot.value?.config?.symbol) return ''
    return bot.value.config.symbol.replace(/-(USDT|BUSD|USDC)$/, '')
  })

  return {
    positionSize,
    positionSizeWithBoost,
    canBuy,
    cryptoSymbol
  }
}

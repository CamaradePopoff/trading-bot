import { computed } from 'vue'

/**
 * Composable for bot price calculations
 * @param {Ref|ComputedRef} bot - The bot object (reactive)
 * @returns {Object} Object containing currentDropThreshold and nextPurchasePrice computed properties
 */
export function useBotPrices(bot) {
  const currentDropThreshold = computed(() => {
    if (!bot.value) return 0
    // Support both legacy single threshold and new threshold array
    if (
      bot.value.config.priceDropThresholds &&
      Array.isArray(bot.value.config.priceDropThresholds) &&
      bot.value.config.priceDropThresholds.length > 0
    ) {
      const index = Math.min(
        bot.value.currentThresholdIndex || 0,
        bot.value.config.priceDropThresholds.length - 1
      )
      return bot.value.config.priceDropThresholds[index]
    }
    // Legacy: use single priceDropThreshold
    return bot.value.config.priceDropThreshold
  })

  const nextPurchasePrice = computed(() => {
    if (!bot.value) return 0
    return bot.value.lastHighestPrice * (1 - currentDropThreshold.value / 100)
  })

  return {
    currentDropThreshold,
    nextPurchasePrice
  }
}

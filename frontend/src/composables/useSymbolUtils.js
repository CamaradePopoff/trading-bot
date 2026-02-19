import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store'

/**
 * Composable for bot/crypto symbol utilities
 * @param {Ref|ComputedRef} symbol - The trading symbol (e.g., 'BTC-USDT')
 * @returns {Object} Object containing symbol utilities
 */
export function useSymbolUtils(symbol = null) {
  const main = useMainStore()
  const router = useRouter()

  /**
   * Remove the exchange asset suffix from a symbol
   * @param {string} sym - Symbol to clean (e.g., 'BTC-USDT')
   * @returns {string} Clean symbol (e.g., 'BTC')
   */
  const cleanSymbol = (sym) => {
    if (!sym) return ''
    return sym.replace(new RegExp(`-?${main.exchangeAsset}$`), '')
  }

  /**
   * The clean symbol as a computed property (if symbol is provided)
   */
  const cryptoSymbol = symbol ? computed(() => cleanSymbol(symbol.value)) : null

  /**
   * Create a regex pattern for news search
   * @param {string} sym - Symbol to create pattern for
   * @returns {RegExp} Regex pattern for news filtering
   */
  const createNewsPattern = (sym) => {
    const cleanSym = cleanSymbol(sym)
    const pattern = `\\b${cleanSym}\\b`
    return new RegExp(pattern, 'gi')
  }

  /**
   * Get count of news articles for a symbol
   * @param {string} sym - Symbol to count news for
   * @returns {number} Number of news articles
   */
  const getNewsCount = (sym) => {
    const regex = createNewsPattern(sym)
    return main.news.filter(n => regex.test(n.annTitle)).length
  }

  /**
   * Navigate to news page filtered by symbol
   * @param {string} sym - Symbol to filter news by
   */
  const goToNews = (sym) => {
    const cleanSym = cleanSymbol(sym)
    router.push(`/news?search=${cleanSym}&caseSensitive=true&entireWord=true`)
  }

  return {
    cleanSymbol,
    cryptoSymbol,
    createNewsPattern,
    getNewsCount,
    goToNews
  }
}

<template>
  <div
    ref="chartContainer"
    class="lightweight-chart-container"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { createChart } from 'lightweight-charts'
import { useMainStore } from '@/store'
import currencyService from '@services/currency.service'

const main = useMainStore()
const chartContainer = ref(null)
const chart = ref(null)
const candlestickSeries = ref(null)
const priceLines = ref([])

const props = defineProps({
  pair: {
    type: String,
    required: true
  },
  currentPrice: {
    type: Number,
    default: null
  },
  purchasePrices: {
    type: Array,
    default: () => []
  },
  exchange: {
    type: String,
    default: null
  }
})

const initChart = async () => {
  if (!chartContainer.value) return

  // Create chart with dark theme
  chart.value = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight,
    layout: {
      background: { color: '#1E1E1E' },
      textColor: '#D9D9D9',
    },
    grid: {
      vertLines: { color: '#2B2B2B' },
      horzLines: { color: '#2B2B2B' },
    },
    crosshair: {
      mode: 1,
    },
    rightPriceScale: {
      borderColor: '#2B2B2B',
    },
    timeScale: {
      borderColor: '#2B2B2B',
      timeVisible: true,
      secondsVisible: false,
    },
  })

  // Add candlestick series
  candlestickSeries.value = chart.value.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  })

  // Fetch and load data
  await loadChartData()

  // Add price lines
  updatePriceLines()
}

const loadChartData = async () => {
  try {
    // Get current price from props or store
    const realPrice = props.currentPrice || main.symbolPrice(props.pair)
    
    if (!realPrice) {
      console.warn('No price available for', props.pair)
      return
    }
    
    // Fetch real historical candle data from the exchange
    // Get last ~5 hours of data (100 candles * 3 minutes)
    const endAt = Math.floor(Date.now() / 1000)
    const startAt = endAt - (100 * 3 * 60) // 100 candles of 3 minutes
    
    console.log('Fetching candles for', props.pair, 'from', startAt, 'to', endAt)
    
    const candles = await currencyService.getCandles(
      props.pair,
      '3m',
      startAt,
      endAt
    )
    
    console.log('Received candles:', candles?.length || 0, 'candles')
    if (candles && candles.length > 0) {
      console.log('Raw last 3 candles from API:', candles.slice(-3))
    }
    
    if (!candles || candles.length === 0) {
      console.warn('No candle data received for', props.pair, '- using fallback data')
      // Fallback to synthetic data if API fails
      loadFallbackData(realPrice)
      return
    }
    
    // Validate and filter candles
    const validCandles = candles.filter(candle => {
      // Check for valid data
      if (!candle || typeof candle.time !== 'number') return false
      if (isNaN(candle.open) || isNaN(candle.high) || isNaN(candle.low) || isNaN(candle.close)) return false
      if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) return false
      
      // Validate OHLC relationships
      if (candle.high < Math.max(candle.open, candle.close)) {
        console.warn('Invalid candle: high < max(open, close)', candle)
        return false
      }
      if (candle.low > Math.min(candle.open, candle.close)) {
        console.warn('Invalid candle: low > min(open, close)', candle)
        return false
      }
      
      // Filter out outliers - check all OHLC values against real price
      const maxPrice = candle.high
      const minPrice = candle.low
      const avgPrice = (candle.open + candle.close) / 2
      
      // Any value more than 30% away from real price is suspicious
      const maxDeviation = Math.max(
        Math.abs(maxPrice - realPrice) / realPrice,
        Math.abs(minPrice - realPrice) / realPrice,
        Math.abs(avgPrice - realPrice) / realPrice
      )
      
      if (maxDeviation > 0.3) {
        console.warn('Filtering outlier candle - deviation:', (maxDeviation * 100).toFixed(2) + '%', candle)
        return false
      }
      
      return true
    })
    
    console.log('Valid candles after filtering:', validCandles.length)
    
    if (validCandles.length === 0) {
      console.warn('No valid candles after filtering - using fallback data')
      loadFallbackData(realPrice)
      return
    }
    
    // Sort by time (ascending) - lightweight-charts needs oldest first
    const sortedCandles = [...validCandles].sort((a, b) => a.time - b.time)
    
    console.log('Setting', sortedCandles.length, 'candles to chart')
    console.log('First candle:', sortedCandles[0])
    console.log('Last candle:', sortedCandles[sortedCandles.length - 1])

    if (candlestickSeries.value && sortedCandles.length > 0) {
      candlestickSeries.value.setData(sortedCandles)
      
      // Fit content to show all data
      chart.value.timeScale().fitContent()
      
      // Auto-scale to include all purchase price lines
      autoscaleYAxis()
    }
  } catch (error) {
    console.error('Error loading chart data:', error)
    // Fallback to synthetic data on error
    const realPrice = props.currentPrice || main.symbolPrice(props.pair)
    if (realPrice) {
      loadFallbackData(realPrice)
    }
  }
}

const loadFallbackData = (realPrice) => {
  console.log('Loading fallback synthetic data for price:', realPrice)
  const currentTime = Math.floor(Date.now() / 1000)
  const data = []
  const numCandles = 100
  
  // Generate realistic crypto price movements that end at current price
  const startPrice = realPrice * (0.90 + Math.random() * 0.20)
  let currentPrice = startPrice
  const priceHistory = [startPrice]
  
  // Generate random walk with trends
  for (let i = 1; i < numCandles; i++) {
    const momentum = i > 0 ? (priceHistory[i - 1] - (priceHistory[i - 2] || startPrice)) * 0.3 : 0
    const volatility = realPrice * (0.01 + Math.random() * 0.02)
    const randomMove = (Math.random() - 0.5) * volatility
    const largeMove = Math.random() < 0.05 ? (Math.random() - 0.5) * volatility * 3 : 0
    
    currentPrice = currentPrice + momentum + randomMove + largeMove
    currentPrice = Math.max(realPrice * 0.7, Math.min(realPrice * 1.3, currentPrice))
    
    priceHistory.push(currentPrice)
  }
  
  priceHistory.push(realPrice)
  
  // Convert to OHLC candles
  for (let i = 0; i <= numCandles; i++) {
    const time = currentTime - ((numCandles - i) * 180)
    const price = priceHistory[i]
    const candleVolatility = price * (0.003 + Math.random() * 0.007)
    
    const open = i === 0 ? price : data[i - 1].close
    const close = price
    
    const wickRange = candleVolatility * (0.5 + Math.random() * 1.5)
    const high = Math.max(open, close) + wickRange * Math.random()
    const low = Math.min(open, close) - wickRange * Math.random()
    
    data.push({
      time,
      open: Math.max(0, open),
      high: Math.max(0, high),
      low: Math.max(0, low),
      close: Math.max(0, close),
    })
  }

  if (candlestickSeries.value && data.length > 0) {
    candlestickSeries.value.setData(data)
    chart.value.timeScale().fitContent()
    autoscaleYAxis()
  }
}

const updatePriceLines = () => {
  if (!candlestickSeries.value) return

  // Remove existing price lines
  priceLines.value.forEach(line => {
    candlestickSeries.value.removePriceLine(line)
  })
  priceLines.value = []

  // Add current price line
  if (props.currentPrice) {
    const currentLine = candlestickSeries.value.createPriceLine({
      price: props.currentPrice,
      color: '#2196F3',
      lineWidth: 2,
      lineStyle: 0, // Solid
      axisLabelVisible: true,
      title: `Current (${main.jsRound(props.currentPrice)})`,
    })
    priceLines.value.push(currentLine)
  }

  // Add purchase price lines
  props.purchasePrices.forEach((priceInfo, index) => {
    const line = candlestickSeries.value.createPriceLine({
      price: priceInfo.price,
      color: priceInfo.color || '#01bc8d',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: priceInfo.label || `Buy ${index + 1}`,
    })
    priceLines.value.push(line)
  })
  
  // Auto-scale after adding price lines
  autoscaleYAxis()
}

const autoscaleYAxis = () => {
  if (!chart.value || !candlestickSeries.value) return
  
  // Get all prices to include in the scale
  const allPrices = []
  
  // Add current price
  if (props.currentPrice) {
    allPrices.push(props.currentPrice)
  }
  
  // Add all purchase prices
  props.purchasePrices.forEach(priceInfo => {
    allPrices.push(priceInfo.price)
  })
  
  if (allPrices.length === 0) return
  
  // Calculate min and max with padding
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const range = maxPrice - minPrice
  const padding = range * 0.05 // 5% padding
  
  // Apply the visible range
  chart.value.priceScale('right').applyOptions({
    scaleMargins: {
      top: 0.1,
      bottom: 0.1,
    },
  })
  
  // Set the visible logical range to include all prices
  candlestickSeries.value.applyOptions({
    priceFormat: {
      type: 'price',
      precision: 8,
      minMove: 0.00000001,
    },
  })
}

const handleResize = () => {
  if (chart.value && chartContainer.value) {
    chart.value.applyOptions({
      width: chartContainer.value.clientWidth,
      height: chartContainer.value.clientHeight,
    })
  }
}

// Watch for changes in purchase prices
watch(() => props.purchasePrices, () => {
  updatePriceLines()
}, { deep: true })

watch(() => props.currentPrice, async () => {
  if (candlestickSeries.value) {
    await loadChartData()
  }
  updatePriceLines()
})

watch(() => props.pair, async () => {
  if (candlestickSeries.value) {
    await loadChartData()
    updatePriceLines()
  }
})

onMounted(async () => {
  await nextTick()
  await initChart()
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  if (chart.value) {
    chart.value.remove()
  }
})
</script>

<style scoped>
.lightweight-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

<template>
  <div
    ref="containerRef"
    class="mini-chart"
    :style="{ height: `${props.height}px` }"
  >
    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      {{ main.jsRound(tooltipPrice * 1) }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createChart } from 'lightweight-charts'
import { useMainStore } from '@/store'

const props = defineProps({
  chartKey: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: 28
  },
  maxPoints: {
    type: Number,
    default: 60
  }
})

const containerRef = ref(null)
const main = useMainStore()
let chart = null
let series = null
let resizeObserver = null
const dataPoints = []
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipPrice = ref('')

const getCachedPoints = () => {
  return main.miniChartCache[props.chartKey] || []
}

const setCachedPoints = (points) => {
  main.$patch({
    miniChartCache: {
      ...main.miniChartCache,
      [props.chartKey]: points
    }
  })
  try {
    localStorage.setItem('kubot:miniChartCache', JSON.stringify(main.miniChartCache))
  } catch (err) {
    console.warn('Failed to persist mini chart cache:', err)
  }
}

const updateSeriesColor = () => {
  if (!series || !chart || dataPoints.length < 2) return
  
  // Get visible time range
  const timeScale = chart.timeScale()
  const visibleRange = timeScale.getVisibleRange()
  
  if (!visibleRange) {
    // No visible range, use all points
    const first = dataPoints[0].value
    const last = dataPoints[dataPoints.length - 1].value
    const isUp = last > first
    series.applyOptions({
      color: isUp ? '#26a69a' : '#ef5350'
    })
    return
  }
  
  // Filter points to only visible ones
  const visiblePoints = dataPoints.filter(
    p => p.time >= visibleRange.from && p.time <= visibleRange.to
  )
  
  if (visiblePoints.length < 2) {
    // Not enough visible points, keep current color
    return
  }
  
  const first = visiblePoints[0].value
  const last = visiblePoints[visiblePoints.length - 1].value
  const isUp = last > first
  series.applyOptions({
    color: isUp ? '#26a69a' : '#ef5350'
  })
}

const pushPoint = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return
  const time = Math.floor(Date.now() / 1000)
  const lastPoint = dataPoints[dataPoints.length - 1]
  if (lastPoint && lastPoint.time === time) {
    lastPoint.value = value
    series.update({ time, value })
  } else {
    dataPoints.push({ time, value })
    if (dataPoints.length > props.maxPoints) {
      dataPoints.shift()
      series.setData(dataPoints)
    } else {
      series.update({ time, value })
    }
  }
  const cachedPoints = dataPoints.slice(-props.maxPoints)
  updateSeriesColor()
  setCachedPoints(cachedPoints)
}

const buildChart = () => {
  if (!containerRef.value) return
  const width = Math.max(containerRef.value.clientWidth, 40)
  const cachedPoints = getCachedPoints()
  chart = createChart(containerRef.value, {
    width,
    height: props.height,
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: '#9e9e9e',
      attributionLogo: false
    },
    grid: {
      vertLines: { color: 'transparent' },
      horzLines: { color: 'transparent' }
    },
    rightPriceScale: { visible: false },
    leftPriceScale: { visible: false },
    timeScale: {
      visible: false,
      borderVisible: false
    },
    crosshair: {
      vertLine: { 
        visible: true,
        color: '#9e9e9e',
        width: 1,
        style: 1
      },
      horzLine: { 
        visible: true,
        color: '#9e9e9e',
        width: 1,
        style: 1
      }
    },
    handleScroll: false,
    handleScale: false
  })

  series = chart.addLineSeries({
    color: '#26a69a',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  })

  // Subscribe to crosshair move for tooltip
  chart.subscribeCrosshairMove((param) => {
    if (!param.time || !param.point || !series) {
      tooltipVisible.value = false
      return
    }

    const seriesData = param.seriesData.get(series)
    if (!seriesData) {
      tooltipVisible.value = false
      return
    }

    tooltipVisible.value = true
    tooltipX.value = param.point.x
    tooltipY.value = 0
    tooltipPrice.value = seriesData.value.toFixed(8)
  })

  // Subscribe to visible time range changes to update color
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    updateSeriesColor()
  })

  if (cachedPoints.length > 0) {
    dataPoints.splice(0, dataPoints.length, ...cachedPoints)
    series.setData(dataPoints)
    updateSeriesColor()
  }
}

onMounted(() => {
  buildChart()
  if (props.price !== null) {
    pushPoint(props.price)
  }
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        if (chart && width) {
          chart.applyOptions({ width: Math.max(width, 40), height: props.height })
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

watch(
  () => props.price,
  (value) => {
    if (!series) return
    pushPoint(value)
  }
)

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
  }
  if (chart) {
    chart.remove()
  }
  chart = null
  series = null
  resizeObserver = null
})
</script>

<style scoped>
.mini-chart {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-tooltip {
  position: absolute;
  padding: 4px 8px;
  background: #111;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  transform: translate(-50%, -100%);
  margin-top: -4px;
}

.mini-chart :deep(.tv-logo),
.mini-chart :deep(.tv-lightweight-charts__logo) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
</style>

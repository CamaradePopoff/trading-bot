<template>
  <div
    ref="containerRef"
    class="mini-chart"
    :style="{ height: `${props.height}px` }"
  />
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
  if (!series || dataPoints.length < 2) return
  const startIndex = Math.max(0, dataPoints.length - props.maxPoints)
  const first = dataPoints[startIndex].value
  const last = dataPoints[dataPoints.length - 1].value
  const isUp = last >= first
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
  updateSeriesColor()
  setCachedPoints(dataPoints.slice(-props.maxPoints))
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
      vertLine: { visible: false },
      horzLine: { visible: false }
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
}

.mini-chart :deep(.tv-logo),
.mini-chart :deep(.tv-lightweight-charts__logo) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
</style>

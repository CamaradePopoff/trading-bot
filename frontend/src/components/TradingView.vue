<template>
  <div class="chart-container">
    <div
      :id="pair"
      class="tradingview-widget-container"
    >
      <div
        :id="pair + '_widget'"
        class="tradingview-widget-container__widget"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMainStore } from '@/store'

const main = useMainStore()
const widget = ref()

const props = defineProps({
  pair: {
    type: String,
    required: true
  },
  lang: {
    type: String,
    default: 'en'
  },
  canChoose: {
    type: Boolean,
    default: false
  },
  showDateRanges: {
    type: Boolean,
    default: false
  },
  exchange: {
    type: String,
    default: null
  }
})

watch(
  () => props.pair,
  (newPair) => {
    console.log('Pair changed', newPair)
  }
)

onMounted(() => {
  init()
})

const init = () => {
  console.log('Init TradingView widget for', props.pair)
  const currentExchange = (props.exchange || main.exchange || 'kucoin').toUpperCase()
  const symbolPrefix = currentExchange === 'KUCOIN' ? 'KUCOIN:' : ''
  try {
    // eslint-disable-next-line
    widget.value = new TradingView.widget({
      symbol: `${symbolPrefix}${props.pair.replace('-', '')}`,
      interval: "3",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: props.lang,
      container_id: props.pair + '_widget',
      enable_publishing: false,
      allow_symbol_change: props.canChoose,
      hide_side_toolbar: true,
      withdateranges: props.showDateRanges,
      disabled_features: ['header_widget'],
      width: '100%',
      height: '100%',
      studies_overrides: {
        'volume.volume.color.0': 'rgba(0, 0, 0, 0)',  // Transparent volume color for down bars
        'volume.volume.color.1': 'rgba(0, 0, 0, 0)'   // Transparent volume color for up bars
      },
      overrides: {
        'volumePaneSize': 'tiny' // You can also adjust or hide the pane size
      }
    })
  } catch (error) {
    console.error('Error initializing TradingView widget', error)
  }
}
</script>

<style scoped>
.chart-container {
  display: inline-block;
  height: 100%;
  width: 100%;
  margin: 0px;
  border-radius: 4px;
  border: 1px solid transparent;
  overflow: hidden;
}
.chart-container iframe {
  width: 100%;
  border: none;
}
</style>

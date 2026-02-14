<template>
  <div class="threshold-container">
    <table class="priceDropThresholds">
      <tbody>
        <tr>
          <td
            v-if="canScrollLeft"
            class="arrow-cell clickable"
            :rowspan="nextPurchasePrice && bot.freePositions >= 0 ? 2 : 1"
            @click.stop="scrollLeft"
          >
            <v-icon size="small">
              mdi-chevron-left
            </v-icon>
          </td>
          <td
            v-for="item in visibleThresholds"
            :key="item.index"
            :class="item.index === bot.currentThresholdIndex ? 'text-purchase current-threshold' : item.index < bot.currentThresholdIndex ? 'text-grey-darken-1' : ''"
          >
            -{{ item.value }}%
          </td>
          <td
            v-if="canScrollRight"
            class="arrow-cell clickable"
            :rowspan="nextPurchasePrice && bot.freePositions >= 0 ? 2 : 1"
            @click.stop="scrollRight"
          >
            <v-icon size="small">
              mdi-chevron-right
            </v-icon>
          </td>
        </tr>
        <tr v-if="nextPurchasePrice && bot.freePositions >= 0">
          <td
            v-for="item in visibleThresholds"
            :key="'price-' + item.index"
            :class="item.index === bot.currentThresholdIndex ? 'text-purchase current-threshold' : ''"
          >
            <template v-if="item.index >= bot.currentThresholdIndex">
              {{ main.jsRound(nextPurchasePrice * (1 - item.cumulativeDrop / 100)) }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMainStore } from '@/store'

const main = useMainStore()
const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  nextSellingTransaction: {
    type: Object,
    default: null
  }
})

const WINDOW_SIZE = 5
const viewOffset = ref(0)

const nextPurchasePrice = computed(() => {
  // Base price from the next selling transaction
  const basePrice = props.nextSellingTransaction
    ? props.nextSellingTransaction.price
    : props.bot.lastHighestPrice

  // Check if next purchase will be an emergency position
  const isNextEmergency = props.bot.freePositions <= 0 && 
    props.bot.config.emergencyUnlockThreshold > 0 &&
    props.bot.activeEmergencyPositions < (props.bot.config.emergencyUnlockPositions || 1)
  
  // For emergency positions, use emergency threshold
  if (isNextEmergency) {
    return basePrice * (1 - props.bot.config.emergencyUnlockThreshold / 100)
  }
  
  // Otherwise, use first threshold from array if available, or single threshold
  const threshold = props.bot.config.priceDropThresholds && 
    Array.isArray(props.bot.config.priceDropThresholds) && 
    props.bot.config.priceDropThresholds.length > 0
    ? props.bot.config.priceDropThresholds[0]
    : props.bot.config.priceDropThreshold
  
  return basePrice * (1 - threshold / 100)
})

const visibleThresholds = computed(() => {
  if (!props.bot || !props.bot.config.priceDropThresholds) return []
  
  const thresholds = props.bot.config.priceDropThresholds
  const reversedThresholds = [...thresholds].reverse()
  const currentIndex = props.bot.currentThresholdIndex || 0
  const reversedCurrentIndex = thresholds.length - 1 - currentIndex
  
  // Calculate the start index to center the current threshold
  let start = reversedCurrentIndex - Math.floor(WINDOW_SIZE / 2) + viewOffset.value
  
  // Adjust if we're at the beginning or end
  if (start < 0) {
    start = 0
  } else if (start + WINDOW_SIZE > reversedThresholds.length) {
    start = Math.max(0, reversedThresholds.length - WINDOW_SIZE)
  }
  
  const end = Math.min(start + WINDOW_SIZE, reversedThresholds.length)
  
  return reversedThresholds.slice(start, end).map((value, idx) => {
    const originalIndex = thresholds.length - 1 - (start + idx)
    // Calculate cumulative drop starting AFTER currentIndex up to this threshold
    const currentIndex = props.bot.currentThresholdIndex || 0
    const cumulativeDrop = originalIndex > currentIndex 
      ? thresholds.slice(currentIndex + 1, originalIndex + 1).reduce((sum, val) => sum + val, 0)
      : 0
    return {
      value,
      index: originalIndex,
      cumulativeDrop
    }
  })
})

const canScrollLeft = computed(() => {
  if (!props.bot || !props.bot.config.priceDropThresholds) return false
  const thresholds = props.bot.config.priceDropThresholds
  
  // If total thresholds fit in window, no scrolling needed
  if (thresholds.length <= WINDOW_SIZE) return false
  
  const currentIndex = props.bot.currentThresholdIndex || 0
  const reversedCurrentIndex = thresholds.length - 1 - currentIndex
  const start = reversedCurrentIndex - Math.floor(WINDOW_SIZE / 2) + viewOffset.value
  return start > 0
})

const canScrollRight = computed(() => {
  if (!props.bot || !props.bot.config.priceDropThresholds) return false
  const thresholds = props.bot.config.priceDropThresholds
  
  // If total thresholds fit in window, no scrolling needed
  if (thresholds.length <= WINDOW_SIZE) return false
  
  const currentIndex = props.bot.currentThresholdIndex || 0
  const reversedCurrentIndex = thresholds.length - 1 - currentIndex
  const start = reversedCurrentIndex - Math.floor(WINDOW_SIZE / 2) + viewOffset.value
  return start + WINDOW_SIZE < thresholds.length
})

const scrollLeft = () => {
  if (!props.bot || !props.bot.config.priceDropThresholds) return
  const thresholds = props.bot.config.priceDropThresholds
  const currentIndex = props.bot.currentThresholdIndex || 0
  const reversedCurrentIndex = thresholds.length - 1 - currentIndex
  viewOffset.value = Math.max(viewOffset.value - 1, -reversedCurrentIndex)
}

const scrollRight = () => {
  if (!props.bot || !props.bot.config.priceDropThresholds) return
  const thresholds = props.bot.config.priceDropThresholds
  const currentIndex = props.bot.currentThresholdIndex || 0
  const reversedCurrentIndex = thresholds.length - 1 - currentIndex
  const maxOffset = thresholds.length - WINDOW_SIZE - reversedCurrentIndex + Math.floor(WINDOW_SIZE / 2)
  viewOffset.value = Math.min(viewOffset.value + 1, maxOffset)
}

// Reset offset when current threshold changes
watch(() => props.bot.currentThresholdIndex, () => {
  viewOffset.value = 0
})
</script>

<style scoped>
  .threshold-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .threshold-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  table.priceDropThresholds {
    width: 100%;
    border-collapse: collapse;
  }

  table.priceDropThresholds td {
    text-align: center;
    border: 1px solid #616161;
    font-size: 11px;
    padding: 2px 8px;
    white-space: nowrap;
  }

  table.priceDropThresholds td.current-threshold {
    border: 2px solid rgb(var(--v-theme-purchase));
  }

  table.priceDropThresholds td.arrow-cell {
    background-color: rgba(97, 97, 97, 0.2);
    cursor: pointer;
    padding: 2px 4px;
    width: 30px;
    user-select: none;
  }

  table.priceDropThresholds td.arrow-cell :deep(.v-icon) {
    pointer-events: none;
  }

  table.priceDropThresholds td.arrow-cell:hover {
    background-color: rgba(97, 97, 97, 0.4);
  }

</style>

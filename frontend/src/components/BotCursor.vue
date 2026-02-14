<template>
  <v-slider
    v-if="nextPurchasePrice && props.nextSellingTransaction?.targetPrice"
    class="bot-cursor text-body-2"
    :class="[props.dense ? 'dense' : '', isOutOfRange ? 'out-of-range' : '']"
    :model-value="displayPrice"
    dense
    :color="isPaused ? 'sellingDark' : (isOutOfRange ? 'grey-darken-3' : 'selling')"
    :track-color="isPaused ? 'purchaseDark' : (isOutOfRange ? 'grey-darken-3' : 'purchase')"
    readonly
    :thumb-size="10"
    :thumb-label="props.hideThumb ? '' : 'always'"
    :show-ticks="props.nextSellingTransaction?.price >= nextPurchasePrice && props.nextSellingTransaction?.price <= props.nextSellingTransaction?.targetPrice ? 'always' : ''"
    :step="1e-10"
    :ticks="ticks"
    :min="nextPurchasePrice > (props.bot.config.maxWorkingPrice || Infinity) ? 1e-10 + props.bot.config.maxWorkingPrice : 1e-10 + nextPurchasePrice"
    :max="1e-10 + props.nextSellingTransaction?.targetPrice"
  >
    <template #thumb-label>
      <div class="d-flex align-center">
        <span>{{ main.jsRound(props.bot.currentPrice) }}</span>
        <span
          v-if="!props.hideDetails && priceChangePercent !== null"
          :class="priceChangePercent >= 0 ? 'text-success' : 'text-error'"
          class="ml-1"
        >
          {{ priceChangePercent >= 0 ? '+' : '' }}{{ priceChangePercent }}%
        </span>
      </div>
    </template>
    <template
      v-if="!props.hideDetails"
      #prepend
    >
      <div class="text-right">
        <div
          v-if="!dense"
          class="pb-1"
        >
          {{ $t('components.bot.nextPurchase') }} <v-icon
            v-if="props.bot.freePositions <= 0 && props.bot.activeEmergencyPositions >= props.bot.config.emergencyUnlockPositions"
            color="error"
          >
            mdi-cancel
          </v-icon>
          <v-icon
            v-if="props.bot.freePositions <= 0 && props.bot.emergencyUnlockThreshold > 0 && props.bot.activeEmergencyPositions < (props.bot.config.emergencyUnlockPositions || 1)"
            color="emergency"
            size="small"
          >
            mdi-flash-outline
          </v-icon>
        </div>
        <div :class="nextPurchasePrice > (props.bot.config.maxWorkingPrice || Infinity) ? 'text-warning' : ''">
          <v-icon
            v-if="props.bot.freePositions <= 0 && dense"
            color="error"
          >
            mdi-cancel
          </v-icon>
          <v-icon
            v-if="props.bot.stopBuying || nextPurchasePrice < bot.config.minWorkingPrice"
            color="error"
          >
            mdi-currency-usd-off
          </v-icon> {{ nextPurchasePrice > (props.bot.config.maxWorkingPrice || Infinity) ? props.bot.config.maxWorkingPrice : main.jsRound(nextPurchasePrice) }}
        </div>
      </div>
    </template>
    <template
      v-if="!props.hideDetails"
      #append
    >
      <div class="text-left">
        <div
          v-if="!dense"
          class="pb-1"
        >
          {{ $t('components.bot.nextSelling') }}
        </div>
        <div>
          {{ main.jsRound(props.nextSellingTransaction?.targetPrice) }}
          <v-icon
            v-if="props.bot.stopBuying || props.nextSellingTransaction?.targetPrice > (bot.config.maxWorkingPrice || Infinity)"
            color="error"
          >
            mdi-currency-usd-off
          </v-icon>
        </div>
      </div>
    </template>
  </v-slider>
</template>

<script setup>
import { computed } from 'vue'
import { useMainStore } from '@/store'

const main = useMainStore()

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  nextSellingTransaction: {
    type: Object,
    required: true
  },
  dense: {
    type: Boolean,
    default: false
  },
  hideDetails: {
    type: Boolean,
    default: false
  },
  hideThumb: {
    type: Boolean,
    default: false
  }
})

const isOutOfRange = computed(() => {
  const min = props.bot.config.maxWorkingPrice ? Math.min(props.bot.config.maxWorkingPrice, nextPurchasePrice.value) : nextPurchasePrice.value
  return props.bot.currentPrice < min || props.bot.currentPrice > props.nextSellingTransaction.value?.targetPrice
})

const isPaused = computed(() => {
  return props.bot.isPaused
})

const displayPrice = computed(() => {
  const min = nextPurchasePrice.value > (props.bot.config.maxWorkingPrice || Infinity) 
    ? 1e-10 + props.bot.config.maxWorkingPrice 
    : 1e-10 + nextPurchasePrice.value
  const max = 1e-10 + props.nextSellingTransaction?.targetPrice
  
  // Clamp the price to stay within the slider range
  if (props.bot.currentPrice < min) return min
  if (props.bot.currentPrice > max) return max
  return props.bot.currentPrice
})

const nextPurchasePrice = computed(() => {
  // Check if next purchase will be an emergency position
  const isNextEmergency = props.bot.freePositions <= 0 && 
    props.bot.config.emergencyUnlockThreshold > 0 &&
    props.bot.activeEmergencyPositions < (props.bot.config.emergencyUnlockPositions || 1)
  
  // Base price from the next selling transaction
  const basePrice = props.nextSellingTransaction
    ? props.nextSellingTransaction.price
    : props.bot.lastHighestPrice
  
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

const priceChangePercent = computed(() => {
  if (!props.nextSellingTransaction?.price || !props.bot.currentPrice) return null
  const change = ((props.bot.currentPrice - props.nextSellingTransaction.price) / props.nextSellingTransaction.price) * 100
  return Math.round(change * 100) / 100
})

const ticks = computed(() => {
  const t = {
    [props.nextSellingTransaction.price]: ''
  }
  if (nextPurchasePrice.value > (props.bot.config.maxWorkingPrice || Infinity)) {
    t[nextPurchasePrice.value] = ''
  }
  return t
})
</script>

<style scoped>
.bot-cursor.out-of-range :deep(.v-slider-thumb__label) {
  background-color: #333 !important;
  color: #fff !important;
}
</style>

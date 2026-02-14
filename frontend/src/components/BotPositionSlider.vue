<template>
  <v-container
    fluid
    class="ma-0 pa-0"
  >
    <v-row
      dense
      :class="hideDetails ? 'mx-0 overflow-hidden' : 'mx-4 overflow-hidden'"
    >
      <v-slider
        :class="`text-caption bot-cursor dense ${hideDetails ? 'pt-0 pb-1' : 'pt-1 pb-5'}`"
        dense
        readonly
        thumb-size="0"
        show-ticks="always"
        :ticks="ticks"
        :tick-size="hideDetails ? 2 : 4"
        :model-value="bot.currentPrice"
        :step="1e-10"
        :min="Math.min(bot.currentPrice, ...Object.keys(ticks).map(Number))"
        :max="Math.max(bot.currentPrice, ...Object.keys(ticks).map(Number))"
        track-color="grey-lighten-2"
        hide-details
      >
        <template #prepend>
          <div style="margin-right: -22px; margin-top: -3px;">
            <v-icon
              color="grey-lighten-2"
              :size="!hideDetails ? 'large' : 'small' "
              :style="hideDetails ? 'margin-left: 4px; margin-top: 2px;' : ''"
            >
              mdi-pac-man
            </v-icon>
          </div>
        </template>
        <template
          v-if="!hideDetails"
          #append
        >
          <div style="margin-left: -8px; margin-top: -3px;">
            <v-tooltip :text="showPercent ? t('components.botPositionSlider.hideDropPercentage') : t('components.botPositionSlider.showDropPercentage')">
              <template #activator="{ props }">
                <v-icon
                  v-bind="props"
                  class="clickable"
                  :color="showPercent ? 'primary' : 'error'"
                  size="large"
                  @click="showPercent = !showPercent"
                >
                  mdi-percent-box-outline
                </v-icon>
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-slider>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMainStore } from '@/store'
import { useI18n } from 'vue-i18n'

const main = useMainStore()
const { t } = useI18n()
const showPercent = ref(true)

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  hideDetails: {
    type: Boolean,
    default: false
  }
})

const ticks = computed(() => {
  const ticks = {}
  const transactions = main.botTransactions(props.bot._id)
    .filter((transaction) => transaction.targetPrice && !transaction.isSold)
  
  // Get sorted unique target prices (lowest to highest)
  const sortedPrices = [...new Set(transactions.map(t => t.targetPrice))].sort((a, b) => a - b)
  
  transactions.forEach((transaction) => {
    const priceDisplay = props.hideDetails ? '' : main.jsRound(transaction.targetPrice)
    
    // Find the current position in the sorted list
    const currentIndex = sortedPrices.indexOf(transaction.targetPrice)
    
    // If this is the highest position, no percentage
    if (currentIndex === sortedPrices.length - 1) {
      ticks[transaction.targetPrice] = priceDisplay
    } else {
      // Calculate percentage drop from the next higher position to this one
      const higherPrice = sortedPrices[currentIndex + 1]
      const percentDrop = Math.round(100 * ((transaction.targetPrice - higherPrice) / higherPrice) * 100) / 100
      ticks[transaction.targetPrice] = props.hideDetails ? '' : priceDisplay + (showPercent.value ? ` (${percentDrop}%)` : '')
    }
  })
  return ticks
})

</script>

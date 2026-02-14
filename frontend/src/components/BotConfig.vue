<template>
  <v-form>
    <v-container class="ma-0 pa-0">
      <v-row dense>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="localForm.label"
            :label="$t('components.botConfig.botLabel')"
            variant="outlined"
            type="text"
            density="compact"
            clearable
            :readonly="props.readonly"
            :disabled="props.readonly"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="localForm.botInterval"
            :label="$t('components.botConfig.botInterval')"
            density="compact"
            variant="outlined"
            type="number"
            :readonly="props.readonly"
            :disabled="props.readonly"
            min="3"
            max="30"
          />
        </v-col>
        
        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 py-2 mb-1">
            <v-col
              cols="12"
              class="mt-0 py-0"
            >
              {{ $t('components.botConfig.currencySettingsLabel') }}
            </v-col>
            <v-col
              cols="6"
            >
              <v-autocomplete
                v-model="localForm.symbol"
                :label="$t('common.pair')"
                variant="outlined"
                density="compact"
                :items="pairs"
                :readonly="props.isEdition || props.readonly"
                :disabled="props.isEdition || props.readonly"
                hide-details
                @update:model-value="updateSymbolData();"
              />
            </v-col>
            <v-col
              :cols="main.isVipFeeExchange ? 6 : 4"
            >
              <v-text-field
                v-model="localForm.fee"
                :label="$t('components.botConfig.marketFee')"
                variant="outlined"
                density="compact"
                readonly
                disabled
                type="text"
                hide-details
              />
            </v-col>
            <v-col
              v-if="localForm.symbol && !props.isEdition"
              cols="12"
              style="height: 300px;"
            >
              <TradingView
                :key="localForm.symbol"
                :pair="localForm.symbol"
                :lang="main.lang"
                :exchange="main.exchange"
              />
            </v-col>
            <v-col
              v-if="!main.isVipFeeExchange"
              cols="2"
              class="pt-2"
            >
              <v-chip :class="mdAndUp ? 'px-6' : 'px-4'">
                <span v-if="mdAndUp">{{ $t('common.class') }}</span>
                <span class="ml-1">{{ symbolClass }}</span>
              </v-chip>
            </v-col>

            <v-col
              cols="6"
            >
              <v-text-field
                v-model="localForm.symbolMinSize"
                :label="$t('common.minSize')"
                density="compact"
                variant="outlined"
                readonly
                disabled
                type="text"
                hide-details
              />
            </v-col>
            <v-col
              cols="6"
            >
              <v-text-field
                v-model="localForm.symbolIncrement"
                :label="$t('common.minIncrement')"
                variant="outlined"
                density="compact"
                readonly
                disabled
                type="text"
                hide-details
              />
            </v-col>

            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                v-model="localForm.maxInvestment"
                :label="$t('components.botConfig.maxInvestment', { asset: main.exchangeAsset })"
                variant="outlined"
                density="compact"
                type="number"
                min="10"
                step="10"
                hide-details
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                v-model="localForm.maxPositions"
                :label="$t('components.botConfig.maxPositions')"
                variant="outlined"
                density="compact"
                type="number"
                min="1"
                hide-details
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                disabled
                readonly
                :model-value="pricePerPosition"
                density="compact"
                :label="$t('components.botConfig.positionPrice', { asset: main.exchangeAsset })"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col
              cols="6"
              md="3"
            >
              <v-text-field
                v-model="localForm.positionsToRebuy"
                :label="$t('components.botConfig.positionsToRebuy')"
                variant="outlined"
                density="compact"
                type="number"
                min="1"
                :max="localForm.maxPositions - 1"
                hide-details
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>

            <v-col
              cols="6"
              class="my-0 py-0"
            >
              <v-switch
                v-model="localForm.convertProfitToCrypto"
                color="primary"
                :label="$t('components.botConfig.profitAsCrypto')"
                hide-details
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
            <v-col
              cols="6"
              class="my-0 py-0"
            >
              <v-switch
                v-model="localForm.simulation"
                :disabled="props.isEdition || props.readonly"
                :readonly="props.isEdition || props.readonly"
                color="primary"
                :label="$t('common.simulation')"
                hide-details
                @change="localForm.convertProfitToCrypto = false"
              />
            </v-col>
            <v-col
              v-if="cryptoAlert"
              class="text-body-2 pb-1"
              cols="12"
            >
              <v-alert
                type="warning"
                density="compact"
              >
                <div>{{ $t('components.botConfig.cryptoAlert1', { price: currentPrice }) }}</div>
                <div>{{ $t('components.botConfig.cryptoAlert2', { profit: cryptoAlert, min: localForm.symbolIncrement }) }}</div>
              </v-alert>
            </v-col>
          </v-row>
        </v-col>

        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 py-2 my-2">
            <v-col
              cols="12"
              class="mt-0 py-0"
            >
              {{ $t('components.botConfig.dropBehaviorLabel') }}
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="mt-2 py-0"
            >
              <v-radio-group
                v-model="thresholdMode"
                inline
                density="compact"
                class="mb-4"
                hide-details
              >
                <v-radio
                  :label="$t('components.botConfig.singleThreshold')"
                  value="single"
                  class="mr-2"
                />
                <v-radio
                  :label="$t('components.botConfig.thresholdArray')"
                  value="array"
                />
              </v-radio-group>
              <v-text-field
                v-if="thresholdMode === 'single'"
                v-model="localForm.priceDropThreshold"
                density="compact"
                :label="$t('components.botConfig.priceDropThreshold')"
                variant="outlined"
                type="number"
                :min="0.1"
                :max="100"
                :step="0.1"
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
              <v-text-field
                v-else
                v-model="thresholdsInput"
                density="compact"
                :label="$t('components.botConfig.priceDropThresholds')"
                variant="outlined"
                :hint="$t('components.botConfig.thresholdsHint')"
                persistent-hint
                :readonly="props.readonly"
                :disabled="props.readonly"
                @input="parseThresholdsInput"
              />
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="mt-2 py-0"
            >
              <div style="padding-top: 8px">
                {{ $t('components.botConfig.unlockEmergencyPosition') }}
              </div>
              <v-row>
                <v-col
                  cols="6"
                >
                  <v-text-field
                    v-model="localForm.emergencyUnlockThreshold"
                    density="compact"
                    class="mt-4"
                    :label="$t('components.botConfig.emergencyUnlockThreshold')"
                    variant="outlined"
                    type="number"
                    :min="0.1"
                    :max="100"
                    :step="0.1"
                    :readonly="props.readonly"
                    :disabled="props.readonly"
                  />
                </v-col>
                <v-col 
                  cols="6"
                  class="d-flex align-center"
                >
                  <v-text-field
                    v-model="localForm.emergencyUnlockPositions"
                    density="compact"
                    class="mt-4"
                    :label="$t('components.botConfig.emergencyUnlockPositions')"
                    variant="outlined"
                    type="number"
                    :min="1"
                    :step="1"
                    :readonly="props.readonly"
                    :disabled="props.readonly"
                  />
                </v-col>
              </v-row>
            </v-col>
            <v-col
              v-if="localForm.symbol && projectedBot && projectedNextSellingTransaction"
              cols="12"
            >
              <BotDropProfileTable
                :bot="projectedBot"
                :next-selling-transaction="projectedNextSellingTransaction"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 pt-2 mt-1 mb-2">
            <v-col
              cols="12"
              class="mt-0 mb-4 py-0"
            >
              {{ $t('components.botConfig.riseBehaviorLabel') }}
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="my-0 py-0"
            >
              <v-text-field
                v-model="localForm.profitMargin"
                density="compact"
                :label="$t('components.botConfig.profitMargin')"
                variant="outlined"
                type="number"
                :min="0.1"
                :max="100"
                :step="0.1"
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 pt-2 mt-1 mb-2">
            <v-col
              cols="12"
              class="mt-0 mb-4 py-0"
            >
              {{ $t('components.botConfig.workingRangeLabel') }}
            </v-col>
            <v-col
              cols="6"
              class="my-0 py-0"
            >
              <v-text-field
                v-model="localForm.minWorkingPrice"
                density="compact"
                :label="$t('components.botConfig.minWorkingPrice')"
                variant="outlined"
                type="number"
                :min="0"
                clearable
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
            <v-col
              cols="6"
              class="my-0 py-0"
            >
              <v-text-field
                v-model="localForm.maxWorkingPrice"
                density="compact"
                :label="$t('components.botConfig.maxWorkingPrice')"
                variant="outlined"
                type="number"
                :min="0"
                clearable
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 pt-2 mt-1 mb-2">
            <v-col
              cols="12"
              class="mt-0 mb-4 py-0"
            >
              {{ $t('components.botConfig.reinvestLabel') }}
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="my-0 py-0"
            >
              <v-text-field
                v-model="localForm.reuseProfitToMaxPositions"
                density="compact"
                :label="$t('components.botConfig.reinvestProfitToMaxPositions')"
                variant="outlined"
                type="number"
                :min="localForm.maxPositions + 1"
                step="1"
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="my-0 py-0"
            >
              <v-switch
                v-model="localForm.reuseProfit"
                color="primary"
                :label="$t('components.botConfig.reinvestProfit')"
                hide-details
                :readonly="props.readonly"
                :disabled="props.readonly"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col
          cols="12"
          class="px-4"
        >
          <v-row class="bg-blue-grey-darken-4 pt-2 mt-1">
            <v-col
              cols="12"
              class="mt-0 mb-4 py-0"
            >
              {{ $t('components.botConfig.previewLabel') }}
            </v-col>
            <v-col
              v-if="currentPrice > 0"
              cols="12"
              class="my-0 py-0"
            >
              <v-slider
                class="bot-cursor dense pb-3"
                dense
                readonly
                thumb-label="always"
                thumb-size="10"
                thumb-color="white"
                show-ticks="always"
                :ticks="ticks"
                :tick-size="2"
                :model-value="currentPrice"
                :step="1e-9"
                :min="main.jsRound(lowerBound || currentPrice) "
                :max="main.jsRound(upperBound || currentPrice)"
                hide-details
              >
                <template #prepend>
                  <div>
                    {{ main.jsRound(lowerBound || currentPrice) }}
                  </div>
                </template>
                <template #append>
                  <div>
                    {{ main.jsRound(upperBound || currentPrice) }}
                  </div>
                </template>
              </v-slider>
            </v-col>
            <v-col
              cols="12"
            >
              <BotCursor
                v-if="projectedBot && projectedNextSellingTransaction"
                :bot="projectedBot"
                dense
                :next-selling-transaction="projectedNextSellingTransaction"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  </v-form>
</template>
  
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import currencyService from '@services/currency.service'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'

const main = useMainStore()
const { mdAndUp } = useDisplay()

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  isEdition: {
    type: Boolean
  },
  readonly: {
    type: Boolean,
    default: false
  },
  bot: {
    type: Object,
    default: () => null
  },
  nextSellingTransaction: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue', 'valid', 'invalid'])

const pairs = ref()
const pairData = ref()
const localForm = ref({ ...props.modelValue })
const currentPrice = ref()
const interval = ref()
const vipFee = ref(null)
const thresholdMode = ref('single')
const thresholdsInput = ref('')

watch(localForm, (newVal) => {
  emit('update:modelValue', newVal)
  if (!props.isEdition) {
    localForm.value.symbolMinSize = symbolMinSize.value
    localForm.value.symbolIncrement = symbolIncrement.value
  }
  emit(isValidConfig.value ? 'valid' : 'invalid')
}, { deep: true })

watch(() => localForm.value.symbol, () => {
  updateSymbolData()
})

watch(thresholdMode, (newMode) => {
  if (newMode === 'single') {
    // Switch to single threshold mode
    delete localForm.value.priceDropThresholds
    if (!localForm.value.priceDropThreshold) {
      localForm.value.priceDropThreshold = 2
    }
  } else {
    // Switch to array mode
    if (!thresholdsInput.value) {
      thresholdsInput.value = '1.0, 1.0, 1.5, 1.5, 2.0'
    }
    parseThresholdsInput()
  }
})

onMounted(() => {
  // Initialize threshold mode based on existing config
  if (localForm.value.priceDropThresholds && Array.isArray(localForm.value.priceDropThresholds) && localForm.value.priceDropThresholds.length > 0) {
    thresholdMode.value = 'array'
    thresholdsInput.value = localForm.value.priceDropThresholds.join(', ')
  } else {
    thresholdMode.value = 'single'
  }
  
  if (!props.isEdition) {
    currencyService.getTradingPairs().then((data) => {
      pairData.value = data // [{ symbol, baseMinSize, baseIncrement }]
      pairs.value = data.map((p) => p.symbol)
    })
    if (localForm.value.symbol) updateSymbolData()
  }
  
  // Load VIP fee if exchange supports it
  if (main.isVipFeeExchange) {
    currencyService.getVipFee().then((data) => {
      vipFee.value = data.vipFee
    }).catch(() => {
      // Fallback to 0.001 if VIP fee fetch fails
      vipFee.value = 0.001
    })
  }
  
  interval.value = setInterval(getPrice, 3000)
})

onUnmounted(() => {
  clearInterval(interval.value)
})

const isValidConfig = computed(() => {
  const hasValidThreshold = 
    localForm.value.priceDropThreshold || 
    (localForm.value.priceDropThresholds && Array.isArray(localForm.value.priceDropThresholds) && localForm.value.priceDropThresholds.length > 0)
  
  return localForm.value.botInterval &&
  localForm.value.exchange &&
  localForm.value.symbol &&
  localForm.value.symbolMinSize &&
  localForm.value.symbolIncrement &&
  localForm.value.fee &&
  hasValidThreshold &&
  localForm.value.profitMargin &&
  localForm.value.maxPositions >= 1 &&
  localForm.value.positionsToRebuy >= 1 &&
  localForm.value.positionsToRebuy <= localForm.value.maxPositions &&
  localForm.value.maxInvestment &&
  (localForm.value.minWorkingPrice || -Infinity) < (localForm.value.maxWorkingPrice || Infinity)
  && (!localForm.value.reuseProfitToMaxPositions || localForm.value.reuseProfitToMaxPositions > localForm.value.maxPositions)
})

const cryptoAlert = computed(() => {
  if (!localForm.value.profitMargin) return 0
  const investmentPerPosition = localForm.value.maxInvestment / localForm.value.maxPositions
  const fee = vipFee.value || (localForm.value.fee / 100) || (main.kucoinFee || 0.001)
  
  // Calculate with buy and sell fees:
  // Buy cost = investment / (1 - buyFee) to account for fee deducted
  // Sell proceeds = amount * price * (1 - sellFee)
  // Profit in crypto = (investment / price) - (investment / price * (1 + profitMargin/100)) = negative (we're selling higher)
  // But we need to account for fees on both sides
  
  const amount = investmentPerPosition / currentPrice.value
  const amountAfterBuyFee = amount * (1 - fee)
  const sellProceedsBeforeFee = amountAfterBuyFee * currentPrice.value * (1 + localForm.value.profitMargin / 100)
  const sellProceedsAfterFee = sellProceedsBeforeFee * (1 - fee)
  const profitInUsd = sellProceedsAfterFee - investmentPerPosition
  const profitInCrypto = profitInUsd / currentPrice.value
  
  if(localForm.value.convertProfitToCrypto && isValidConfig.value && profitInCrypto < localForm.value.symbolIncrement) return main.jsRound(profitInCrypto)
  return 0 
})

const pricePerPosition = computed(() => main.jsRound(localForm.value.maxInvestment / localForm.value.maxPositions))

const lowerBound = computed(() => {
  if (!currentPrice.value) return null
  if (thresholdMode.value === 'single' && localForm.value.priceDropThreshold) {
    return currentPrice.value * (1 - localForm.value.priceDropThreshold / 100 * localForm.value.maxPositions)
  } else if (thresholdMode.value === 'array' && localForm.value.priceDropThresholds && Array.isArray(localForm.value.priceDropThresholds)) {
    let cumulativeThreshold = 0
    for (let i = 0; i < localForm.value.maxPositions; i++) {
      const thresholdIndex = Math.min(i, localForm.value.priceDropThresholds.length - 1)
      cumulativeThreshold += localForm.value.priceDropThresholds[thresholdIndex]
    }
    return currentPrice.value * (1 - cumulativeThreshold / 100)
  }
  return null
})

const upperBound = computed(() => {
  if(!localForm.value.profitMargin) return null
  if (!currentPrice.value) return null
  return currentPrice.value * (1 + localForm.value.profitMargin / 100 * localForm.value.maxPositions)
})

const ticks = computed(() => {
  const ticks = { [currentPrice.value]: '' }
  if (!currentPrice.value || !localForm.value.profitMargin) return ticks
  
  // Check if using threshold array or single threshold
  const useThresholdArray = localForm.value.priceDropThresholds && 
    Array.isArray(localForm.value.priceDropThresholds) && 
    localForm.value.priceDropThresholds.length > 0
  
  // Generate lower bound ticks
  if (useThresholdArray) {
    let cumulativeThreshold = 0
    for (let i = 1; i <= localForm.value.maxPositions; i++) {
      const thresholdIndex = Math.min(i - 1, localForm.value.priceDropThresholds.length - 1)
      cumulativeThreshold += localForm.value.priceDropThresholds[thresholdIndex]
      const low = currentPrice.value * (1 - cumulativeThreshold / 100)
      if (low >= (localForm.value.minWorkingPrice || -Infinity) && low <= currentPrice.value) {
        ticks[low] = ''
      }
    }
  } else if (localForm.value.priceDropThreshold) {
    for (let i = 1; i <= localForm.value.maxPositions; i++) {
      const low = currentPrice.value * (1 - i * localForm.value.priceDropThreshold / 100)
      if (low >= (localForm.value.minWorkingPrice || -Infinity) && low <= currentPrice.value) {
        ticks[low] = ''
      }
    }
  }
  
  // Generate upper bound ticks
  const maxBound = Math.min(upperBound.value || Infinity, localForm.value.maxWorkingPrice || Infinity)
  let i = 1
  let high = currentPrice.value * (1 + i * localForm.value.profitMargin / 100)
  while (high <= maxBound) {
    ticks[high] = ''
    i++
    high = currentPrice.value * (1 + i * localForm.value.profitMargin / 100)
  }
  return ticks
})

const symbolMinSize = computed(() => {
  if (!props.modelValue.symbol || !pairData.value) return 0
  const pair = pairData.value.find((p) => p.symbol === localForm.value.symbol)
  return pair?.baseMinSize || 0
})

const symbolIncrement = computed(() => {
  if (!props.modelValue.symbol || !pairData.value) return 0
  const pair = pairData.value.find((p) => p.symbol === localForm.value.symbol)
  return pair?.baseIncrement || 0
})

const symbolClass = computed(() => {
  if (!localForm.value.fee) return '?'
  return localForm.value.fee <= 0.1 ? 'A' : localForm.value.fee >= 0.3 ? 'C' : 'B'
})

const projectedBot = computed(() => {
  if (!localForm.value.symbol) return null
  if (!props.bot) return {
    config: {
      priceDropThreshold: localForm.value.priceDropThreshold,
      priceDropThresholds: localForm.value.priceDropThresholds,
      profitMargin: localForm.value.profitMargin
    },
    currentThresholdIndex: 0,
    currentPrice: currentPrice.value,
    freePositions: localForm.value.maxPositions,
    lastHighestPrice: currentPrice.value

  }
  const bot = JSON.parse(JSON.stringify(props.bot))
  bot.config.priceDropThreshold = localForm.value.priceDropThreshold
  bot.config.priceDropThresholds = localForm.value.priceDropThresholds
  bot.config.profitMargin = localForm.value.profitMargin
  return bot
})

const projectedNextSellingTransaction = computed(() => {
  if (!localForm.value.symbol) return null
  let transaction = null
  if (!props.nextSellingTransaction) {
    return {
      targetPrice: currentPrice.value * (1 + localForm.value.profitMargin / 100),
      price: currentPrice.value,
      profitMargin: localForm.value.profitMargin / 100
    }
  }
  transaction = { ...props.nextSellingTransaction }
  transaction.targetPrice = transaction.targetPrice / (1 + transaction.profitMargin) * (1 + localForm.value.profitMargin / 100)
  return transaction
})  

const updateSymbolData = () => {
  if (props.isEdition) return
  if (!localForm.value.symbol) return
  currencyService.getSymbolFees(localForm.value.symbol).then((data) => {
    localForm.value.fee = data * 100
  })
  getPrice()
}

const getPrice = () => {
  if (!localForm.value.symbol) return new Promise((resolve) => resolve(null))
  return currencyService.getSymbolPrice(localForm.value.symbol).then((data) => {
    currentPrice.value = data
    return main.jsRound(currentPrice.value)
  })
}

const parseThresholdsInput = () => {
  if (!thresholdsInput.value) return
  
  const values = thresholdsInput.value
    .split(',')
    .map(v => parseFloat(v.trim()))
    .filter(v => !isNaN(v) && v > 0)
  
  if (values.length > 0) {
    localForm.value.priceDropThresholds = values
    delete localForm.value.priceDropThreshold
  }
}
</script>

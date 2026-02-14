<template>
  <div
    class="d-flex font-weight-bold px-3 py-1"
    :class="transparent ? '' : 'bg-grey-darken-3'"
  >
    <template v-if="nextSellingTransaction">
      <v-icon
        class="mr-1"
        size="small"
        color="purchase"
        style="margin-top: 2px;"
      >
        mdi-timer-sand
      </v-icon>
      <div :class="nextSellingTransaction.profit > 0 ? 'text-primary' : 'text-error'">
        <v-tooltip
          location="bottom"
          class="text-body-2"
        >
          <span v-if="nextSellingTransaction.profit > 0">+</span>{{ main.jsRound(nextSellingTransaction.profit) }}
          <template #activator="{ props: pps1 }">
            <span v-bind="pps1">
              <span v-if="nextSellingTransaction.profit > 0">+</span>{{ main.usdtRound(nextSellingTransaction.profit) }}
            </span>
          </template>
        </v-tooltip>
      </div>
      <v-spacer />
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            variant="outlined" 
            style="margin-top: 2px"
            :disabled="isBusy || bot.isPaused"
            color="selling"
            size="x-small"
            @click.stop="checkSelling"
          >
            <v-icon size="x-large">
              mdi-cash
            </v-icon>
          </v-btn>
        </template>
        {{ $t('components.bot.sellNow') }}
      </v-tooltip>
    </template>
    <template v-else>
      <v-icon
        class="mr-1"
        size="small"
        color="grey"
        style="margin-top: 2px;"
      >
        mdi-timer-sand
      </v-icon>
      <span
        v-if="props.transparent"
        class="text-grey"
      >{{ $t('components.bot.noNextSellingShort') }}</span>
      <span
        v-else
        class="text-grey"
      >{{ $t('components.bot.noNextSelling') }}</span>
      <v-spacer />
    </template>
    <v-tooltip
      location="bottom"
      content-class="text-caption"
    >
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          variant="outlined" 
          class="ml-2"
          style="margin-top: 2px"
          :disabled="isBusy || bot.isPaused || (!bot.config.simulation && (bot.config.maxInvestment / bot.config.maxPositions + (bot.usdtBoost || 0)) > main.usdBalance)"
          :color="bot.freePositions > 0 ? 'purchase' : 'warning'"
          size="x-small"
          @click.stop="buyNow()"
        >
          <v-icon size="large">
            mdi-credit-card-outline
          </v-icon>
        </v-btn>
      </template>
      {{ $t('components.bot.buyNow') }}
    </v-tooltip>
    <v-tooltip
      location="bottom"
      content-class="text-caption"
    >
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          variant="outlined"
          class="ml-2"
          style="margin-top: 2px"
          :disabled="isBusy || bot.isPaused"
          :color="bot.freePositions > 0 ? 'purchase' : 'warning'"
          size="x-small"
          @click.stop="openBuyDialog"
        >
          <v-icon size="large">
            mdi-credit-card-edit-outline
          </v-icon>
        </v-btn>
      </template>
      {{ $t('components.bot.buyCustomAmount') }}
    </v-tooltip>
    <div
      v-if="showBuyDialog"
      class="d-flex bg-grey-darken-3"
      :style=" props.transparent
        ? { 'z-index': '10', width: '234px', height: '26px', border: '1px solid #01bc8d', 'padding-top': '0', position: 'absolute', margin: '-1px 0 0 -4px' }
        : { 'z-index': '10', width: '180px', height: '31px', border: '1px solid #01bc8d', 'padding-top': '2px', position: 'absolute', top: mdAndUp ? '48px' : '96px', right: '1px' }"
      @click.stop="$event.stopPropagation()"
    >
      <input
        v-model="buyUsd"
        class="ml-2 text-body-2 px-1 bg-grey-darken-2"
        style="margin-top: 2px; height: 20px; width: 50px;"
      >
      <span class="text-body-2 ml-2 pt-1">{{ main.exchangeAsset }}</span>
      <v-btn 
        variant="outlined"
        class="ml-2"
        style="margin-top: 2px;"
        :disabled="buyUsd <= 0 || buyUsd > main.usdBalance"
        color="primary"
        size="x-small"
        @click.stop="buyNow(parseFloat(buyUsd))"
      >
        OK
      </v-btn>
      <v-spacer />
      <v-icon
        color="error"
        class="ml-1"
        style="margin-right: 2px;"
        @click.stop="closeBuyDialog"
      >
        mdi-close-box-outline
      </v-icon>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useMainStore } from '@/store'

const { mdAndUp } = useDisplay()
const main = useMainStore()

const showBuyDialog = ref(false)
const buyUsd = ref(0)

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  nextSellingTransaction: {
    type: Object,
    default: null
  },
  isBusy: {
    type: Boolean,
    default: false
  },
  transparent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['checkSelling', 'sellNow', 'buyNow'])

const checkSelling = () => {
  if (props.nextSellingTransaction && props.nextSellingTransaction.profit < 0) {
    emit('checkSelling')
  } else {
    sellNow()
  }
}

const sellNow = () => {
  if (!props.nextSellingTransaction) return
  emit('sellNow')
}

const buyNow = (usd = null) => {
  if (usd) {
    emit('buyNow', usd)
    showBuyDialog.value = false
  } else {
    emit('buyNow')
  }
}

const openBuyDialog = () => {
  showBuyDialog.value = true
}

const closeBuyDialog = () => {
  showBuyDialog.value = false
}

const initializeBuyUsd = (amount) => {
  buyUsd.value = amount
}

defineExpose({
  initializeBuyUsd
})
</script>

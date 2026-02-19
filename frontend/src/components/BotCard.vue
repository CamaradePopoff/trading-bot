<template>
  <v-hover v-slot="{ isHovering, props: pps }">
    <v-card
      class="clickable"
      :color="isHovering ? 'blue-grey-darken-4' : ''"
      v-bind="pps"
      @click="emit('selectBot', bot)"
    >
      <v-toolbar
        v-if="!mdAndUp"
        density="compact"
        class="pl-2 pr-3"
        :color="props.bot.config.simulation ? 'simulationDark' : 'blue-grey-darken-4'"
      >
        <img
          style="height: 32px"
          :src="`/${props.bot.config.exchange.toLowerCase()}.png`"
          alt=""
        >
        <div
          class="ml-2 text-h8"
        >
          <span :class="props.bot.config.simulation ? 'text-simulation' : ''">{{ props.bot.config.label || `(${props.bot.config.symbol})` }}</span>
        </div>
        <v-spacer />
        <div
          v-if="botNews(props.bot.config.symbol) > 0"
          class="text-blue clickable mr-1"
          style="margin-top: 2px"
          @click.stop="goToNews(props.bot.config.symbol)"
        >
          <v-icon
            size="small"
            icon="mdi-script-text-outline"
            class="ml-1"
          />
          {{ botNews(props.bot.config.symbol) }}
        </div>
      </v-toolbar>

      <template v-if="showChart">
        <div 
          style="position: absolute; margin-top: calc(47px + 2px + 31px); width: 100%; height: 30px; z-index: 10;"
          class="bg-blue-grey-darken-4"
        >
          <BotCursor
            :bot="props.bot"
            dense
            hide-thumb
            :next-selling-transaction="nextSellingTransaction"
          />
        </div>
        <div
          :style="{
            position: 'absolute',
            margin: 'calc(47px + 2px + 30px + 30px) 0 0 -1px',
            width: 'calc(100% + 2px)',
            height: `calc(100% - ${mdAndUp ? '48px' : '48px - 48px'} - 30px - 30px)`,
            'z-index': 10
          }"
        >
          <TradingView
            :key="main.lang"
            :pair="props.bot.config.symbol"
            :lang="main.lang"
            :exchange="props.bot.config.exchange"
          />
        </div>
      </template>

      <BotActions
        :bot="props.bot"
        :show-chart="showChart"
        @toggle-chart="showChart = !showChart"
      />

      <div class="d-flex">
        <div style="width: 70%;">
          <BotTradingActions
            ref="botTradingActionsRef"
            :bot="props.bot"
            :next-selling-transaction="nextSellingTransaction"
            :is-busy="isBusy"
            @check-selling="checkSelling"
            @sell-now="sellNow"
            @buy-now="buyNow"
          />

          <div
            class="d-flex font-weight-bold bg-grey-darken-3"
          >
            <BotPositionSlider
              :bot="props.bot"
              hide-details
            />
          </div>
        </div>
        <div
          style="width: 30%; border-left: 1px solid grey;"
          class="bg-grey-darken-3 px-2 py-1"
        >
          <MiniChart
            :chart-key="`${props.bot.config.exchange}:${props.bot.config.symbol}`"
            :price="props.bot.currentPrice"
            :height="50"
            :max-points="180"
          />
        </div>
      </div>
      
      <v-card-text :style="{ height: showChart ? '260px' : '127px' }">
        <v-container
          v-if="!showChart"
          class="ma-0 pa-0"
        >
          <v-row
            dense
          >
            <v-col
              cols="12"
              :class="'pt-4'"
            >
              <BotCursor
                v-if="nextSellingTransaction"
                :bot="props.bot"
                dense
                :next-selling-transaction="nextSellingTransaction"
              />
              <div
                v-else
                class="d-flex align-center justify-center mt-2 mb-7 text-body-2"
              >
                <span
                  class="text-purchase m-2"
                  style="margin-top:-1px"
                >{{ $t('components.bot.nextPurchase') }}:</span>
              </div>
            </v-col>
            <v-col
              v-if="bot.config.priceDropThresholds && bot.config.priceDropThresholds.length > 0"
              cols="12"
            >
              <BotDropProfileTable
                :bot="bot"
                :next-selling-transaction="nextSellingTransaction"
                style="margin-top:-24px;"
              />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-hover>

  <ConfirmationPopup
    v-if="showConfirmNegativeSellingDialog"
    @cancel="showConfirmNegativeSellingDialog = false; candidateSellingId = null"
    @confirm="showConfirmNegativeSellingDialog = false; sellNow()"
  >
    {{ $t('components.transactionList.confirmNegativeSelling') }}
  </ConfirmationPopup>
</template>


<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useMainStore } from '@/store'
import { useBotTrading } from '@/composables/useBotTrading'
import { useSymbolUtils } from '@/composables/useSymbolUtils'
import BotDropProfileTable from '@components/BotDropProfileTable.vue'
import BotPositionSlider from '@components/BotPositionSlider.vue'
import BotActions from '@components/BotActions.vue'
import BotTradingActions from '@components/BotTradingActions.vue'

const { mdAndUp } = useDisplay()
const main = useMainStore()
const { getNewsCount, goToNews } = useSymbolUtils()

const showChart = ref(false)
const botTradingActionsRef = ref()

const {
  isBusy,
  showConfirmNegativeSellingDialog,
  sellNow: performSellNow,
  buyNow: performBuyNow
} = useBotTrading()

const props = defineProps({
  bot: {
    type: Object,
    required: true
  }
})

watch(() => main.showAllCharts, (newVal) => {
  showChart.value = newVal
})

const nextSellingTransaction = computed(() => {
  return main.nextSellingWithProfit(props.bot)
})

const emit = defineEmits(['selectBot']) 

onMounted(() => {
  botTradingActionsRef.value?.initializeBuyUsd(
    main.usdtRound(props.bot.config.maxInvestment / props.bot.config.maxPositions)
  )
})

const botNews = (symbol) => {
  return getNewsCount(symbol)
}

// goToNews is now from useSymbolUtils composable

const checkSelling = () => {
  if (nextSellingTransaction.value.profit < 0) {
    showConfirmNegativeSellingDialog.value = true
  } else {
    sellNow()
  }
}

const sellNow = async () => {
  if (!nextSellingTransaction.value) return
  await performSellNow(props.bot._id, nextSellingTransaction.value._id)
}

const buyNow = async (usd = null) => {
  await performBuyNow(props.bot._id, usd)
}
</script>

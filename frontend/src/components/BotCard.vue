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
          class="ml-2"
          :class="props.compact ? 'text-h8' : 'text-h6'"
        >
          <span :class="props.bot.config.simulation ? 'text-simulation' : ''">{{ props.bot.config.label || `(${$t('common.noName')})` }}</span>
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
        :compact="compact"
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
            :chart-key="props.bot._id"
            :price="props.bot.currentPrice"
            :height="50"
            :max-points="180"
          />
        </div>
      </div>
      
      <v-card-text :style="{ height: props.compact ? (showChart ? '260px' : '127px') : '260px' }">
        <v-container
          v-if="!showChart"
          class="ma-0 pa-0"
        >
          <v-row
            dense
          >
            <v-col
              v-if="!props.compact"
              cols="6"
            >
              <div class="mb-2 text-primary">
                <h2>{{ props.bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '') }}</h2>
              </div>
              <h4 class="mb-0">
                {{ $t('components.bot.positions') }}
                <span :class="props.bot.freePositions > 0 ? 'text-purchase' : 'text-error'">{{ props.bot.freePositions }}</span>/<span>
                  {{ props.bot.config.maxPositions + (props.bot.positionBoost || 0) }}
                </span>
              </h4>
            </v-col>
            <v-col
              v-if="!props.compact"
              cols="6"
              align="right"
            >
              <h2 class="mb-2">
                <span class="text-purchase">{{ currentDropThreshold }}%</span>
                - <span class="text-selling">{{ props.bot.config.profitMargin }}%</span>
              </h2>
              <h4 class="mb-0">
                {{ main.usdtRound(props.bot.config.maxInvestment / props.bot.config.maxPositions) }}
                <span
                  v-if="bot.config.reuseProfit && bot.usdtBoost"
                  class="text-purchase"
                >+ {{ main.usdtRound(bot.usdtBoost) }}</span> {{ main.exchangeAsset }}
              </h4>
            </v-col>
            <v-col
              v-if="!props.compact"
              cols="12"
              class="mb-4"
              align="center"
            >
              <h2
                class="d-flex justify-center"
                :class="bot.config.simulation ? 'text-simulation font-weight-light' : 'text-primary'"
              >
                <div>{{ main.usdtRound(bot.totalProfit) }} {{ main.exchangeAsset }}</div>
                <template v-if="bot.totalProfitCrypto">
                  <v-spacer />
                  <div :class="bot.config.simulation ? 'text-simulation font-weight-light' : 'text-primary'">
                    <v-tooltip
                      location="bottom"
                      class="text-body-2"
                    >
                      {{ main.usdtRound(bot.totalProfitCrypto * bot.currentPrice) }} {{ main.exchangeAsset }}
                      <template #activator="{ props: pps2 }">
                        <span v-bind="pps2">
                          {{ main.jsRound(bot.totalProfitCrypto) }}&nbsp;{{ bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '') }}
                        </span>
                      </template>
                    </v-tooltip>
                  </div>
                </template>
              </h2>
            </v-col>
            <v-col
              cols="12"
              :class="props.compact ? 'pt-4' : ''"
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
            <v-col
              v-if="!props.compact"
              cols="12"
              align="center"
            >
              <div
                v-if="bot.config.minWorkingPrice || bot.config.maxWorkingPrice"
                class="d-flex text-body-1 mx-2"
              >
                <span class="font-weight-bold text-purchase">{{ bot.config.minWorkingPrice || $t('common.anyPrice') }}</span>
                <v-spacer />
                <span class="font-weight-bold text-purchase">{{ bot.config.maxWorkingPrice || $t('common.anyPrice') }}</span>
              </div>
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
import botService from '@services/bot.service'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useMainStore } from '@/store'
import BotDropProfileTable from '@components/BotDropProfileTable.vue'
import BotPositionSlider from '@components/BotPositionSlider.vue'
import BotActions from '@components/BotActions.vue'
import BotTradingActions from '@components/BotTradingActions.vue'

const router = useRouter()
const { mdAndUp } = useDisplay()
const main = useMainStore()

const showConfirmNegativeSellingDialog = ref(false)
const isBusy = ref(false)
const showChart = ref(false)
const botTradingActionsRef = ref()

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
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

const currentDropThreshold = computed(() => {
  // Support both legacy single threshold and new threshold array
  if (
    props.bot.config.priceDropThresholds &&
    Array.isArray(props.bot.config.priceDropThresholds)
    && props.bot.config.priceDropThresholds.length > 0
  ) {
    const index = Math.min(
      props.bot.currentThresholdIndex || 0,
      props.bot.config.priceDropThresholds.length - 1
    )
    return props.bot.config.priceDropThresholds[index]
  }
  // Legacy: use single priceDropThreshold
  return props.bot.config.priceDropThreshold
})

const botNews = (symbol) => {
  const pattern = `\\b${symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}\\b`
  const regex = new RegExp(pattern, 'g')
  return main.news.filter(n => regex.test(n.annTitle)).length
}

const goToNews = (symbol) => {
  router.push(`/news?search=${symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}&caseSensitive=true&entireWord=true`)
}

const checkSelling = () => {
  if (nextSellingTransaction.value.profit < 0) {
    showConfirmNegativeSellingDialog.value = true
  } else {
    sellNow()
  }
}

const sellNow = async () => {
  if (!nextSellingTransaction.value) return
  isBusy.value = true
  try {
    await botService.sellNow(props.bot._id, nextSellingTransaction.value._id)
  } catch (err) {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || 'Sell failed' } })
  } finally {
    isBusy.value = false
  }
}

const buyNow = async (usd = null) => {
  isBusy.value = true
  try {
    await botService.buyNow(props.bot._id, usd)
  } catch (err) {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || 'Buy failed' } })
  } finally {
    isBusy.value = false
  }
}
</script>

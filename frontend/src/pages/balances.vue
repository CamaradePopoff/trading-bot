<template>
  <PageHeader
    :title="$t('menus.balances')"
    :loading="isLoading"
  >
    <span class="mt-2 mr-4">
      {{ $t('pages.balances.totalValue') }} {{ totalValue }} {{ main.exchangeAsset }}
    </span>
  </PageHeader>

  <v-container
    class="my-0 pa-0 pt-4 justify-center"
  >
    <v-row
      justify="center"
      class="mx-4"
    >
      <v-col
        v-for="bal in balances.filter((b) => b.currency !== main.exchangeAsset)"
        :key="bal.id"
        cols="12"
        md="3"
      >
        <v-card
          :width="mdAndUp ? '' : 'calc(100% - 4px)'"
        >
          <v-toolbar
            density="compact"
            class="px-4"
          >
            {{ bal.currency }}
            <v-spacer />
            <div
              class="clickable"
              @click="goToTrading(bal.currency)"
            >
              <v-icon
                v-if="currentPrices[bal.currency] !== undefined"
                icon="mdi-chart-waterfall"
                class="mr-1"
                :color="failedPriceFetchSymbols.has(buildSymbol(bal.currency)) ? 'error' : undefined"
              />
              {{ currentPrices[bal.currency] }}
            </div>
            <v-spacer />
            <div
              v-if="botsByCurrency(bal.currency)"
              class="d-flex text-primary"
            >
              <v-icon class="mr-2">
                mdi-robot
              </v-icon>
              {{ botsByCurrency(bal.currency) }}
            </div>
            <div
              v-if="botsByCurrency(bal.currency, true)"
              class="d-flex ml-2 text-warning"
            >
              <v-icon class="mr-2">
                mdi-robot
              </v-icon>
              {{ botsByCurrency(bal.currency, true) }}
            </div>
          </v-toolbar>
          <v-card-text>
            <div class="d-flex text-body-1 mb-2">
              <div>{{ $t('pages.balances.avaiable') }} {{ bal.available }}</div>
              <v-spacer />
              <div
                v-if="currentPrices[bal.currency]" 
                class="text-grey"
              >
                {{ main.usdtRound(currentPrices[bal.currency] * bal.available) }} {{ main.exchangeAsset }}
              </div>
            </div>
            <div class="d-flex mt-4 justify-center">
              <v-btn
                size="small"
                :disabled="!history[bal.currency]?.length"
                variant="outlined"
                color="primary"
                @click="selectedCurrency = bal.currency; showHistoryDialog = true"
              >
                {{ $t('buttons.transaction', { count: history[bal.currency]?.length }) }}
              </v-btn>
              <v-tooltip
                location="bottom"
                content-class="text-caption"
              >
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    size="x-large"
                    class="ml-2"
                    :color="failedPriceFetchSymbols.has(buildSymbol(bal.currency)) ? 'error' : 'primary'"
                    v-bind="tooltipProps"
                    @click="selectedCurrency = bal.currency; showCryptoDialog = !failedPriceFetchSymbols.has(buildSymbol(bal.currency))"
                  >
                    mdi-plus-circle-outline
                  </v-icon>
                </template>
                {{ $t('buttons.add') }}
              </v-tooltip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog
    v-model="showHistoryDialog"
    max-width="800"
  >
    <v-card>
      <v-card-title class="d-felx text-h5 grey lighten-2">
        {{ selectedCurrency }} {{ $t('common.transactions') }} ({{ history[selectedCurrency].length }})
        <v-spacer />
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-icon
              color="error"
              class="mt-1"
              v-bind="tooltipProps"
              @click="showHistoryDialog = false"
            >
              mdi-close-box-outline
            </v-icon>
          </template>
          {{ $t('buttons.close') }}
        </v-tooltip>
      </v-card-title>

      <v-card-text class="mb-0">
        <div style="max-height: calc(100dvh - 210px); overflow-y: auto;">
          <v-table>
            <thead>
              <tr>
                <th class="text-left">
                  {{ $t('common.date') }}
                </th>
                <th class="text-left">
                  {{ $t('common.amount') }}
                </th>
                <th class="text-left">
                  {{ $t('common.price') }}
                </th>
                <th class="text-left">
                  {{ $t('common.fee') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="transaction in history[selectedCurrency]"
                :key="transaction._id"
              >
                <td>
                  {{ main.formatDate($t, transaction.createdAt) }}
                </td>
                <td>
                  {{ main.jsRound(transaction.amount) }}
                </td>
                <td>
                  {{ main.jsRound( transaction.price) }}
                </td>
                <td>
                  {{ main.jsRound(transaction.fee) }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
      <v-card-actions class="justify-center mt-0 mb-2">
        <v-btn
          color="primary"
          variant="outlined"
          @click="showHistoryDialog = false"
        >
          {{ $t('buttons.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="showCryptoDialog"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex text-h5 grey lighten-2">
        {{ selectedCurrency }} {{ $t('common.transactions') }}
        <v-spacer />
        <v-icon
          color="error"
          class="mt-1"
          @click="showCryptoDialog = false"
        >
          mdi-close-box-outline
        </v-icon>
      </v-card-title>

      <v-card-text
        v-if="transactions[selectedCurrency] && pairs.length > 0"
        class="mb-0"
      >
        <div class="d-flex text-body-1 mb-2">
          <div>{{ $t('pages.balances.avaiable') }} {{ balances.find((b) => b.currency === selectedCurrency).available }}</div>
          <v-spacer />
          <div
            v-if="currentPrices[balances.find((b) => b.currency === selectedCurrency).currency]" 
            class="text-grey"
          >
            {{ main.usdtRound(currentPrices[balances.find((b) => b.currency === selectedCurrency).currency] * balances.find((b) => b.currency === selectedCurrency).available) }} {{ main.exchangeAsset }}
          </div>
        </div>

        <div class="d-flex mb-4">
          <div>{{ $t('pages.balances.minBuy') }}  {{ minBuy(selectedCurrency) }}</div>
          <v-spacer />
          <div>{{ $t('pages.balances.increment') }} {{ increment(selectedCurrency) }}</div>
        </div>

        <div>{{ $t('pages.balances.buy') }}</div>
        <!-- Buy a specific crypto amount -->
        <div
          class="d-flex my-2"
        >
          <v-text-field
            v-model="transactions[selectedCurrency].buy"
            outlined
            density="compact"
            class="mr-2"
            hide-details
            type="number"
            :min="minBuy(selectedCurrency)"
            :step="increment(selectedCurrency)"
          >
            <template #prepend-inner>
              <v-chip>{{ selectedCurrency }}</v-chip>
            </template>
            <template #append-inner>
              <v-btn
                size="x-small"
                variant="outlined"
                @click="setMaxBuy(selectedCurrency)"
              >
                {{ $t('buttons.all') }}
              </v-btn>
              <div
                v-if="transactions[selectedCurrency].buy"
                class="ml-2 text-grey text-body-2"
                :class="transactions[selectedCurrency].buy * currentPrices[selectedCurrency] > main.usdBalance ? 'text-simulation' : ''"
              >
                {{ main.usdtRound(transactions[selectedCurrency].buy * currentPrices[selectedCurrency]) }}&nbsp;{{ main.exchangeAsset }}
              </div>
            </template>
          </v-text-field>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                variant="outlined"
                size="small"
                color="purchase"
                width="60"
                class="mt-1"
                :disabled="!transactions[selectedCurrency].buy || transactions[selectedCurrency].buy * currentPrices[selectedCurrency] > main.usdBalance"
                v-bind="tooltipProps"
                @click="buy(selectedCurrency)"
              >
                <v-icon size="large">
                  mdi-account-outline
                </v-icon>
                <v-icon size="large">
                  mdi-arrow-left-bold
                </v-icon>
                <v-icon size="large">
                  mdi-currency-usd
                </v-icon>
              </v-btn>
            </template>
            {{ $t('buttons.buy') }}
          </v-tooltip>
        </div>
        <!-- Buy for a specific USDx amount -->
        <div
          class="d-flex mt-2 mb-6"
        >
          <v-text-field
            v-model="transactions[selectedCurrency].buyForUsdt"
            outlined
            density="compact"
            class="mr-2"
            hide-details
            type="number"
            :min="minBuy(selectedCurrency) * currentPrices[selectedCurrency]"
            :step="increment(selectedCurrency) * currentPrices[selectedCurrency]"
          >
            <template #prepend-inner>
              <v-chip>{{ main.exchangeAsset }}</v-chip>
            </template>
            <template #append-inner>
              <v-btn
                size="x-small"
                variant="outlined"
                @click="transactions[selectedCurrency].buyForUsdt = main.usdBalance"
              >
                {{ $t('buttons.all') }}
              </v-btn>
              <div
                v-if="transactions[selectedCurrency].buyForUsdt"
                class="ml-2 text-grey text-body-2"
                :class="transactions[selectedCurrency].buyForUsdt > main.usdBalance ? 'text-warning' : ''"
              >
                {{ main.jsRound(transactions[selectedCurrency].buyForUsdt / currentPrices[selectedCurrency]) }}&nbsp;{{ selectedCurrency }}
              </div>
            </template>
          </v-text-field>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                variant="outlined"
                size="small"
                color="purchase"
                width="60"
                class="mt-1"
                :disabled="!transactions[selectedCurrency].buyForUsdt || transactions[selectedCurrency].buyForUsdt > main.usdBalance"
                v-bind="tooltipProps"
                @click="buyForUsdt(selectedCurrency)"
              >
                <v-icon size="large">
                  mdi-account-outline
                </v-icon>
                <v-icon size="large">
                  mdi-arrow-left-bold
                </v-icon>
                <v-icon size="large">
                  mdi-currency-usd
                </v-icon>
              </v-btn>
            </template>
            {{ $t('buttons.buy') }}
          </v-tooltip>
        </div>

        <div>{{ $t('pages.balances.sell') }}</div>
        <!-- Sell a specific crypto amount -->
        <div
          class="d-flex my-2"
        >
          <v-text-field
            v-model="transactions[selectedCurrency].sell"
            outlined
            density="compact"
            class="mr-2"
            hide-details
            type="number"
            min="0"
            :step="increment(selectedCurrency)"
          >
            <template #prepend-inner>
              <v-chip>{{ selectedCurrency }}</v-chip>
            </template>
            <template #append-inner>
              <v-btn
                size="x-small"
                variant="outlined"
                @click="transactions[selectedCurrency].sell = balances.find((b) => b.currency === selectedCurrency).available"
              >
                {{ $t('buttons.all') }}
              </v-btn>
              <div
                v-if="transactions[selectedCurrency].sell"
                class="ml-2 text-grey text-body-2"
                :class="transactions[selectedCurrency].sell > balances.find((b) => b.currency === selectedCurrency).available ? 'text-warning' : ''"
              >
                {{ main.usdtRound(transactions[selectedCurrency].sell * currentPrices[selectedCurrency]) }}&nbsp;{{ main.exchangeAsset }}
              </div>
            </template>
          </v-text-field>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                variant="outlined"
                size="small"
                color="selling"
                width="60"
                class="mt-1"
                :disabled="!transactions[selectedCurrency].sell || transactions[selectedCurrency].sell > balances.find((b) => b.currency === selectedCurrency).available"
                v-bind="tooltipProps"
                @click="sell(selectedCurrency)"
              >
                <v-icon size="large">
                  mdi-account-outline
                </v-icon>
                <v-icon size="large">
                  mdi-arrow-right-bold
                </v-icon>
                <v-icon size="large">
                  mdi-currency-usd
                </v-icon>
              </v-btn>
            </template>
            {{ $t('buttons.sell') }}
          </v-tooltip>
        </div>
        <!-- Sell for a specific USDx amount -->
        <div
          class="d-flex my-2"
        >
          <v-text-field
            v-model="transactions[selectedCurrency].sellForUsdt"
            outlined
            density="compact"
            class="mr-2"
            hide-details
            type="number"
            min="0"
            :step="increment(selectedCurrency) * currentPrices[selectedCurrency]"
          >
            <template #prepend-inner>
              <v-chip>{{ main.exchangeAsset }}</v-chip>
            </template>
            <template #append-inner>
              <v-btn
                size="x-small"
                variant="outlined"
                @click="transactions[selectedCurrency].sellForUsdt = balances.find((b) => b.currency === selectedCurrency).available * currentPrices[selectedCurrency]"
              >
                {{ $t('buttons.all') }}
              </v-btn>
              <div
                v-if="transactions[selectedCurrency].sellForUsdt"
                class="ml-2 text-grey text-body-2"
                :class="transactions[selectedCurrency].sellForUsdt > currentPrices[selectedCurrency] * balances.find((b) => b.currency === selectedCurrency).available ? 'text-warning' : ''"
              >
                {{ main.jsRound(transactions[selectedCurrency].sellForUsdt / currentPrices[selectedCurrency]) }}&nbsp;{{ selectedCurrency }}
              </div>
            </template>
          </v-text-field>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                variant="outlined"
                size="small"
                color="selling"
                width="60"
                class="mt-1"
                :disabled="!transactions[selectedCurrency].sellForUsdt || transactions[selectedCurrency].sellForUsdt / currentPrices[selectedCurrency] > balances.find((b) => b.currency === selectedCurrency).available"
                v-bind="tooltipProps"
                @click="sellForUsdt(selectedCurrency)"
              >
                <v-icon size="large">
                  mdi-account-outline
                </v-icon>
                <v-icon size="large">
                  mdi-arrow-right-bold
                </v-icon>
                <v-icon size="large">
                  mdi-currency-usd
                </v-icon>
              </v-btn>
            </template>
            {{ $t('buttons.sell') }}
          </v-tooltip>
        </div>
      </v-card-text>
      <v-card-text
        v-else
        class="text-center py-8"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
        <div class="mt-4">
          {{ $t('common.loading') }}
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import currencyService from '@/services/currency.service'
import transactionService from '@/services/transaction.service'

const main = useMainStore()
const router = useRouter()
const { mdAndUp } = useDisplay()

const isLoading = ref(false)
const transactions = ref({})
const history = ref({})
const currentPrices = ref({})
const pairs = ref([])
const interval = ref()
const showHistoryDialog = ref(false)
const showCryptoDialog = ref(false)
const selectedCurrency = ref(null)
const failedPriceFetchSymbols = ref(new Set())

const loadPageData = async () => {
  isLoading.value = true
  failedPriceFetchSymbols.value = new Set()
  currentPrices.value = {}
  history.value = {}
  transactions.value = {}

  return currencyService.getTradingPairs().then((data) => {
    pairs.value = data
    return getCurrencyData()
  }).finally(() => {
    isLoading.value = false
  })
}

onMounted(() => {
  loadPageData()
  interval.value = setInterval(getCurrencyData, 5 * 1000)
})

watch(
  () => main.exchange,
  async (newExchange, oldExchange) => {
    if (!newExchange || newExchange === oldExchange || !oldExchange) return
    await loadPageData()
  }
)

onUnmounted(() => {
  clearInterval(interval.value)
})

const buildSymbol = (currency) => {
  // For exchanges without token pairs (like Kraken with null tokenPair),
  // use empty separator and trading asset
  const separator = main.exchangeTokenPair && main.exchangeTokenPair.includes('-') ? '-' : ''
  return `${currency}${separator}${main.exchangeAsset}`
}

const getCurrencyData = () => {
  return main.getBalances().then((data) => {
    // Collect all symbols that need price updates and transaction history
    const symbolsToFetch = []
    
    data.forEach((bal) => {
      if (!transactions.value[bal.currency]) transactions.value[bal.currency] = {
        buy: 0,
        sell: 0,
        buyForUsdt: 0,
        sellForUsdt: 0
      }
      if (bal.currency === main.exchangeAsset) return
      const symbol = buildSymbol(bal.currency)
      // Skip symbols that have failed before
      if (!failedPriceFetchSymbols.value.has(symbol)) {
        symbolsToFetch.push(symbol)
      }
    })
    
    // Fetch all prices in a single batch request
    if (symbolsToFetch.length > 0) {
      currencyService.getBatchPrices(symbolsToFetch).then((pricesMap) => {
        // Track which symbols were missing from the response
        symbolsToFetch.forEach((symbol) => {
          const s = symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')
          if (pricesMap[s] === null) {
            console.warn('Price fetch failed for symbol:', symbol, ', not asking again.')
            failedPriceFetchSymbols.value.add(symbol)
          }
        })
        // Response keys are currencies without exchange asset suffix, values are direct prices
        Object.keys(pricesMap).forEach((currency) => {
          currentPrices.value[currency] = pricesMap[currency]
        })
        // console.log(currentPrices.value)
      })
      
      // Fetch all transaction histories in a single batch request
      transactionService.getBatchManualTransactions(symbolsToFetch).then((historyMap) => {
        // Keys already have exchange asset stripped by backend
        Object.keys(historyMap).forEach((currency) => {
          history.value[currency] = historyMap[currency]
        })
      })
    }
  })
}

const balances = computed(() => (main.balances || [])
  .sort((a, b) => a.currency.localeCompare(b.currency)))

const minBuy = computed(() => {
  return (currency) => {
    if (!pairs.value.length) return 0
    const pair = pairs.value.find((p) => p.symbol === buildSymbol(currency))
    return pair?.baseMinSize || 0
  }
})

const increment = computed(() => {
  return (currency) => {
    if (!pairs.value.length) return 0
    const pair = pairs.value.find((p) => p.symbol === buildSymbol(currency))
    return pair?.baseIncrement || 0
  }
})

const botsByCurrency = computed(() => {
  return (currency, isSimulation = false) => {
    const bts = main.bots.filter((bot) => bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '') === currency && bot.config.simulation === isSimulation)
    return bts.length
  }
})

const totalValue = computed(() => {
  return main.usdtRound(
    balances.value
      .filter((b) => b.currency !== main.exchangeAsset)
      .reduce((sum, bal) => {
        const price = currentPrices.value[bal.currency] || 0
        return sum + (price * bal.available)
      }, 0)
  )
})

const goToTrading = (currency) => {
  router.push(`/trading?pair=${currency}-${main.exchangeAsset}`)
}

const setMaxBuy = (currency) => {
  const inc = increment.value(currency)
  const factor = 1 / inc
  transactions.value[currency].buy = Math.floor(factor * main.usdBalance / currentPrices.value[currency]) / factor
}

const buy = (currency) => {
  const amount = transactions.value[currency].buy
  currencyService.buyCrypto(buildSymbol(currency), amount).then(() => {
    main.getBalances()
  })
}

const buyForUsdt = (currency) => {
  const inc = increment.value(currency)
  const factor = 1 / inc
  const amount = Math.floor(factor * transactions.value[currency].buyForUsdt / currentPrices.value[currency]) / factor
  currencyService.buyCrypto(buildSymbol(currency), amount).then(() => {
    main.getBalances()
  })
}

const sell = (currency) => {
  const amount = transactions.value[currency].sell
  currencyService.sellCrypto(buildSymbol(currency), amount).then(() => {
    main.getBalances()
  })
}

const sellForUsdt = (currency) => {
  const inc = increment.value(currency)
  const factor = 1 / inc
  const amount = Math.floor(factor * transactions.value[currency].sellForUsdt / currentPrices.value[currency]) / factor
  currencyService.sellCrypto(buildSymbol(currency), amount).then(() => {
    main.getBalances()
  })
}
</script>

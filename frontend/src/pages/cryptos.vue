<template>
  <PageHeader
    :title="$t('menus.cryptos')"
    :loading="isLoading"
  >
    <v-switch
      v-model="profitsSimul"
      :label="$t('common.simulated')"
      hide-details
      class="mr-4"
      color="primary"
      @update:model-value="selectedDate = null"
    />
  </PageHeader>

  <v-container
    fluid
    class="my-0 pa-0 px-4"
  >
    <v-row
      class="ml-4 mr-2"
      justify="center"
    >
      <v-card
        width="100%"
        color="transparent"
        class="mt-0"
      >
        <v-tabs
          v-model="tab"
        >
          <v-tab
            v-for="crypto in sortedCryptoKeys"
            :key="crypto"
          >
            {{ crypto.replace(/([^-]+)-?USD(T|C)$/,'$1') }}
            <span class="text-grey pl-2">
              {{ ['TOTAL', main.exchangeAsset].includes(crypto) ? main.usdtRound(sumByCrypto[crypto]) : main.jsRound(sumByCrypto[crypto]) }}
              <span v-if="!['TOTAL', main.exchangeAsset].includes(crypto) && currentPrices[crypto]">({{ main.usdtRound(sumByCrypto[crypto] * currentPrices[crypto]) }} {{ main.exchangeAsset }})</span>
              <span v-if="crypto === 'TOTAL'">{{ main.exchangeAsset }}</span>
            </span>
            <v-tooltip
              v-if="crypto !== 'TOTAL'"
              location="bottom"
              content-class="text-caption"
            >
              <template #activator="{ props: tooltipProps }">
                <v-icon
                  class="clickable ml-2"
                  :color="profitsSimul ? 'simulation' : 'error'"
                  v-bind="tooltipProps"
                  @click.stop="candidateCrypto = crypto; showDeleteHistoryDialog = true"
                >
                  mdi-delete-forever
                </v-icon>
              </template>
              {{ $t('pages.cryptos.deleteProfitHistory') }}
            </v-tooltip>
          </v-tab>
        </v-tabs>

        <v-card-text class="px-0 mt-2">
          <v-tabs-window v-model="tab">
            <v-tabs-window-item 
              v-for="crypto in sortedCryptoKeys"
              :key="crypto"
            >
              <v-container
                fluid
                class="pa-0"
              >
                <v-row>
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <div
                      style="height: calc(100dvh - 260px); overflow-y: auto; overflow-x: hidden;"
                    >
                      <v-table v-if="profitsByCrypto[crypto]">
                        <thead>
                          <tr>
                            <th class="text-left">
                              {{ $t('common.date') }}
                            </th>
                            <th class="text-left">
                              {{ $t('common.transactions') }}
                            </th>
                            <th
                              v-if="!(['TOTAL', main.exchangeAsset].includes(crypto))"
                              class="text-left"
                            >
                              {{ $t('common.profit') }}
                            </th>
                            <th
                              class="text-left"
                            >
                              {{ main.exchangeAsset }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="date in Object.keys(profitsByCrypto[crypto])"
                            :key="date"
                            class="clickable"
                            :class="date === selectedDate ? 'bg-blue-grey-darken-4 text-white' : ''"
                            @click="selectedDate = date"
                          >
                            <td>{{ main.formatDate(t, date, true) }}</td>
                            <td>{{ profitsByCrypto[crypto][date].transactions.length }}</td>
                            <td v-if="!(['TOTAL', main.exchangeAsset].includes(crypto))">
                              {{ main.jsRound(profitsByCrypto[crypto][date].totalAmount) }}
                            </td>
                            <td>
                              {{ main.usdtRound(profitsByCrypto[crypto][date].usd) }}
                            </td>
                          </tr>
                        </tbody>
                      </v-table>  
                    </div>
                  </v-col>
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <div
                      style="height: calc(100dvh - 260px); width:100%; overflow-y: auto; overflow-x: hidden;"
                    >
                      <v-table v-if="selectedDate && profitsByCrypto[crypto][selectedDate]">
                        <thead>
                          <tr>
                            <th class="text-left">
                              {{ $t('common.date') }}
                            </th>
                            <th
                              v-if="crypto !== main.exchangeAsset"
                              class="text-left"
                            >
                              {{ $t('common.profit') }}
                            </th>
                            <th class="text-left">
                              {{ main.exchangeAsset }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="tr in profitsByCrypto[crypto][selectedDate].transactions"
                            :key="tr._id"
                          >
                            <td> {{ main.formatDate($t, tr.date) }}</td>
                            <td v-if="crypto !== main.exchangeAsset">
                              {{ main.jsRound(tr.amount) }}
                              <span v-if="crypto === 'TOTAL'">{{ tr.symbol === main.exchangeAsset ? tr.symbol : tr.symbol.replace(/-?USD(T|C)$/,'') }}</span>
                            </td>
                            <td>
                              {{ main.usdtRound(tr.amount * (tr.symbol === main.exchangeAsset ? 1 : currentPrices[tr.symbol.replace(/-?USD(T|C)$/,'')])) }}
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                      <div
                        v-else
                        class="d-flex mx-4 justify-center"
                        style="margin-top: 27%"
                      >
                        {{ $t('common.noDate') }}
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-container>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>  
      </v-card>
    </v-row>
  </v-container>

  <ConfirmationPopup
    v-if="showDeleteHistoryDialog"
    @cancel="showDeleteHistoryDialog = false; candidateCrypto = null"
    @confirm="deleteHistory(candidateCrypto)"
  >
    <div>{{ $t('pages.cryptos.deleteHistoryTitle', { crypto: candidateCrypto }) }}</div>
    <div>{{ $t('common.areYouSure') }}</div>
  </ConfirmationPopup>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import currencyService from '@services/currency.service'
import { useMainStore } from '@/store'
import { useI18n } from 'vue-i18n'
import transactionService from '@/services/transaction.service'

const { t } = useI18n()
const main = useMainStore()

const isLoading = ref(false)
const tab = ref(0)
const selectedDate = ref()
const currentPrices = ref({})
const profitsSimul = ref(false)
const candidateCrypto = ref()
const showDeleteHistoryDialog = ref(false)
const failedPriceFetchSymbols = ref(new Set())

onMounted(() => {
  isLoading.value = true
  main.getCryptoProfits().finally(() => {
    isLoading.value = false
  })
})

const profitsByCrypto = computed(() => {
  if (!main.cryptoProfits) return {}
  return main.cryptoProfits.profitsByCrypto[profitsSimul.value ? 'simulation' : 'real']
})

const sumByCrypto = computed(() => {
  if (!main.cryptoProfits) return { TOTAL: 0 }
  return main.cryptoProfits.sumsByCrypto[profitsSimul.value ? 'simulation' : 'real']
})

const getCurrentPrices = () => {
  if (!main.cryptoProfits) return
  const symbols = Object.keys(sumByCrypto.value)
    .filter(s => s !== 'TOTAL' && !failedPriceFetchSymbols.value.has(s))
  // console.log('Fetching prices for symbols:', symbols)
  
  if (symbols.length === 0) return
  
  // Fetch all prices in a single batch request
  currencyService.getBatchPrices(symbols).then((pricesMap) => {
    // Track which symbols were missing from the response
    symbols.forEach((symbol) => {
      const s = symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')
      if (pricesMap[s] === null) {
        console.warn('Price fetch failed for symbol:', symbol, ', not asking again.')
        failedPriceFetchSymbols.value.add(symbol)
      }
    })
    // console.log('Fetched batch prices:', pricesMap)
    Object.keys(pricesMap).forEach((symbol) => {
      currentPrices.value[symbol] = pricesMap[symbol]
    })
  })
}

// Watch sumByCrypto and fetch prices when it changes
watch(() => sumByCrypto.value, (newSumByCrypto) => {
  if (Object.keys(newSumByCrypto).length > 0) {
    getCurrentPrices()
  }
}, { immediate: true })

const sortedCryptoKeys = computed(() => {
  return Object.keys(sumByCrypto.value).sort((a, b) => {
    if (a === 'TOTAL') return -1
    if (b === 'TOTAL') return 1
    if (a === main.exchangeAsset) return -1
    if (b === main.exchangeAsset) return 1
    const aValue = sumByCrypto.value[a] * currentPrices.value[a]
    const bValue = sumByCrypto.value[b] * currentPrices.value[b]
    if (aValue === bValue) return 0
    return aValue > bValue ? -1 : 1
  })
})

const deleteHistory = (symbol) => {
  transactionService.deleteCryptoProfitHistory(symbol, profitsSimul.value).then(() => {
    showDeleteHistoryDialog.value = false
    candidateCrypto.value = null
    main.getCryptoProfits()
  })
} 
</script>

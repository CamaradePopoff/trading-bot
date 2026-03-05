<template>
  <PageHeader
    :title="$t('menus.trading')"
    :loading="isLoading"
  >
    <div style="width:200px">
      <v-autocomplete
        :model-value="main.selectedTradingPair"
        :label="$t('common.pair')"
        density="compact"
        variant="outlined"
        class="mr-2"
        :items="pairs"
        @update:model-value="goToPair"
      />
    </div>
  </PageHeader>

  <div
    class="d-flex justify-center mx-5"
    style="height:calc(100% - 64px - 32px);"
  >
    <TradingView
      v-if="main.selectedTradingPair"
      :key="main.selectedTradingPair + main.lang"
      :pair="main.selectedTradingPair"
      :lang="main.lang"
      show-date-ranges
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '@/store'
import currencyService from '@services/currency.service'

const isLoading = ref(false)
const main = useMainStore()
const route = useRoute()
const router = useRouter()

const pairs = ref([])

const goToPair = (pair) => {
  main.selectedTradingPair = pair
  router.push({ path: '/trading', query: { pair } })
}

const getPreferredPair = () => {
  const requestedPair = route.query?.pair
  if (requestedPair && pairs.value.includes(requestedPair)) return requestedPair
  if (main.selectedTradingPair && pairs.value.includes(main.selectedTradingPair)) return main.selectedTradingPair
  return btcPair.value
}

const loadPairs = async () => {
  isLoading.value = true
  try {
    const data = await currencyService.getTradingPairs()
    pairs.value = data.map((p) => p.symbol)
    const pairToSelect = getPreferredPair()
    if (pairToSelect) goToPair(pairToSelect)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadPairs()
})

watch(
  () => main.exchange,
  async (newExchange, oldExchange) => {
    if (!newExchange || newExchange === oldExchange || !oldExchange) return
    await loadPairs()
  }
)

const btcPair = computed(() => {
  const exchange = main.exchangeByName(main.exchange)
  const tokenPair = exchange?.tokenPair
  const tokenAsset = exchange?.tokenAsset
  if (!tokenPair || !tokenAsset) return pairs.value[0]

  const desiredBtcPair = tokenPair.replace(tokenAsset, 'BTC')
  return pairs.value.find((p) => p === desiredBtcPair) || pairs.value[0]
})
</script>

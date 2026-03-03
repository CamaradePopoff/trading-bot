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
import { ref, onMounted, computed } from 'vue'
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

onMounted(async () => {
  isLoading.value = true
  currencyService.getTradingPairs().then((data) => {
    pairs.value = data.map((p) => p.symbol)
    goToPair(route.query?.pair || main.selectedTradingPair || btcPair.value)
  }).finally(() => {
    isLoading.value = false
  })
})

const btcPair = computed(() => {
  const exchange = main.exchangeByName(main.exchange)
  const tokenPair = exchange?.tokenPair
  const tokenAsset = exchange?.tokenAsset
  if (!tokenPair || !tokenAsset) return pairs.value[0]

  const desiredBtcPair = tokenPair.replace(tokenAsset, 'BTC')
  return pairs.value.find((p) => p === desiredBtcPair) || pairs.value[0]
})
</script>

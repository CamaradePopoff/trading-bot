<template>
  <PageHeader
    :title="$t('menus.favorites')"
    :loading="isLoading"
  />
  
  <v-container
    fluid
    class="mt-4 mb-0 pa-0 pl-1"
    style="height: calc(100dvh - 64px - 110px);"
  >
    <v-row
      class="mx-4"
      dense
      style="height: 100%;"
    >
      <!-- Left column: Filters (1/3) -->
      <v-col
        cols="12"
        md="4"
        style="position: sticky; top: 0; align-self: flex-start;"
      >
        <v-card class="mb-4">
          <v-card-text>
            <v-row>
              <v-col
                v-if="!main.isVipFeeExchange"
                cols="12"
              >
                <v-btn-toggle
                  v-model="classToggle"
                  density="compact"
                  multiple
                >
                  <v-btn>A</v-btn>
                  <v-btn>B</v-btn>
                  <v-btn>C</v-btn>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <v-autocomplete
                  v-model="favorites"
                  :items="filteredPairs"
                  chips
                  closable-chips
                  density="compact"
                  multiple
                  @update:model-value="saveFavorites"
                >
                  <template #chip="{ props:pps, item, index }">
                    <v-chip
                      v-bind="pps"
                    >
                      {{ item.value }} <div
                        v-if="!['MEXC', 'Binance'].includes(main.exchange)"
                        style="border-radius: 6px; width: 18px; text-align: center"
                        class="ml-1 bg-grey-darken-3 px-1"
                      >
                        {{ favoriteClasses[index] }}
                      </div>
                    </v-chip>
                  </template>
                </v-autocomplete>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right column: Charts (2/3) -->
      <v-col
        cols="12"
        md="8"
        style="height: 100%; overflow-y: auto;"
      >
        <v-row dense>
          <v-col
            v-for="(pair, index) in favorites"
            :key="pair"
            cols="12"
            md="6"
          >
            <v-card>
              <v-card-title class="ma-0 py-0">
                <div class="d-flex">
                  <span class="pr-2">#{{ pairInfo(pair)?.position || '?' }}</span>
                  <span class="text-primary">{{ pair }}</span>
                  <v-chip
                    v-if="!main.isVipFeeExchange && favoriteClasses[index]"
                    size="small"
                    class="ml-2 mt-1"
                  >
                    <span
                      v-if="mdAndUp"
                      class="mr-1"
                    >{{ $t('common.class') }} </span>{{ favoriteClasses[index] }}
                  </v-chip>
                  <v-spacer />
                  <span v-if="mdAndUp">{{ $t('pages.topPairs.volume') }}&nbsp;</span>
                  <span>{{ pairInfo(pair)?.volume || 0 }}M</span>
                </div>
              </v-card-title>
              <v-card-text class="ma-0 pa-0">
                <div style="height: calc((100dvh / 2) - 125px)">
                  <TradingView
                    :key="pair + main.lang"
                    :pair="pair"
                    :lang="main.lang"
                    show-date-ranges
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'
import { ref, computed, onMounted } from 'vue'
import currencyService from '@services/currency.service'
import userService from '@services/user.service'

const isLoading = ref(false)
const main = useMainStore()
const { mdAndUp } = useDisplay()
const pairs = ref([])
const pairClasses = ref([])
const topPairs = ref([])
const favorites = ref([])
const favoriteClasses = ref([])
const classToggle = ref([0])

onMounted(async () => {
  isLoading.value = true
  favorites.value = main.exchanges[main.exchangeByName(main.exchange).name].favorites
  // console.log('Favorites:', favorites.value)
  topPairs.value = (await currencyService.getTopPairs())
    ?.filter(t => t.symbol.endsWith(main.exchangeAsset))
    ?.map((t, i) => ({
      position: i+1,
      symbol: t.symbol,
      volume: Math.round(t.volValue / 1000000 * 10) / 10,
      fee: t.takerFeeRate * t.takerCoefficient
    }))
    // console.log('top', topPairs.value)
    pairs.value = (await currencyService.getTradingPairs()).map((p) => p.symbol).sort()
    // console.log('Pairs:', pairs.value)
  favoriteClasses.value = favorites.value.map((p) => getSymbolClass(p))
  pairClasses.value = pairs.value.map((p) => getSymbolClass(p))
  isLoading.value = false
})

const pairInfo = computed(() => {
  return (pair) => topPairs.value.find((t) => t.symbol === pair)
})

const filteredPairs = computed(() => {
  if (main.isVipFeeExchange) return pairs.value
  const classes = ['A', 'B', 'C']
  return pairs.value.filter((p, i) => classToggle.value.map((v) => classes[v]).includes(pairClasses.value[i]))
})

const getSymbolClass = (symbol) => {
  const fee = topPairs.value.find((t) => t.symbol === symbol)?.fee
  if (!fee) return '?'
  return fee <= 0.001 ? 'A' : fee >= 0.003 ? 'C' : 'B'
}

const saveFavorites = async () => {
  const exchangeName = main.exchangeByName(main.exchange).name
  userService.updateFavorites(exchangeName, favorites.value).then((favs) => {
    main.exchanges[exchangeName].favorites = favs
  })
}
</script>

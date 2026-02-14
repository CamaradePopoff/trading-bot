<template>
  <v-sheet
    v-if="props.vertical"
    rounded
    color="blue-grey-darken-4"
    class="font-weight-bold pa-2 text-body-2"
  >
    <div class="d-flex">
      <span class="text-body-1">{{ $t('components.tradingBalances.title') }}</span>
      <v-spacer />
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            size="small"
            class="ml-2 clickable"
            color="primary"
            v-bind="tooltipProps"
            @click="main.getBalances"
          >
            mdi-refresh-circle
          </v-icon>
        </template>
        {{ $t('buttons.refresh') }}
      </v-tooltip>
    </div>
    <div
      v-for="(bal, index) in balances"
      :key="index"
      class="d-flex bg-blue-grey-darken-3 px-2 py-1 mt-1"
      style="border-radius:4px"
    >
      <span
        :class="bal.currency.toUpperCase() === main.exchangeAsset ? 'text-primary font-weight-bold' : ''"
        class="pr-2"
      >{{ bal.currency }}</span>
      <span :class="bal.currency.toUpperCase() === main.exchangeAsset ? 'text-primary' : 'text-grey'">{{ main.usdtRound(bal.available) }}</span>
      <v-spacer />
      <div
        v-if="!main.exchangeTokenPair.includes('?') && bal.currency.toUpperCase() === main.exchangeToken"
        style="margin-top: -1px"
      >
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              class="ml-2"
              variant="outlined"
              size="x-small"
              v-bind="tooltipProps"
              @click="buyExchangeToken"
            >
              <v-icon size="large">
                mdi-currency-usd
              </v-icon>
            </v-btn>
          </template>
          {{ $t('buttons.buy') }}
        </v-tooltip>
      </div>
    </div>
  </v-sheet>
  <v-chip
    v-else
    size="large"
  >
    <div 
      v-if="balances && balances.length > 0"
      class="d-flex"
      style="max-width: calc(100vw - 700px); overflow: hidden;"
    >
      <template
        v-for="(bal, index) in balances"
        :key="index"
      >
        <v-spacer
          v-if="index > 0"
          class="text-grey-darken-2 mx-2"
        >
          |
        </v-spacer>
        <span
          :class="bal.currency.toUpperCase() === main.exchangeAsset ? 'text-primary font-weight-bold' : ''"
          class="pr-2"
        >{{ bal.currency }}</span>
        <span :class="bal.currency.toUpperCase() === main.exchangeAsset ? 'text-primary' : 'text-grey'">{{ bal.available }}</span>
        <div
          v-if="!main.exchangeTokenPair.includes('?') && bal.currency.toUpperCase() === main.exchangeToken"
          style="margin-top: -1px"
        >
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                class="ml-2"
                variant="outlined"
                size="x-small"
                v-bind="tooltipProps"
                @click="buyExchangeToken"
              >
                <v-icon size="large">
                  mdi-currency-usd
                </v-icon>
              </v-btn>
            </template>
            {{ $t('buttons.buy') }}
          </v-tooltip>
        </div>
      </template>
    </div>
    <span v-else>{{ $t('components.tradingBalances.loading') }}</span>
    <v-tooltip
      location="bottom"
      content-class="text-caption"
    >
      <template #activator="{ props: tooltipProps }">
        <v-icon
          size="large"
          class="ml-2 clickable"
          color="primary"
          v-bind="tooltipProps"
          @click="main.getBalances"
        >
          mdi-refresh-circle
        </v-icon>
      </template>
      {{ $t('buttons.refresh') }}
    </v-tooltip>
  </v-chip>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useMainStore } from '@/store'
import currencyService from '@/services/currency.service'

const main = useMainStore()

const interval = ref()

const props = defineProps({
  filter: {
    type: Array,
    default: () => []
  },
  vertical: {
    type: Boolean,
    default: false
  }
})

onMounted(() => {
    main.getBalances()
    interval.value = setInterval(main.getBalances, 60 * 1000) // every minute
})

onUnmounted(()=>{
  if (interval.value) clearInterval(interval.value)
})

const balances = computed(() => {
  if (!main.balances) return []
  const filtered = props.filter.length === 0 
    ? main.balances 
    : main.balances.filter(bal => props.filter.includes(bal.currency.toUpperCase()))
        .sort((a, b) => props.filter.indexOf(a.currency) - props.filter.indexOf(b.currency))
  
  // Check if exchangeToken is in the filtered list
  const hasExchangeToken = filtered.some(bal => bal.currency.toUpperCase() === main.exchangeToken.toUpperCase())
  
  // If exchangeToken is not in the list, prepend it with 0 balance
  if (!hasExchangeToken && main.exchangeToken) {
    return [{ currency: main.exchangeToken, available: 0 }, ...filtered]
  }
  
  return filtered
})

const buyExchangeToken = () => {
  const minAmount = main.exchanges[main.exchange]?.minOrderAmount
  currencyService.buyCrypto(main.exchangeTokenPair, minAmount).then(() => {
    main.getBalances()
  })
}
</script>

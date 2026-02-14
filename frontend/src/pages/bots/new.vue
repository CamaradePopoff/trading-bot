<template>
  <PageHeader title="New bot" />

  <v-card
    class="mx-auto mt-4"
    max-width="800"
  >
    <v-card-text>
      <BotConfig
        v-model="newBotConfig"
        @valid="isValidConfig = true"
        @invalid="isValidConfig = false"
      />
    </v-card-text>

    <v-card-actions class="justify-center pt-0 pb-2 my-0">
      <v-btn
        variant="outlined"
        color="error"
        @click="cancel"
      >
        {{ $t('buttons.cancel') }}
      </v-btn>
      <v-btn
        :disabled="!isValidConfig"
        variant="outlined"
        color="primary"
        @click="save"
      >
        {{ $t('buttons.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store'
import botService from '@services/bot.service'

const router = useRouter()
const main = useMainStore()

const newBotConfig = ref({
  exchange: main.exchange,
  exchangeAsset: main.exchangeAsset,
  label: null,
  botInterval: 5,
  symbol: null,
  symbolMinSize: 0,
  symbolIncrement: 0,
  fee: 0,
  symbolInterval: 0,
  priceDropThreshold: 1,
  profitMargin: 1,
  maxPositions: 5,
  positionsToRebuy: 1,
  maxInvestment: 100,
  minWorkingPrice: null,
  maxWorkingPrice: null,
  convertProfitToCrypto: false,
  reuseProfitToMaxPositions: null,
  reuseProfit: false,
  simulation: false
})

const isValidConfig = ref(false)

const cancel = () => {
  router.push({ path: '/bots' })
}

const save = () => {
  botService.createBot(newBotConfig.value)
    .then(() => {
      router.push({ path: '/bots' })
    })
    .catch((err) => {
      console.error(err)
    })
}
</script>

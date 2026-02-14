<template>
  <v-toolbar
    density="compact"
    class="pl-2 pr-3"
    :style="transparent ? { height: '32px', minHeight: '32px', 'margin-top': '-19px' } : {}"
    :color="transparent ? 'transparent' : (bot.config.simulation ? 'simulationDark' : 'blue-grey-darken-4')"
  >
    <template v-if="mdAndUp">
      <template v-if="!transparent">
        <img
          v-if="bot.config.exchange"
          style="height: 32px"
          :src="`/${bot.config.exchange.toLowerCase()}.png`"
          alt=""
        >
        <v-icon
          v-else
          color="primary"
        >
          mdi-robot-angry
        </v-icon>
      </template>
      <div
        class="ml-2"
        :class="compact ? 'text-h8' : 'text-h6'"
        style="white-space: nowrap; max-width: 120px; overflow: hidden;"
      >
        <span :class="bot.config.simulation ? 'text-simulation' : ''">{{ bot.config.label || `(${$t('common.noName')})` }}</span>
      </div>
      <v-spacer />
    </template>
    <div class="d-flex">
      <div style="margin-top: 2px">
        <v-icon class="mr-1">
          mdi-update
        </v-icon>
        <span class="mr-1">{{ bot.config.botInterval }}s</span>
      </div>
      <div
        v-if="!bot.hasStarted"
        style="margin-top: 2px"
      >
        <v-icon
          color="error"
          icon="mdi-stop-circle"
          class="ml-1"
        />
      </div>
      <div
        v-if="bot.hasStarted"
        style="margin-top: 2px"
      >
        <v-icon
          v-if="bot.isPaused"
          color="warning"
          icon="mdi-pause-box"
          class="ml-1"
        />
        <v-icon
          v-else
          color="primary"
          icon="mdi-play-box"
          class="ml-1"
        />
        <v-icon
          :color="bot.config.convertProfitToCrypto ? 'primary' : 'error'"
          class="ml-1"
          size="large"
        >
          mdi-currency-btc
        </v-icon>
        <v-icon
          :color="bot.stopBuying ? 'error' : 'primary'"
          class="ml-1"
          size="large"
        >
          {{ bot.stopBuying ? 'mdi-currency-usd-off' : 'mdi-currency-usd' }}
        </v-icon>
        <v-icon
          :color="bot.config.reuseProfit ? 'primary' : 'error'"
          class="ml-1"
          size="large"
        >
          mdi-recycle-variant
        </v-icon>
      </div>
    </div>
  </v-toolbar>
</template>

<script setup>
import { useDisplay } from 'vuetify'

const { mdAndUp } = useDisplay()

defineProps({
  bot: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  transparent: {
    type: Boolean,
    default: false
  }
})
</script>

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
      <div
        v-if="mdAndUp && botNewsCount > 0"
        class="text-blue clickable mr-1"
        style="margin-top: 2px"
        @click.stop="goToNews"
      >
        <v-icon
          size="small"
          icon="mdi-script-text-outline"
        />
        {{ botNewsCount }}
      </div>
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
        />
        <v-tooltip location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              size="x-small"
              variant="outlined"
              color="primary"
              class="mx-1"
              @click.stop="startBot"
            >
              <v-icon size="large">
                mdi-play
              </v-icon>
            </v-btn>
          </template>
          {{ $t('buttons.start') }}
        </v-tooltip>
      </div>
      <div
        v-if="bot.hasStarted"
        style="margin-top: 2px"
      >
        <v-icon
          v-if="bot.isPaused"
          color="warning"
          icon="mdi-pause-box"
        />
        <v-icon
          v-else
          color="primary"
          icon="mdi-play-box"
        />
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-if="bot.isPaused"
              v-bind="tooltipProps"
              size="x-small"
              variant="outlined"
              class="mr-1"
              color="primary"
              @click.stop="resumeBot"
            >
              <v-icon size="large">
                mdi-play
              </v-icon>
            </v-btn>
            <v-btn
              v-else
              v-bind="tooltipProps"
              size="x-small"
              color="warning"
              variant="outlined"
              class="mr-1"
              @click.stop="pauseBot"
            >
              <v-icon size="large">
                mdi-pause
              </v-icon>
            </v-btn>
          </template>
          {{ bot.isPaused ? $t('buttons.resume') : $t('buttons.pause') }}
        </v-tooltip>
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              size="x-small"
              variant="outlined"
              :color="bot.config.convertProfitToCrypto ? 'primary' : 'error'"
              class="mr-1"
              @click.stop="toggleCryptoConvert"
            >
              <v-icon size="large">
                mdi-currency-btc
              </v-icon>
            </v-btn>
          </template>
          {{ $t('components.bot.convertProfitToCrypto') }}
        </v-tooltip>
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              size="x-small"
              variant="outlined"
              :color="bot.stopBuying ? 'error' : 'primary'"
              class="mr-1"
              @click.stop="toggleStopBuying"
            >
              <v-icon size="large">
                {{ bot.stopBuying ? 'mdi-currency-usd-off' : 'mdi-currency-usd' }}
              </v-icon>
            </v-btn>
          </template>
          {{ bot.stopBuying ? $t('components.bot.enableBuying') : $t('components.bot.stopBuying') }}
        </v-tooltip>
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              size="x-small"
              variant="outlined"
              :color="bot.config.reuseProfit ? 'primary' : 'error'"
              class="mr-1"
              @click.stop="toggleProfitReuse"
            >
              <v-icon size="large">
                mdi-recycle-variant
              </v-icon>
            </v-btn>
          </template>
          {{ $t('components.bot.reuseProfit') }}
        </v-tooltip>
      </div>
    </div>
    <v-spacer v-if="!mdAndUp" />
    <div v-if="bot.config.symbol !== `BTC${main.exchangeAsset}`">
      <v-tooltip
        v-if="props.transparent"
        class="pa-0 ma-0"
        interactive
        :open-on-hover="false"
        open-on-click
        location="bottom"
        content-class="pa-0 ma-0 bg-transparent"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            size="x-small" 
            class="ml-0"
            variant="outlined"
            color="primary"
          >
            <v-icon
              icon="mdi-chart-waterfall"
              class="pa-0 ma-0"
              size="large"
            />
          </v-btn>
        </template>
        <div
          :style="{
            margin: '0',
            padding: '0',
            width: '600px',
            height: '400px',
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
      </v-tooltip>
      <v-tooltip
        v-else
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            size="x-small" 
            class="ml-0"
            variant="outlined"
            :color="showChart ? 'primary' : 'error'"
            @click.stop="emit('toggleChart')"
          >
            <v-icon
              icon="mdi-chart-waterfall"
              class="pa-0 ma-0"
              size="large"
            />
          </v-btn>
        </template>
        {{ showChart ? $t('components.bot.hideChart') : $t('components.bot.showChart') }}
      </v-tooltip>
    </div>
  </v-toolbar>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useMainStore } from '@/store'
import botService from '@services/bot.service'

const router = useRouter()
const { mdAndUp } = useDisplay()
const main = useMainStore()

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  showChart: {
    type: Boolean,
    default: false
  },
  transparent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleChart'])

const botNewsCount = computed(() => {
  const pattern = `\\b${props.bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}\\b`
  const flags = 'g'
  const regex = new RegExp(pattern, flags)
  return main.news.filter(n => regex.test(n.annTitle)).length
})

const goToNews = () => {
  router.push(`/news?search=${props.bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}&caseSensitive=true&entireWord=true`)
}

const toggleProfitReuse = () => {
  botService.toggleProfitReuse(props.bot._id, props.bot.config.reuseProfit)
}

const toggleCryptoConvert = () => {
  botService.toggleCryptoConvert(props.bot._id, props.bot.config.convertProfitToCrypto)
}

const toggleStopBuying = () => {
  botService.toggleStopBuying(props.bot._id, !props.bot.stopBuying)
}

const startBot = () => {
  botService.startBot(props.bot._id)
}

const pauseBot = () => {
  botService.pauseBot(props.bot._id).then(() => {
    main.getBots().then(() => main.updateGlobalPauseState())
  })
}

const resumeBot = () => {
  botService.resumeBot(props.bot._id).then(() => {
    main.getBots().then(() => main.updateGlobalPauseState())
  })
}
</script>

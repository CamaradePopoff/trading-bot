<template>
  <Bot v-if="route.query.id" />
  <template v-else>
    <PageHeader
      :title="$t('menus.bots') + ' (' + (filteredBots.length !== main.bots.length ? filteredBots.length + '/' : '') + main.bots.length + ')'"
      :loading="isLoading"
    >
      <template v-if="mdAndUp">
        <h2 class="pt-1">
          {{ $t('components.bot.usdUnsold', { asset: main.exchangeAsset }) }} {{ main.usdtRound(main.totalInvestment) }}
        </h2>
        <v-spacer />
        <div class="mt-1">
          <v-tooltip
            v-if="hasHiddenSimulatedProfits.length > 0"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                color="simulation"
                class="mt-3 blink-icon"
                size="large"
                v-bind="tooltipProps"
              >
                mdi-alert-outline
              </v-icon>
              <span class="text-simulation mr-2">{{ hasHiddenSimulatedProfits.length }}</span>
            </template>
            {{ $t('pages.bots.hiddenSimulatedProfits') }} ({{ hasHiddenSimulatedProfits.map(bot => bot.config.label || bot.config.symbol).join(', ') }})
          </v-tooltip>
          <v-tooltip
            v-if="hasHiddenRealProfits.length > 0"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                color="primary"
                class="mt-3 blink-icon"
                size="large"
                v-bind="tooltipProps"
              >
                mdi-alert-outline
              </v-icon>
              <span class="text-primary mr-2">{{ hasHiddenRealProfits.length }}</span>
            </template>
            {{ $t('pages.bots.hiddenRealProfits') }} ({{ hasHiddenRealProfits.map(bot => bot.config.label || bot.config.symbol).join(', ') }})
          </v-tooltip>
        </div>
        <div style="width: 200px">
          <v-text-field
            v-model="main.botFilter"
            :label="$t('pages.bots.search')"
            variant="outlined"
            type="text"
            density="compact"
            class="ml-2 mr-4 mt-2"
            style="height: 32px;"
            clearable
          />
        </div>
        <v-switch
          v-model="main.showRunningBotsOnly"
          :label="$t('pages.bots.runningOnly')"
          class="mr-4"
          color="primary"
        />
        <v-tooltip
          v-if="mdAndUp && main.bots.some((bot) => bot.config.simulation)"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <div
              v-bind="tooltipProps"
              class="d-flex align-start mt-3"
            >
              <v-icon
                :color="simulationFilter === 'all' ? 'white' : 'simulation'"
                :fill="simulationFilter === 'simulated'"
                class="mr-1 clickable"
                size="large"
                @click="simulationFilter = simulationFilter === 'all' ? 'real' : simulationFilter === 'real' ? 'simulated' : 'all'"
              >
                {{ simulationFilter === 'simulated' ? 'mdi-filter' : 'mdi-filter-outline' }}
              </v-icon>
              <span class="text-body-1 mr-2">{{ filteredBots.length }}</span>
            </div>
          </template>
          {{ $t(`pages.bots.filter${simulationFilter === 'all' ? 'All' : simulationFilter === 'real' ? 'RealOnly' : 'SimulatedOnly'}`) }}
        </v-tooltip>

        <v-tooltip location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              :icon="main.tableDisplay ? 'mdi-land-rows-horizontal' : 'mdi-view-grid-outline'"
              variant="text"
              color="primary"
              style="margin-top: 2px;"
              @click="main.tableDisplay = !main.tableDisplay"
            />
          </template>
          {{ main.tableDisplay ? $t('pages.bots.table') : $t('pages.bots.grid') }}
        </v-tooltip>
      </template>
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            :color="main.isGloballyPaused ? 'primary' : 'warning'"
            class="mt-3 mr-2"
            :size="mdAndUp ? 'large' : 'small'"
            :disabled="!someBotsSelected"
            :style="{ opacity: someBotsSelected ? 1 : 0.3, cursor: someBotsSelected ? 'pointer' : 'not-allowed' }"
            v-bind="tooltipProps"
            @click="someBotsSelected && toggleGlobalPause()"
          >
            {{ main.isGloballyPaused ? 'mdi-play-box-outline' : 'mdi-pause-box-outline' }}
          </v-icon>
        </template>
        {{ main.isGloballyPaused ? $t('pages.bots.resumeAllBots') : $t('pages.bots.pauseAllBots') }}
      </v-tooltip>
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            :color="main.isGloballyStoppingBuyingOnDrop ? 'primary' : 'error'"
            class="mt-3 mr-2"
            :size="mdAndUp ? 'large' : 'small'"
            :disabled="!someBotsSelected"
            :style="{ opacity: someBotsSelected ? 1 : 0.3, cursor: someBotsSelected ? 'pointer' : 'not-allowed' }"
            v-bind="tooltipProps"
            @click="someBotsSelected && toggleGlobalStopBuyingOnDrop()"
          >
            {{ main.isGloballyStoppingBuyingOnDrop ? 'mdi-download' : 'mdi-download-off' }}
          </v-icon>
        </template>
        {{ main.isGloballyStoppingBuyingOnDrop ? $t('pages.bots.resumeBuyingOnDropAllBots') : $t('pages.bots.stopBuyingOnDropAllBots') }}
      </v-tooltip>
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            :color="main.isGloballyStoppingBuyingOnRebuy ? 'primary' : 'error'"
            class="mt-3 mr-2"
            :size="mdAndUp ? 'large' : 'small'"
            :disabled="!someBotsSelected"
            :style="{ opacity: someBotsSelected ? 1 : 0.3, cursor: someBotsSelected ? 'pointer' : 'not-allowed' }"
            v-bind="tooltipProps"
            @click="someBotsSelected && toggleGlobalStopBuyingOnRebuy()"
          >
            {{ main.isGloballyStoppingBuyingOnRebuy ? 'mdi-upload' : 'mdi-upload-off' }}
          </v-icon>
        </template>
        {{ main.isGloballyStoppingBuyingOnRebuy ? $t('pages.bots.resumeBuyingOnRebuyAllBots') : $t('pages.bots.stopBuyingOnRebuyAllBots') }}
      </v-tooltip>
      <v-tooltip
        v-if="!main.tableDisplay"
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            :color="main.showAllCharts ? 'primary' : 'error'"
            class="mt-3 mr-3"
            :size="mdAndUp ? 'large' : 'small'"
            v-bind="tooltipProps"
            @click="toggleAllCharts"
          >
            mdi-chart-waterfall
          </v-icon>
        </template>
        {{ $t('pages.bots.toggleCharts') }}
      </v-tooltip>
      <v-tooltip
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            color="primary"
            class="mt-3 mr-3"
            :size="mdAndUp ? 'large' : 'small'"
            v-bind="tooltipProps"
            @click="addBot"
          >
            mdi-plus-circle-outline
          </v-icon>
        </template>
        {{ $t('pages.bots.addBot') }}
      </v-tooltip>
      <v-tooltip
        v-if="mdAndUp"
        location="bottom"
        content-class="text-caption"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            :color="main.btcDrawer ? 'primary' : 'primaryDark'"
            class="mt-3 mr-1"
            :size="mdAndUp ? 'small' : 'x-small'"
            variant="outlined"
            v-bind="tooltipProps"
            @click="main.btcDrawer = !main.btcDrawer"
          >
            BTC
          </v-btn>
        </template>
        {{ $t('pages.bots.viewBtcChart') }}
      </v-tooltip>
      <div
        v-if="mdAndUp && main.tableDisplay"
        class="d-flex flex-wrap mr-2"
      >
        <v-checkbox
          :model-value="allBotsSelected"
          :indeterminate="someBotsSelected && !allBotsSelected"
          color="primary"
          size="small"
          hide-details
          style="margin: -28px 1px 0 0;"
          @update:model-value="toggleSelectAll"
        />
      </div>

      <div
        v-if="!mdAndUp"
        class="d-flex flex-wrap"
      >
        <div style="width: calc(100%)">
          <v-text-field
            v-model="main.botFilter"
            :label="$t('pages.bots.search')"
            variant="outlined"
            type="text"
            density="compact"
            class="flex-grow-1 my-2"
            style="height: 32px;"
            clearable
          />
        </div>
        <v-switch
          v-model="main.showRunningBotsOnly"
          :label="$t('pages.bots.runningOnly')"
          class="ml-2 mr-2"
          color="primary"
          density="compact"
        />
        <div
          v-if="main.bots.some((bot) => bot.config.simulation)"
          class="d-flex align-start mt-2"
          style="padding-top: 3px;"
        >
          <v-icon
            :color="simulationFilter === 'all' ? 'white' : 'warning'"
            :fill="simulationFilter === 'simulated'"
            class="mr-1 clickable"
            size="small"
            @click="simulationFilter = simulationFilter === 'all' ? 'real' : simulationFilter === 'real' ? 'simulated' : 'all'"
          >
            {{ simulationFilter === 'simulated' ? 'mdi-filter' : 'mdi-filter-outline' }}
          </v-icon>
          <span class="text-body-1 mr-4">{{ filteredBots.length }}</span>
          <v-tooltip
            v-if="hasHiddenSimulatedProfits.length > 0"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                color="warning"
                class="mr-2 blink-icon"
                size="small"
                v-bind="tooltipProps"
              >
                mdi-alert-outline
              </v-icon>
            </template>
            <span class="text-simulation mr-2">{{ hasHiddenSimulatedProfits.length }}</span>
          </v-tooltip>
          <v-tooltip
            v-if="hasHiddenRealProfits.length > 0"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                color="primary"
                class="mr-2 blink-icon"
                size="large"
                v-bind="tooltipProps"
              >
                mdi-alert-outline
              </v-icon>
            </template>
            <span class="text-primary mr-2">{{ hasHiddenRealProfits.length }}</span>
          </v-tooltip>
        </div>
        <v-tooltip location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              :icon="main.tableDisplay ? 'mdi-land-rows-horizontal' : 'mdi-view-grid-outline'"
              size="small"
              variant="text"
              color="primary"
              style="margin-top: 1px;"
              @click="main.tableDisplay = !main.tableDisplay"
            />
          </template>
          {{ main.tableDisplay ? $t('pages.bots.table') : $t('pages.bots.grid') }}
        </v-tooltip>
        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              :color="main.btcDrawer ? 'primary' : 'primaryDark'"
              class="mt-3 mr-1"
              :size="mdAndUp ? 'small' : 'x-small'"
              variant="outlined"
              v-bind="tooltipProps"
              @click="main.btcDrawer = !main.btcDrawer"
            >
              BTC
            </v-btn>
          </template>
          {{ $t('pages.bots.viewBtcChart') }}
        </v-tooltip>
        <v-spacer />
        <v-checkbox
          class="mr-2"
          :model-value="allBotsSelected"
          :indeterminate="someBotsSelected && !allBotsSelected"
          color="primary"
          size="small"
          hide-details
          style="margin: -18px 0 0 0;"
          @update:model-value="toggleSelectAll"
        />
      </div>
    </PageHeader>

    <template v-if="!mdAndUp">
      <h3
        class="mx-7 pt-1"
        style="margin-top: -30px; margin-bottom: 30px;"
      >
        {{ $t('components.bot.usdUnsold', { asset: main.exchangeAsset }) }} {{ main.usdtRound(main.totalInvestment) }}
      </h3>
    </template>

    <div
      class="d-flex justify-center"
      :style="{ marginTop: '-20px', height: main.btcDrawer ? 'calc(100dvh - 64px - 74px - 40px - 350px)' : undefined, overflowY: main.btcDrawer ? 'auto' : undefined }"
    >
      <v-container
        fluid
        class="mx-6 pa-0"
      >
        <v-row
          v-if="main.tableDisplay"
          justify="center"
        >
          <v-col
            cols="12"
          >
            <table
              class="table table-striped table-hover w-100"
              style="border-collapse: collapse;"
            >
              <tbody>
                <BotRow
                  v-for="bot in filteredBots"
                  :key="bot._id"
                  :bot="bot"
                  :selected="selectedBots.has(bot._id)"
                  @select="selectBotRow"
                  @unselect="unselectBotRow"
                />
              </tbody>
            </table>
          </v-col>
        </v-row>
        <v-row
          v-else
          justify="center"
        >
          <template
            v-for="bot in filteredBots"
            :key="bot._id"
          >
            <v-col
              cols="12"
              :md="main.transactionsDrawer ? 12 : 6"
              :lg="4"
            >
              <BotCard
                :bot="bot"
                @select-bot="selectBot"
              />
            </v-col>
          </template>
        </v-row>
      </v-container>
    </div>
    <div
      v-if="main.btcDrawer"
      style="height: 350px; overflow-y: hidden;"
    >
      <TradingView
        v-if="main.btcDrawer"
        :key="main.lang"
        :pair="`BTC${main.exchangeAsset}`"
        :lang="main.lang"
        show-date-ranges
      />
    </div>
  </template>
</template>

<script setup>
import { watch, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'
import BotCard from '@/components/BotCard.vue'
import BotRow from '@/components/BotRow.vue'

const main = useMainStore()
const { mdAndUp } = useDisplay()

const isLoading = ref(false)
const router = useRouter()
const route = useRoute()
const selectedBot = ref()
const interval = ref()
const simulationFilter = ref('all') // 'all', 'real', 'simulated'
const selectedBots = ref(new Set()) // Track selected bot IDs

const allBotsSelected = computed(() => {
  if (filteredBots.value.length === 0) return false
  return filteredBots.value.every(bot => selectedBots.value.has(bot._id))
})

const someBotsSelected = computed(() => {
  return selectedBots.value.size > 0
})

const filteredBots = computed(() => {
  const s = main.botFilter || ''
  let bots = main.bots
  
  // Filter by simulation status
  if (simulationFilter.value === 'real') {
    bots = bots.filter((bot) => !bot.config.simulation)
  } else if (simulationFilter.value === 'simulated') {
    bots = bots.filter((bot) => bot.config.simulation)
  }
  
  // Filter by running status
  if (main.showRunningBotsOnly) {
    bots = bots.filter((bot) => !bot.isPaused && bot.hasStarted)
  }
  
  // Filter by search text
  if (s !== '') {
    bots = bots.filter((bot) => (bot.config.label || '').toLowerCase().includes(s.toLowerCase())
      || bot.config.symbol.replace(/-?USD(T|C)$/, '').toLowerCase().includes(s.toLowerCase()))
  }
  
  // Sort: real bots first, simulated bots last, then alphabetically by label or symbol
  return bots.sort((a, b) => {
    const aIsSimulated = a.config.simulation ? 1 : 0
    const bIsSimulated = b.config.simulation ? 1 : 0
    
    // First sort by simulation status
    if (aIsSimulated !== bIsSimulated) {
      return aIsSimulated - bIsSimulated
    }
    
    // Then sort alphabetically by label or symbol
    const aName = (a.config.label || a.config.symbol).toLowerCase()
    const bName = (b.config.label || b.config.symbol).toLowerCase()
    return aName.localeCompare(bName)
  })
})

// Check if a bot has positive profit positions
const hasProfitablePositions = (bot) => {
  const botTransactions = main.allTransactions.filter(t => t.botId === bot._id)
  if (botTransactions.length === 0) return false
  return botTransactions.some(
    (t) => t.targetPrice && !t.isSold && (t.profit || 0) > 0
  )
}

// Get hidden bots (bots not in the filtered list)
const hiddenBots = computed(() => {
  const filteredIds = new Set(filteredBots.value.map(b => b._id))
  return main.bots.filter(b => !filteredIds.has(b._id))
})

// Check if hidden simulated bots have profitable positions
const hasHiddenSimulatedProfits = computed(() => {
  return hiddenBots.value.filter(bot => 
    bot.config.simulation && hasProfitablePositions(bot)
  )
})

// Check if hidden real bots have profitable positions
const hasHiddenRealProfits = computed(() => {
  return hiddenBots.value.filter(bot => 
    !bot.config.simulation && hasProfitablePositions(bot)
  )
})

watch(
  () => route.query,
  (newQuery) => {
    if (!newQuery.id) selectedBot.value = null
  },
  { deep: true }
)

watch(
  () => [main.botFilter, simulationFilter.value, main.showRunningBotsOnly],
  () => {
    // Clear selections only when filter criteria actually change
    selectedBots.value = new Set()
    const newFilteredBots = filteredBots.value
    main.updateFilteredGlobalPauseState(newFilteredBots)
    main.updateFilteredGlobalStoppingBuyingState(newFilteredBots)
  }
)

onMounted(async () => {
  isLoading.value = true
  await main.getBots()
  await main.getTotalInvestment()
  await Promise.all(main.bots.map(async (bot) => {
    return main.getBotTransactions(bot._id)
  }))
  isLoading.value = false
  interval.value = setInterval(main.getBots, 3000)
})

onUnmounted(() => clearInterval(interval.value))

const selectBotRow = (bot) => {
  selectedBots.value = new Set([...selectedBots.value, bot._id])
}

const unselectBotRow = (bot) => {
  const newSet = new Set(selectedBots.value)
  newSet.delete(bot._id)
  selectedBots.value = newSet
}

const toggleSelectAll = (value) => {
  if (value) {
    // Select all filtered bots
    selectedBots.value = new Set(filteredBots.value.map(bot => bot._id))
  } else {
    // Deselect all bots
    selectedBots.value = new Set()
  }
}

const selectBot = (bot) => {
  selectedBot.value = bot
  router.push({ path: '/bots', query: { id: bot._id } })
}

const addBot = () => {
  router.push({ path: '/bots/new' })
}

const toggleAllCharts = () => {
  main.showAllCharts = !main.showAllCharts
}

// Get intersection of filtered bots and selected bots
const getSelectedFilteredBots = () => {
  return filteredBots.value.filter(bot => selectedBots.value.has(bot._id))
}

const toggleGlobalPause = async () => {
  try {
    const botsToUpdate = getSelectedFilteredBots()
    if (botsToUpdate.length === 0) return
    if (main.isGloballyPaused) {
      await main.resumeFilteredBots(botsToUpdate)
    } else {
      await main.pauseFilteredBots(botsToUpdate)
    }
    await main.getBots()
    main.updateFilteredGlobalPauseState(botsToUpdate)
  } catch (error) {
    console.error('Error toggling global pause:', error)
  }
}

const toggleGlobalStopBuyingOnDrop = async () => {
  try {
    const botsToUpdate = getSelectedFilteredBots()
    if (botsToUpdate.length === 0) return
    if (main.isGloballyStoppingBuyingOnDrop) {
      await main.goBuyingOnDropFilteredBots(botsToUpdate)
    } else {
      await main.stopBuyingOnDropFilteredBots(botsToUpdate)
    }
    await main.getBots()
    main.updateFilteredGlobalStoppingBuyingState(botsToUpdate)
  } catch (error) {
    console.error('Error toggling global stop buying on drop:', error)
  }
}

const toggleGlobalStopBuyingOnRebuy = async () => {
  try {
    const botsToUpdate = getSelectedFilteredBots()
    if (botsToUpdate.length === 0) return
    if (main.isGloballyStoppingBuyingOnRebuy) {
      await main.goBuyingOnRebuyFilteredBots(botsToUpdate)
    } else {
      await main.stopBuyingOnRebuyFilteredBots(botsToUpdate)
    }
    await main.getBots()
    main.updateFilteredGlobalStoppingBuyingState(botsToUpdate)
  } catch (error) {
    console.error('Error toggling global stop buying on rebuy:', error)
  }
}
</script>

<style scoped>
@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.blink-icon {
  animation: blink 1.5s ease-in-out infinite;
}
</style>

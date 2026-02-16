<template>
  <v-app>
    <v-app-bar
      v-if="mdAndUp || main.user && main.user.username && main.token"
      v-show="main.user && main.user.username && main.token"
      app
      :title="mdAndUp ? $t('common.welcomeToSubtitle') : ''"
      color="blue-grey-darken-4"
    >
      <template #prepend>
        <v-app-bar-nav-icon @click="main.menuDrawer = !main.menuDrawer">
          <img
            v-if="main.exchange"
            style="height: 36px"
            :src="`/${main.exchange}.png`"
            alt=""
          >
        </v-app-bar-nav-icon>
        <BotBrand
          v-if="mdAndUp"
          text
        />
        <div
          v-else
          id="bot-cursor-slot"
          class="ml-4 mt-12"
          style="width: calc(100vw - 278px);"
        />
        <v-spacer class="text-grey-darken-2 ml-7">
          <h1 v-if="mdAndUp">
            |
          </h1>
        </v-spacer>
      </template>

      <template v-if="main.user">
        <TradingBalances
          v-if="mdAndUp"
          class="mr-4"
          :filter="[main.exchangeToken, main.exchangeAsset]"
        />

        <v-chip
          size="large"
          class="pl-0 pr-2 mr-3"
        >
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                size="large"
                :color="main.isAdmin ? 'admin' : ''"
                class="clickable mx-2"
                v-bind="tooltipProps"
                @click="navigate('/account')"
              >
                mdi-account-circle
              </v-icon>
            </template>
            {{ $t('menus.account') }}
          </v-tooltip>
          <h3
            v-if="mdAndUp"
            class="mr-2"
            :class="main.isAdmin ? 'text-admin' : ''"
          >
            {{ main.user.username }}
            <span
              v-if="tokenTimeRemaining"
              :class="['text-caption', 'text-white', { 'blink-text': isTokenTimeLow }]"
              style="position: relative; top: -2px; font-family: monospace;"
            >
              ({{ tokenTimeRemaining }})
            </span>
          </h3>

          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                class="clickable mr-2"
                :color="main.playSounds ? 'primary' : 'error' "
                v-bind="tooltipProps"
                @click="main.playSounds = !main.playSounds"
              >
                {{ main.playSounds ? 'mdi-volume-high' : 'mdi-volume-off' }}
              </v-icon>
            </template>
            {{ main.playSounds ? $t('pages.app.soundOn') : $t('pages.app.soundOff') }}
          </v-tooltip>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                class="clickable mr-2"
                color="info"
                v-bind="tooltipProps"
                @click="helpDialog.openHelp()"
              >
                mdi-help-circle
              </v-icon>
            </template>
            {{ $t('common.help') }}
          </v-tooltip>
          <v-tooltip
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                class="clickable"
                color="error"
                v-bind="tooltipProps"
                @click="logout"
              >
                mdi-power-standby
              </v-icon>
            </template>
            {{ $t('menus.logout') }}
          </v-tooltip>
        </v-chip>

        <v-tooltip
          location="bottom"
          content-class="text-caption"
        >
          <template #activator="{ props: tooltipProps }">
            <v-icon
              :color="main.transactionsDrawer ? 'primary' : 'error'"
              class="mr-3"
              size="x-large"
              v-bind="tooltipProps"
              @click="main.transactionsDrawer = !main.transactionsDrawer"
            >
              mdi-list-box-outline
            </v-icon>
          </template>
          {{ $t('common.transactions') }}
        </v-tooltip>
      </template>
    </v-app-bar>

    <template v-if="main.user && main.user.username && main.token">
      <v-navigation-drawer
        v-model="main.menuDrawer"
        width="180"
      >
        <v-list
          :density="mdAndUp ? 'default' : 'compact'"
          class="more-compact"
        >
          <template v-if="main.isAdmin && main.adminMode">
            <v-list-item
              class="text-admin"
              @click="main.adminMode = false"
            >
              <template #prepend>
                <v-icon icon="mdi-application-outline" />
              </template>
              <v-list-item-title>App</v-list-item-title>
            </v-list-item>
            <v-list-item
              class="text-admin"
              @click="navigate('/admin/users')"
            >
              <template #prepend>
                <v-icon icon="mdi-account-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.admin.users') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              class="text-admin"
              @click="navigate('/admin/bots')"
            >
              <template #prepend>
                <v-icon icon="mdi-robot-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.admin.bots') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              class="text-admin"
              @click="navigate('/admin/logs')"
            >
              <template #prepend>
                <v-icon icon="mdi-text-box-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.logs') }}</v-list-item-title>
            </v-list-item>
          </template>
        
          <template v-else>
            <v-list-item
              v-if="main.isAdmin"
              class="text-admin"
              @click="main.adminMode = true"
            >
              <template #prepend>
                <v-icon icon="mdi-database-cog-outline" />
              </template>
              <v-list-item-title>Admin</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/home')">
              <template #prepend>
                <v-icon icon="mdi-home-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.home') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/balances')">
              <template #prepend>
                <v-icon icon="mdi-wallet-bifold-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.balances') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/bots')">
              <template #prepend>
                <v-icon icon="mdi-robot-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.bots') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/cryptos')">
              <template #prepend>
                <v-icon icon="mdi-currency-btc" />
              </template>
              <v-list-item-title>{{ $t('menus.cryptos') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/trading')">
              <template #prepend>
                <v-icon icon="mdi-chart-waterfall" />
              </template>
              <v-list-item-title>{{ $t('menus.trading') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/favorites')">
              <template #prepend>
                <v-icon icon="mdi-star-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.favorites') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigate('/news')">
              <template #prepend>
                <v-icon icon="mdi-script-text-outline" />
              </template>
              <v-list-item-title>{{ $t('menus.news') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="goToExchange">
              <template #prepend>
                <v-icon icon="mdi-web" />
              </template>
              <v-list-item-title>
                {{ main.exchangeByName(main.exchange).name }} <v-icon
                  icon="mdi-open-in-new"
                  color="primary"
                  size="mini"
                />
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-list>

        <div
          class="pa-2 text-body-2"
          style="position: absolute; bottom: 0; width: 100%;"
        >
          <TradingBalances
            v-if="!mdAndUp"
            vertical
            :filter="[main.exchangeToken, main.exchangeAsset]"
          />
          <v-sheet
            rounded
            color="blue-grey-darken-4"
            class="font-weight-bold px-2 py-1 mt-2"
          >
            <div
              class="d-flex"
            >
              <span :class="text-body-1">{{ $t('common.totalProfit') }}</span>
              <v-spacer />
              <v-tooltip
                location="bottom"
                content-class="text-caption"
              >
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    class="clickable ml-2"
                    color="warning"
                    v-bind="tooltipProps"
                    @click="showDeleteSimulationsDialog = true"
                  >
                    mdi-delete-forever
                  </v-icon>
                </template>
                {{ $t('pages.app.deleteSimulationsHistory') }}
              </v-tooltip>
            </div>
            <!-- Total USDx profit (real) -->
            <div
              class="d-flex text-primary bg-blue-grey-darken-3 mt-1 pa-0"
              style="border-radius:4px"
            >
              <div
                class="d-flex text-primary bg-blue-grey-darken-2 px-1 mr-2"
                style="border-radius:4px 0 0 4px; padding-top: 2px"
              >
                <v-icon
                  size="small"
                  icon="mdi-currency-usd"
                />
              </div>
              <div style="padding-top: 2px">
                {{ main.usdtRound(main.user.totalProfit || 0) }}
              </div>
            </div>
            <!-- Total crypto profit (real) -->
            <div
              class="d-flex text-primary bg-blue-grey-darken-3 mt-1 pa-0"
              style="border-radius:4px"
            >
              <div
                class="d-flex text-primary bg-blue-grey-darken-2 px-1 mr-2"
                style="border-radius:4px 0 0 4px; padding-top: 2px"
              >
                <v-icon
                  size="small"
                  icon="mdi-currency-btc"
                />
              </div>
              <div style="padding-top: 2px">
                {{ main.usdtRound(main.cryptoProfits?.total?.real || 0) }}
              </div>
            </div>
            <!-- Total USDx profit (simulated) -->
            <div
              class="d-flex bg-blue-grey-darken-3 d-flex text-simulation font-weight-light mt-1 pa-0"
              style="border-radius:4px"
            >
              <div
                class="d-flex text-simulation bg-blue-grey-darken-2 px-1 mr-2"
                style="border-radius:4px 0 0 4px; padding-top: 2px"
              >
                <v-icon
                  size="small"
                  icon="mdi-currency-usd"
                />
              </div>
              <div style="padding-top: 2px">
                {{ main.usdtRound(main.user.totalProfitSimulated || 0) }}
              </div>
            </div>
            <!-- Total crypto profit (simulated) -->
            <div
              class="d-flex bg-blue-grey-darken-3 d-flex text-simulation font-weight-light mt-1 pa-0"
              style="border-radius:4px"
            >
              <div
                class="d-flex text-simulation bg-blue-grey-darken-2 px-1 mr-2"
                style="border-radius:4px 0 0 4px; padding-top: 2px"
              >
                <v-icon
                  size="small"
                  icon="mdi-currency-btc"
                />
              </div>
              <div style="padding-top: 2px">
                {{ main.usdtRound(main.cryptoProfits?.total?.simulation || 0) }}
              </div>
            </div>
          </v-sheet>
        </div>
      </v-navigation-drawer>

      <v-main>
        <div style="height: calc(100dvh - 64px - 40px); overflow-y: auto;">
          <router-view />
          <div
            v-show="main.btcDrawer && route.path === '/bots' && !route.query.id"
            id="btc-chart"
            :style="{ 
              height: `${main.btcChartHeight}px`,
              zIndex: 100,
              overflowY: 'hidden',
              width: `calc(100% - ${(main.menuDrawer ? 180 : 0) + (main.transactionsDrawer ? 260 : 0)}px)`,
              position: 'absolute',
              bottom: '39px',
              transition: isResizingChart ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }"
          >
            <div
              class="chart-resize-handle"
              @mousedown="startChartResize"
              @touchstart="startChartResize"
            >
              <div class="chart-resize-handle-bar" />
            </div>
            <TradingView
              v-if="main.user && main.lang && main.exchangeAsset"
              :key="main.lang"
              :pair="`BTC${main.exchangeAsset}`"
              :lang="main.lang"
              show-date-ranges
            />
          </div>
        </div>
      </v-main>

      <v-footer
        height="40"
        class="px-1"
        app
      >
        <AppFooter
          v-if="main.user"
        />
        <div
          class="lang-selector clickable"
          :class="main.lang"
          @click="switchLang"
        />
      </v-footer>

      <v-navigation-drawer
        v-model="main.transactionsDrawer"
        location="end"
        width="260"
        class="text-body-2"
      >
        <div
          v-if="main.allTransactions.length === 0"
          class="d-flex pa-4"
        >
          {{ $t('common.noData') }}
        </div>
        <template v-else>
          <div :style="{ height: 'calc(100% - 36px)', 'overflow-y': 'auto' }">
            <div
              v-for="(tr, index) in filteredTransactions"
              :key="tr._id"
              style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              class="px-2"
              :class="tr.targetPrice ? `${index === 0 ? ' mt-2' : ''} ${tr.isSimulation ? ' bg-simulationDark' : ''} ${tr.profit < 0 ? 'text-purchaseDark' : 'text-purchase'} ` : `text-selling ${index === 0 ? ' mt-2' : ''} ${tr.isSimulation ? ' bg-simulationDark' : ''}`"
            >
              <v-icon
                size="x-small"
                :style="{ 'margin-bottom': tr.isForced ? '2px' : '4px' }"
              >
                mdi-{{ tr.isForced ? 'account-outline' : 'robot-outline' }}
              </v-icon>
              {{ main.shortDate(tr.createdAt) }}
              <span class="font-weight-bold">{{ tr.currency.replace(new RegExp(`-?${main.exchangeAsset}$`), '') }}&nbsp;</span>
              <template v-if="tr.profitAsCrypto">
                {{ tr.profitAsCrypto > 0 ? '+' : '' }}{{ main.jsRound(tr.profitAsCrypto) }}
              </template> 
              <template v-else>
                {{ tr.profit > 0 ? '+' : '' }}{{ main.usdtRound(tr.profit) }} {{ main.exchangeAsset }}
              </template>
            </div>
          </div>
          <div
            style="height: 36px;"
            class="pa-0 ma-0 px-1 d-flex align-center"
          >
            <v-tooltip
              location="bottom"
              content-class="text-caption"
            >
              <template #activator="{ props: tooltipProps }">
                <v-icon 
                  class="clickable mr-1"
                  :color="transactionTypeFilter || 'grey'"
                  v-bind="tooltipProps"
                  @click="transactionTypeFilter = transactionTypeFilter === null ? 'purchase' : transactionTypeFilter === 'selling' ? null : 'selling'"
                >
                  {{ transactionTypeFilter ? 'mdi-filter' : 'mdi-filter-outline' }}
                </v-icon>
              </template>
              {{ $t('pages.app.filterType') }}
            </v-tooltip>
            <input
              v-model="transactionFilter" 
              type="text" 
              :placeholder="$t('pages.trading.filterTransactions')" 
              class="full-width pa-2 mr-1"
              style="box-sizing: border-box; height: 24px; font-size: 12px; border: 1px solid;"
            >
            <v-tooltip
              v-if="main.allTransactions.some(t => t.isSimulation)"
              location="bottom"
              content-class="text-caption"
            >
              <template #activator="{ props: tooltipProps }">
                <v-icon
                  class="clickable mr-1"
                  :color="filterSimulationTransactions ? 'simulation' : 'grey'"
                  v-bind="tooltipProps"
                  @click="filterSimulationTransactions = filterSimulationTransactions === null ? 'real' : filterSimulationTransactions === 'real' ? 'simulation' : null"
                >
                  {{ filterSimulationTransactions === 'simulation' ? 'mdi-filter' : 'mdi-filter-outline' }}
                </v-icon>
              </template>
              {{ $t('pages.app.filterSimulation') }}
            </v-tooltip>
          </div>
        </template>
      </v-navigation-drawer>

      <ConfirmationPopup
        v-if="showDeleteSimulationsDialog"
        @cancel="showDeleteSimulationsDialog = false"
        @confirm="deleteSimulations"
      >
        <div>{{ $t('pages.app.deleteSimulationsTitle') }}</div>
        <div>{{ $t('common.areYouSure') }}</div>
      </ConfirmationPopup>

      <HelpDialog ref="helpDialog" />
    </template>

    <template v-else>
      <Register v-if="route.path === '/register'" />
      <Login v-else />
    </template>
  </v-app>

  <v-snackbar
    v-model="snackbarShow"
    :color="main.snackbar && main.snackbar.color ? main.snackbar.color : 'primary'"
    location="bottom right"
    close-on-content-click
    timer
    timeout="10000"
    multi-line
    elevation="6"
    style="z-index: 9999"
  >
    {{ main.snackbar && main.snackbar.text }}
    <template #actions>
      <v-btn
        icon
        @click="main.$patch({ snackbar: { show: false } })"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '@/store'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import userService from '@services/user.service'
import Login from '@components/Login.vue'
import Register from '@components/Register.vue'
import HelpDialog from '@components/HelpDialog.vue'
import TradingView from '@components/TradingView.vue'

const main = useMainStore()
const router = useRouter()
const route = useRoute()
const { mdAndUp } = useDisplay()
const { locale } = useI18n()

const appInterval = ref()
const showDeleteSimulationsDialog = ref(false)
const helpDialog = ref(null)
const transactionFilter = ref('')
const transactionTypeFilter = ref(null)
const filterSimulationTransactions = ref(null)
const tokenTimeRemaining = ref('')
const isTokenTimeLow = ref(false)

// BTC chart resize functionality
const isResizingChart = ref(false)
const resizeStartY = ref(0)
const resizeStartHeight = ref(0)
const animationFrameId = ref(null)

// Decode JWT token and calculate remaining time
const updateTokenExpiration = () => {
  if (!main.token) {
    tokenTimeRemaining.value = ''
    return
  }
  
  try {
    const base64Url = main.token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    
    if (payload.exp) {
      const expirationTime = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      const remaining = expirationTime - now
      
      // Check if 5 minutes or less
      isTokenTimeLow.value = remaining <= 5 * 60 * 1000
      
      if (remaining <= 0) {
        tokenTimeRemaining.value = 'Expired'
        return
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
      
      if (hours > 0) {
        tokenTimeRemaining.value = `${hours}h ${String(minutes).padStart(2, '0')}m`
      } else if (minutes > 0) {
        tokenTimeRemaining.value = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      } else {
        tokenTimeRemaining.value = `${String(seconds).padStart(2, '0')}s`
      }
    }
  } catch (error) {
    console.error('Error decoding token:', error)
    tokenTimeRemaining.value = ''
  }
}

const snackbarShow = computed({
  get: () => main.snackbar && main.snackbar.show,
  set: (val) => main.$patch({ snackbar: { ...main.snackbar, show: val } })
})

const filteredTransactions = computed(() => {
  const transactionsWithProfit = main.allTransactions.map((transaction) => {
    const currentPrice = main.currentPrices[transaction.currency]?.price || null
    const botFee = transaction.botId ? (main.bots.find(b => b._id === transaction.botId)?.config.fee || 0) : 0
    return {
      ...transaction,
        profit:
            transaction.targetPrice && !transaction.isSold && currentPrice
              ? transaction.paid
                ? main.jsRound(
                    currentPrice *
                      transaction.amount *
                      (1 - botFee / 100) -
                      (transaction.paid + transaction.fee)
                  )
                : main.jsRound(
                    // legacy
                    (currentPrice - transaction.price) * transaction.amount
                  )
              : transaction.profit
    }
  })
  const filtered = transactionFilter.value.trim()
    ? transactionsWithProfit.filter(t =>
        t.currency
          .replace(new RegExp(`-?${main.exchangeAsset}$`), '')
          .toUpperCase()
          .includes(transactionFilter.value.toUpperCase())
      )
    : transactionsWithProfit
  
  // Apply type filter (null = all, 'purchase' = buys, 'selling' = sells)
  const typeFiltered = transactionTypeFilter.value === null
    ? filtered
    : transactionTypeFilter.value === 'purchase'
      ? filtered.filter(t => t.targetPrice && !t.isSold)
      : filtered.filter(t => !t.targetPrice)
  
  // Apply simulation filter (null = all, 'real' = only real, 'simulation' = only simulated)
  const simulationFiltered = filterSimulationTransactions.value === null
    ? typeFiltered
    : filterSimulationTransactions.value === 'real'
      ? typeFiltered.filter(t => !t.isSimulation)
      : typeFiltered.filter(t => t.isSimulation)
  
  return simulationFiltered.slice(0, 50)
})

const langs = ref([
  'en',
  'es',
  'fr',
])

onMounted(() => {
  // console.log('API url:', import.meta.env.VITE_API_ROOT_URL)
  locale.value = main.lang
  if (langs.value.indexOf(main.lang) === -1) main.lang = 'en'
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const token = localStorage.getItem('token')
  const exchange = localStorage.getItem('exchange') || 'kucoin'
  if (user && user.username && token) {
    console.log(`User ${user.username} found in local storage`)
    main.user = user
    main.token = token
    main.exchange = exchange
    main.tableDisplay = true
    // Connect WebSocket for existing session
    main.connectWebSocket()
    main.getNews()
  } else {
    console.log('No user found in local storage')
    if (appInterval.value) clearInterval(appInterval.value)
  }
  getData()
  appInterval.value = setInterval(getData, 60 * 1000) // every minute
  updateTokenExpiration()
  setInterval(updateTokenExpiration, 1000) // Update every second
})

onUnmounted(()=>{
  if (appInterval.value) clearInterval(appInterval.value)
  if (animationFrameId.value) cancelAnimationFrame(animationFrameId.value)
  document.removeEventListener('mousemove', handleChartResize, true)
  document.removeEventListener('mouseup', stopChartResize, true)
  document.removeEventListener('touchmove', handleChartResize, true)
  document.removeEventListener('touchend', stopChartResize, true)
})

const getClientY = (event) => {
  return event.touches ? event.touches[0].clientY : event.clientY
}

const startChartResize = (event) => {
  isResizingChart.value = true
  resizeStartY.value = getClientY(event)
  resizeStartHeight.value = main.btcChartHeight
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleChartResize, { capture: true, passive: false })
  document.addEventListener('mouseup', stopChartResize, { capture: true, passive: false })
  document.addEventListener('touchmove', handleChartResize, { capture: true, passive: false })
  document.addEventListener('touchend', stopChartResize, { capture: true, passive: false })
  event.preventDefault()
  event.stopPropagation()
}

const handleChartResize = (event) => {
  if (!isResizingChart.value) return
  
  event.preventDefault()
  event.stopPropagation()
  
  // Cancel any pending animation frame
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  
  // Use requestAnimationFrame for smooth updates
  animationFrameId.value = requestAnimationFrame(() => {
    const deltaY = resizeStartY.value - getClientY(event)
    const newHeight = Math.max(200, Math.min(800, resizeStartHeight.value + deltaY))
    main.btcChartHeight = newHeight
    animationFrameId.value = null
  })
}

const stopChartResize = (event) => {
  if (!isResizingChart.value) return
  
  event.preventDefault()
  event.stopPropagation()
  
  isResizingChart.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // Cancel any pending animation frame
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
  
  localStorage.setItem('btcChartHeight', main.btcChartHeight.toString())
  document.removeEventListener('mousemove', handleChartResize, true)
  document.removeEventListener('mouseup', stopChartResize, true)
  document.removeEventListener('touchmove', handleChartResize, true)
  document.removeEventListener('touchend', stopChartResize, true)
}

const deleteSimulations = () => {
  userService.deleteSimulatedProfits().then(() => {
    main.getTotalProfits()
  })  
}

const getData = () => {
  if (!main.user) return
  main.getUserData()
}

const switchLang = () => {
  const index = langs.value.indexOf(main.lang)
  main.lang = langs.value[(index + 1) % langs.value.length]
  locale.value = main.lang
  main.getNews()
}

const goToExchange = () => {
  window.open(main.exchangeUrl, '_blank')
}

const navigate = (path) => {
  router.push(path)
}

const logout = () => {
  main.logout()
}
</script>

<style scoped>
.lang-selector {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 20px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
.lang-selector.en {
  background-image: url('/flag-en_UK.png');
}
.lang-selector.es {
  background-image: url('/flag-es_ES.png');
}
.lang-selector.fr {
  background-image: url('/flag-fr_FR.png');
}
</style>

<style>
.clickable {
  cursor: pointer;
}
.full-width {
  width: 100%;
}
.overflow-hidden {
  overflow: hidden;
}

/* Overrides */

.bot-cursor.v-slider:not(.dense) .v-input__control {
  margin-bottom: -30px;
}
.bot-cursor.v-slider .v-slider-track__background--opacity {
  opacity: 1;
}
.bot-cursor.v-slider.v-input--horizontal .v-slider-track {
  height: calc(var(--v-slider-track-size)); /* instead of +2px */
}
.bot-cursor.v-slider.v-input--horizontal .v-slider-track__tick {
  margin-top: calc(var(--v-slider-track-size) - 6px);
  height: 10px;
  background: rgb(var(--v-theme-purchase));
}
.bot-cursor.v-slider.v-input--horizontal .v-slider-thumb__label {
  background-color: #eee;
}
.more-compact .v-list-item--density-compact.v-list-item--one-line {
  min-height: 36px;
}

@keyframes blink-text {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.blink-text {
  animation: blink-text 1s ease-in-out infinite;
}

.chart-resize-handle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 40px;
  cursor: ns-resize;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  user-select: none;
}

.chart-resize-handle:hover .chart-resize-handle-bar {
  background-color: rgb(var(--v-theme-primary));
}

.chart-resize-handle-bar {
  width: 80px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  transition: background-color 0.2s;
  pointer-events: none;
}
</style>
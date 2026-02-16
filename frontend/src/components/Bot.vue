<template>
  <template v-if="bot">
    <v-container
      fluid
      class="my-0"
    >
      <v-row
        dense
        class="pl-4"
      >
        <h2
          v-if="mdAndUp"
          class="pt-1"
        >
          Bot
        </h2>
        <div
          class="d-flex"
          :class="mdAndUp ? 'ml-4' : 'justify-center mr-4'"
          :style="{ width: mdAndUp ? 'unset' : '100%' }"
        >
          <v-tooltip
            v-if="main.bots.length > 1"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                size="small"
                icon="mdi-chevron-left"
                class="mt-1 mr-2"
                v-bind="tooltipProps"
                @click="goToBot(-1)"
              />
            </template>
            {{ $t('buttons.previous') }}
          </v-tooltip>
          <div
            class="d-flex align-center justify-center"
            style="width:200px;border-radius:20px;"
            :class="bot.config.simulation ? 'bg-simulationDark' : 'bg-grey-darken-4'"
          >
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
            <span
              class="ml-2"
              :class="bot.config.simulation ? 'text-simulation' : ''"
            >{{ bot.config.label || `(${bot.config.symbol})` }}</span>
          </div>
          <v-tooltip
            v-if="main.bots && main.bots.length > 1"
            location="bottom"
            content-class="text-caption"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                size="small"
                icon="mdi-chevron-right"
                class="mt-1 ml-2"
                v-bind="tooltipProps"
                @click="goToBot(1)"
              />
            </template>
            {{ $t('buttons.next') }}
          </v-tooltip>
        </div>
        <div
          v-if="botNews(bot.config.symbol) > 0"
          class="text-blue clickable pt-2 ml-2"
          @click.stop="goToNews(bot.config.symbol)"
        >
          <v-icon
            icon="mdi-script-text-outline"
            class="ml-2"
          />
          {{ botNews(bot.config.symbol) }}
        </div>
        <v-spacer />
        <h2
          class="mt-1"
          :class="{'text-simulation font-weight-light': bot.config.simulation,
                   'text-primary': !bot.config.simulation, 'ml-4': mdAndUp}"
        >
          Profit: {{ main.usdtRound(bot.totalProfit) }} {{ main.exchangeAsset }}
          <span v-if="bot.totalProfitCrypto">
            <span class="mx-2">+</span>
            {{ main.jsRound(bot.totalProfitCrypto) }}&nbsp;{{ bot.config.symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '') }}
            ({{ main.usdtRound(bot.totalProfitCrypto * bot.currentPrice) }} {{ main.exchangeAsset }})
          </span>
        </h2>
        <v-spacer v-if="mdAndUp" />
        <div
          v-if="mdAndUp"
          class="mt-2 mr-4"
        >
          <v-chip
            v-if="bot.config.simulation"
            class="text-simulation"
          >
            {{ $t('common.simulation') }}
          </v-chip>
        </div>
        <div class="mt-3 mr-2">
          {{ $t('common.created') }} {{ main.formatDate($t, bot.createdAt) }}
        </div>
      </v-row>
    </v-container>

    <v-container
      fluid
      class="my-0 pa-0"
    >
      <BotPositionSlider
        :bot="bot"
      />

      <v-row
        dense
        class="mx-4"
      >
        <v-col
          cols="12"
          md="8"
        > 
          <v-card height="100%">
            <v-card-title class="bg-blue-grey-darken-4">
              <div class="d-flex">
                <span
                  v-if="mdAndUp"
                >{{ $t('components.bot.configuration') }}</span>
                <v-spacer v-if="mdAndUp" />
                <v-icon
                  class="mr-1"
                  :size="mdAndUp ? 'small' : 'x-small'"
                >
                  mdi-update
                </v-icon>
                <span
                  class="mr-3"
                  :class="mdAndUp ? '' : 'text-caption'"
                >{{ bot.config.botInterval }}s</span>
                <v-spacer v-if="!mdAndUp" />
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      :size="mdAndUp ? 'small' : 'x-small'"
                      variant="outlined"
                      :color="bot.config.convertProfitToCrypto ? 'primary' : 'error'"
                      class="mr-2"
                      v-bind="tooltipProps"
                      @click="toggleCryptoConvert"
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
                      :size="mdAndUp ? 'small' : 'x-small'"
                      variant="outlined"
                      :color="bot.stopBuyingOnDrop ? 'error' : 'primary'"
                      class="mr-2"
                      v-bind="tooltipProps"
                      @click="toggleStopBuyingOnDrop"
                    >
                      <v-icon size="large">
                        {{ bot.stopBuyingOnDrop ? 'mdi-download-off' : 'mdi-download' }}
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ bot.stopBuyingOnDrop ? $t('components.bot.enableBuyingOnDrop') : $t('components.bot.stopBuyingOnDrop') }}
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      :size="mdAndUp ? 'small' : 'x-small'"
                      variant="outlined"
                      :color="bot.stopBuyingOnRebuy ? 'error' : 'primary'"
                      class="mr-2"
                      v-bind="tooltipProps"
                      @click="toggleStopBuyingOnRebuy"
                    >
                      <v-icon size="large">
                        {{ bot.stopBuyingOnRebuy ? 'mdi-upload-off' : 'mdi-upload' }}
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ bot.stopBuyingOnRebuy ? $t('components.bot.enableBuyingOnRebuy') : $t('components.bot.stopBuyingOnRebuy') }}
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      :size="mdAndUp ? 'small' : 'x-small'"
                      variant="outlined"
                      :color="bot.config.reuseProfit ? 'primary' : 'error'"
                      class="mr-2"
                      v-bind="tooltipProps"
                      @click="toggleProfitReuse"
                    >
                      <v-icon size="large">
                        mdi-recycle-variant
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('components.bot.reuseProfit') }}
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      :size="mdAndUp ? 'small' : 'x-small'"
                      variant="outlined"
                      color="primary"
                      v-bind="tooltipProps"
                      @click="editConfig"
                    >
                      <v-icon size="large">
                        mdi-pencil
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('buttons.edit') }}
                </v-tooltip>
              </div>
            </v-card-title>
            <v-card-text class="mt-4">
              <v-row dense>
                <v-col
                  cols="12"
                  md="4"
                >
                  <div class="mb-2">
                    <h2>{{ $t('components.bot.currency') }} <span class="text-primary">{{ bot.config.symbol }}</span></h2>
                  </div>
                  <div class="mb-2">
                    {{ $t('components.bot.marketFee') }} {{ bot.config.fee ? bot.config.fee : main.kucoinFee * 100 }}%
                    <v-chip
                      v-if="!main.isVipFeeExchange"
                      size="small"
                      class="ml-2"
                    >
                      <span>{{ $t('common.class') }}</span>
                      <span class="ml-1">{{ symbolClass }}</span>
                    </v-chip>
                  </div>
                  <h3>
                    {{ $t('components.bot.openingPrice') }} <span :class="bot.openingPrice <= bot.currentPrice ? 'text-purchase' : 'text-error'">{{ bot.openingPrice }}</span>
                  </h3>
                </v-col>
                <v-col
                  cols="12"
                  md="4"
                >
                  <div class="mb-1">
                    {{ $t('components.bot.investment') }} {{ main.usdtRound(bot.config.maxInvestment) }} {{ main.exchangeAsset }}
                  </div>
                  <div class="mb-1">
                    {{ $t('components.bot.positions') }} {{ bot.config.maxPositions }}
                    <span
                      v-if="bot.config.reuseProfitToMaxPositions && bot.positionBoost"
                      class="text-purchase"
                    >
                      + {{ bot.positionBoost }}
                    </span>
                    <span v-if="bot.config.reuseProfitToMaxPositions">
                      (<span v-if="bot.config.maxPositions + bot.positionBoost < bot.config.reuseProfitToMaxPositions">&rtrif;</span>{{ bot.config.reuseProfitToMaxPositions }})
                    </span>
                  </div>
                  <div class="mb-1">
                    {{ $t('components.botConfig.positionsToRebuy') }}{{ $t('common.:') }} {{ bot.config.positionsToRebuy }}
                  </div>
                  <div class="mb-1">
                    {{ $t('components.bot.positionPrice') }}
                    {{ main.usdtRound(bot.config.maxInvestment / bot.config.maxPositions) }}
                    <span
                      v-if="bot.config.reuseProfit && bot.usdtBoost"
                      class="text-purchase"
                    >+ {{ main.usdtRound(bot.usdtBoost) }}</span>
                    {{ main.exchangeAsset }}
                  </div>
                </v-col>
                <v-col
                  cols="12"
                  md="4"
                >
                  <div class="mt-& mb-1">
                    <template v-if="bot.config.emergencyUnlockThreshold && bot.config.emergencyUnlockThreshold > 0">
                      <span class="text-emergency">
                        <v-icon
                          color="emergency"
                          size="small"
                        >mdi-flash-outline</v-icon>
                        {{ bot.config.emergencyUnlockThreshold }}% ({{ bot.config.emergencyUnlockPositions }})</span>
                      -
                    </template>
                    {{ $t('common.purchase') }}
                    <span class="text-purchase">{{ currentDropThreshold }}%</span>
                    - <span class="text-selling">{{ bot.config.profitMargin }}%</span>
                    {{ $t('common.selling') }}
                  </div>
                  <div
                    v-if="bot.config.priceDropThresholds && bot.config.priceDropThresholds.length > 0"
                    class="mb-2"
                  >
                    <BotDropProfileTable
                      :bot="bot"
                      :next-selling-transaction="nextSellingTransaction"
                    />
                  </div>
                  <div
                    v-if="bot.config.minWorkingPrice || bot.config.maxWorkingPrice"
                  >
                    {{ $t('components.bot.buyingRange') }}
                    {{ $t('common.from') }} <span class="font-weight-bold text-purchase">{{ bot.config.minWorkingPrice || $t('common.anyPrice') }}</span>
                    {{ $t('common.to') }} <span class="font-weight-bold text-purchase">{{ bot.config.maxWorkingPrice || $t('common.anyPrice') }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          md="4"
        >
          <v-card
            height="100%"
          >
            <v-card-title class="bg-blue-grey-darken-4">
              <v-row class="ma-0">
                <span v-if="mdAndUp">{{ $t('common.status') }}</span>
                <v-spacer v-if="mdAndUp" />
                <template v-if="!bot.hasStarted">
                  <v-icon
                    class="mr-1 mt-1"
                    color="error"
                    icon="mdi-stop-circle"
                    size="x-small"
                  />
                  <span
                    class="text-error text-body-2"
                    style="padding-top: 6px;"
                  >{{ $t('components.bot.notStarted') }}</span>
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="ml-2"
                    @click="startBot"
                  >
                    {{ $t('buttons.start') }}
                  </v-btn>
                </template>

                <template v-else>
                  <v-icon 
                    v-if="bot.isPaused"
                    class="mr-1 mt-1"
                    color="warning"
                    icon="mdi-pause-box"
                    size="x-small"
                  />
                  <v-icon 
                    v-else
                    class="mr-1 mt-1"
                    color="primary"
                    icon="mdi-play-box"
                    size="x-small"
                  />
                  <span
                    v-if="mdAndUp"
                    :class="bot.isPaused ? 'text-warning' : 'text-primary'"
                    class="text-body-2"
                    style="padding-top: 6px;"
                  >{{ bot.isPaused ? $t('components.bot.paused') : $t('components.bot.running') }}</span>
                  <v-spacer />
                  <v-btn
                    v-if="bot.isPaused"
                    size="small"
                    variant="outlined"
                    color="primary"
                    @click="resumeBot"
                  >
                    {{ $t('buttons.resume') }}
                  </v-btn>
                  <v-btn
                    v-else
                    size="small"
                    color="warning"
                    variant="outlined"
                    @click="pauseBot"
                  >
                    {{ $t('buttons.pause') }}
                  </v-btn>
                </template>

                <v-btn
                  v-if="main.isAdmin"
                  size="small"
                  color="admin"
                  variant="outlined"
                  class="ml-2"
                  @click="getLogs"
                >
                  {{ $t('buttons.logs') }}
                </v-btn>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      size="small"
                      variant="outlined"
                      class="ml-2"
                      :color="unsoldTransactions.length > 0 ? 'warning' : 'error'"
                      v-bind="tooltipProps"
                      @click="showConfirmDeletionDialog = true"
                    >
                      <v-icon size="large">
                        mdi-delete-forever
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('buttons.delete') }}
                </v-tooltip>
              </v-row>
            </v-card-title>
            <v-card-text class="px-2">
              <v-container
                fluid
                class="ma-0 py-0"
              >
                <v-row
                  dense
                  class="my-1"
                >
                  <v-col cols="12">
                    <div class="d-flex">
                      <div
                        class="text-body-1 mt-1 pl-1"
                      >
                        {{ $t('components.bot.freePositions') }} <span :class="bot.freePositions > 0 ? 'text-purchase' : 'text-error'">
                          {{ bot.freePositions }}
                        </span>
                      </div>
                      <v-spacer />
                      <div class="text-body-1 mt-1 pr-1">
                        {{ $t('components.bot.cycles') }} {{ mdAndUp ? bot.cycles : cycles }}
                      </div>
                    </div>
                  </v-col>
                </v-row>

                <v-row
                  dense
                  :class="mdAndUp ? 'mt-2' : 'mt-4'"
                >
                  <BotCursor
                    v-if="nextPurchasePrice && nextSellingTransaction?.targetPrice"
                    :bot="bot"
                    :dense="!mdAndUp"
                    :next-selling-transaction="nextSellingTransaction"
                  />
                  <div
                    v-else
                    class="ml-2 text-body-1"
                  >
                    <div>
                      {{ $t('components.bot.nextPurchase') }} <v-icon
                        v-if="bot.freePositions <= 0"
                        color="error"
                      >
                        mdi-cancel
                      </v-icon>
                    </div>
                    <div>{{ main.jsRound(nextPurchasePrice) }}</div>
                  </div>
                </v-row>
              </v-container>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          v-if="showBitcoin && mdAndUp"
          cols="12"
          md="4"
        >
          <div
            :style="{ height: `calc(100dvh - ${mdAndUp ? 446 : 420}px)` }"
          >
            <TradingView
              :key="main.lang"
              :pair="`BTC${main.exchangeAsset}`"
              :lang="main.lang"
            />
          </div>
        </v-col>

        <v-col
          cols="12"
          :md="showBitcoin ? 4 : 8"
        > 
          <v-card>
            <v-card-title class="bg-blue-grey-darken-4">
              <v-row class="ma-0">
                <div v-if="mdAndUp">
                  <v-icon>mdi-swap-horizontal</v-icon> {{ bot.totalTransactions }}
                </div>
                <div v-else>
                  {{ bot.totalTransactions }}
                </div>
                <v-spacer />
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      variant="outlined"
                      :disabled="positivePurchases.length === 0"
                      size="small"
                      color="selling"
                      class="ml-4"
                      v-bind="tooltipProps"
                      @click="sellAllPositive"
                    >
                      <v-icon size="x-large">
                        mdi-cash-multiple
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('components.bot.sellAllPositive') }}
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      variant="outlined"
                      size="small"
                      :disabled="isBusy || bot.isPaused || (!bot.config.simulation && (bot.config.maxInvestment / bot.config.maxPositions + (bot.usdtBoost || 0)) > main.usdBalance)"
                      :color="bot.freePositions > 0 ? 'purchase' : 'warning'"
                      class="ml-2"
                      v-bind="tooltipProps"
                      @click="buyNow()"
                    >
                      <v-icon size="large">
                        mdi-credit-card-outline
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('components.bot.buyNow') }}
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      variant="outlined"
                      size="small"
                      :color="bot.freePositions > 0 ? 'purchase' : 'warning'"
                      class="ml-2"
                      v-bind="tooltipProps"
                      @click.stop="showBuyDialog = true"
                    >
                      <v-icon size="large">
                        mdi-credit-card-edit-outline
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('components.bot.buyCustomAmount') }}
                </v-tooltip>
                <v-btn
                  color="primary"
                  :disabled="selectedRows.length === 0"
                  class="ml-2"
                  variant="outlined"
                  size="small"
                >
                  <v-icon>mdi-dots-horizontal</v-icon>
                  <v-menu activator="parent">
                    <v-list
                      density="compact"
                      class="bg-grey-darken-3"
                    >
                      <v-list-item>
                        <v-tooltip
                          location="bottom"
                          content-class="text-caption"
                        >
                          <template #activator="{ props: tooltipProps }">
                            <v-btn
                              variant="outlined"
                              size="x-small"
                              color="warning"
                              v-bind="tooltipProps"
                              @click="pauseSelectedRows"
                            >
                              <v-icon size="medium">
                                mdi-pause
                              </v-icon>
                            </v-btn>
                          </template>
                          {{ $t('buttons.pause') }}
                        </v-tooltip>
                      </v-list-item>
                      <v-list-item>
                        <v-tooltip
                          location="bottom"
                          content-class="text-caption"
                        >
                          <template #activator="{ props: tooltipProps }">
                            <v-btn
                              class="ma-0 px-1 mr-1"
                              variant="outlined"
                              size="x-small"
                              color="purchase"
                              v-bind="tooltipProps"
                              @click="unpauseSelectedRows"
                            >
                              <v-icon size="medium">
                                mdi-play
                              </v-icon>
                            </v-btn>
                          </template>
                          {{ $t('buttons.resume') }}
                        </v-tooltip>
                      </v-list-item>
                      <v-list-item>
                        <v-tooltip
                          location="bottom"
                          content-class="text-caption"
                        >
                          <template #activator="{ props: tooltipProps }">
                            <v-btn
                              class="ma-0 px-1 mr-1"
                              variant="outlined"
                              size="x-small"
                              color="error"
                              v-bind="tooltipProps"
                              @click="killSelectedRows"
                            >
                              <v-icon size="medium">
                                mdi-delete
                              </v-icon>
                            </v-btn>
                          </template>
                          {{ $t('buttons.delete') }}
                        </v-tooltip>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-btn>

                <v-btn
                  v-if="mdAndUp && bot.config.symbol !== `BTC${main.exchangeAsset}`"
                  variant="outlined"
                  size="small"
                  :color="showBitcoin ? 'primary' : 'primaryDark'"
                  class="ml-2"
                  @click="showBitcoin = !showBitcoin"
                >
                  BTC
                </v-btn>

                <div
                  v-show="showBuyDialog"
                  class="bg-grey-darken-3"
                  style="position: absolute; width: 250px; height: 48px; top: 0px; right: 0; z-index: 10; border: 1px solid #01bc8d; padding-top: 5px;"
                  @click.stop="$event.stopPropagation()"
                >
                  <input
                    v-model="buyUsd"
                    class="ml-2 text-body-1 px-1 bg-grey-darken-2"
                    style="width: 87px;"
                  >
                  <span class="text-body-1 ml-2 pt-1">{{ main.exchangeAsset }}</span>
                  <v-btn 
                    variant="outlined"
                    class="ml-2"
                    :disabled="buyUsd <= 0 || buyUsd > main.usdBalance"
                    color="primary"
                    size="small"
                    @click.stop="buyNow(parseFloat(buyUsd)); showBuyDialog = false"
                  >
                    OK
                  </v-btn>
                  <v-icon
                    color="error"
                    size="large"
                    class="ml-1"
                    @click.stop="showBuyDialog = false"
                  >
                    mdi-close-box-outline
                  </v-icon>
                </div>
              </v-row>
            </v-card-title>
            <v-card-text class="my-0 pt-0 pb-1">
              <v-row
                v-if="mdAndUp"
                class="mx-1 pt-2 my-0 text-body-1"
              >
                {{ $t('components.bot.usdUnsold', { asset: main.exchangeAsset }) }} {{ usdUnsold }}
                <v-spacer />
                {{ $t('components.bot.cryptoBought') }} {{ cryptoBought }}
              </v-row>
              <v-row class="mx-1 pt-2 my-0 text-body-1">
                <v-tooltip
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      class="mr-1 clickable"
                      :color="transactionFilter || 'grey'"
                      v-bind="tooltipProps"
                      @click="transactionFilter = transactionFilter === null ? 'purchase' : transactionFilter === 'selling' ? null : 'selling'"
                    >
                      {{ transactionFilter ? 'mdi-filter' : 'mdi-filter-outline' }}
                    </v-icon>
                  </template>
                  {{ $t('pages.app.filterType') }}
                </v-tooltip>
                {{ $t(`common.${(transactionFilter || 'all').replace('purchase', 'unsold')}`, filteredTransactions.length) }}{{ $t('common.:') }} {{ filteredTransactions.length }}
                <v-spacer />
                {{ $t('components.bot.unrealized') }} {{ main.usdtRound(unrealizedPnl) }} <span v-if="mdAndUp">&nbsp;{{ main.exchangeAsset }}</span>
              </v-row>
              <TransactionList
                :bot="bot"
                :fee="bot.config.fee ? bot.config.fee / 100 : main.kucoinFee" 
                :transactions="filteredTransactions"
                :highlighted-transaction-ids="[nextSellingTransaction?._id]"
                :dense="!mdAndUp || showBitcoin"
                :reset-selected-rows="resetSelectedRows"
                @update-selected-rows="selectedRows = $event"
              />
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          md="4"
        >
          <div
            :style="{ height: `calc(100dvh - ${mdAndUp ? 446 : 420}px)` }"
          >
            <TradingView
              :key="componentKey + main.lang"
              :pair="bot.config.symbol"
              :lang="main.lang"
              :exchange="bot.config.exchange"
            />
          </div>
        </v-col>
      </v-row>
    </v-container>

    <ConfirmationPopup
      v-if="showConfirmDeletionDialog"
      @cancel="showConfirmDeletionDialog = false"
      @confirm="deleteBot"
    >
      {{ $t('components.bot.deletionConfirmation') }}
    </ConfirmationPopup>

    <v-dialog
      v-model="showConfigEditionDialog"
      max-width="820"
    >
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          {{ $t('components.bot.editConfigTitle') }}
        </v-card-title>

        <v-card-text class="mb-0 pr-4">
          <div style="padding-right: 8px; max-height: calc(100dvh - 240px); overflow-y: auto;">
            <BotConfig
              v-model="editedConfig"
              is-edition
              :bot="bot"
              :next-selling-transaction="nextSellingTransaction"
              @valid="isValidConfig = true"
              @invalid="isValidConfig = false"
            />
          </div>
        </v-card-text>
        <v-card-actions class="justify-center mt-0 mb-2">
          <v-btn
            color="error"
            variant="outlined"
            @click="showConfigEditionDialog = false"
          >
            {{ $t('buttons.cancel') }}
          </v-btn>
          <v-btn
            :disabled="!isValidConfig"
            color="primary"
            variant="outlined"
            @click="saveConfig"
          >
            {{ $t('buttons.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showLogsDialog"
      max-width="calc(100vw - 16px)"
    >
      <LogList
        title="Logs"
        :logs="logs"
        height="calc(100vh - 230px)"
      >
        <v-icon
          color="error"
          class="mt-1"
          @click="showLogsDialog = false"
        >
          mdi-close-box-outline
        </v-icon>
      </LogList>
    </v-dialog>
    
    <Teleport
      v-if="!mdAndUp"
      to="#bot-cursor-slot"
    >
      <BotCursor
        v-if="nextPurchasePrice && nextSellingTransaction?.targetPrice"
        :bot="bot"
        dense
        hide-details
        :next-selling-transaction="nextSellingTransaction"
      />
    </Teleport>
  </template>
</template>

<script setup>
import { watch, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import botService from '@services/bot.service'
import transactionService from '@services/transaction.service'
import { useMainStore } from '@/store'
import BotPositionSlider from './BotPositionSlider.vue'

const main = useMainStore()
const { mdAndUp } = useDisplay()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const bot = ref()
const componentKey = ref(0) // to force re-rendering of the TradingView chart when the pair changes
const logs = ref([])
const showLogsDialog = ref(false)
const transactionFilter = ref(null)
const interval = ref()
const showConfirmDeletionDialog = ref(false)
const showConfigEditionDialog = ref(false)
const editedConfig = ref()
const isValidConfig = ref(true)
const showBitcoin = ref(true)
const showBuyDialog = ref(false)
const buyUsd = ref(0)
const selectedRows = ref([])
const resetSelectedRows = ref(false) // flip-flop

watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.id) {
      loadBot()
    }
  },
  { deep: true }
)

onMounted(async () => {
  if (!route.query?.id) return
  loadBot().then(() => {
    interval.value = setInterval(() => {
      loadBot(false)
    }, bot.value.config.botInterval * 1000)
  })
})

onUnmounted(() => {
  clearInterval(interval.value)
})

const cycles = computed(() => {
  if (!bot.value) return 0
  if (bot.value.cycles < 1000) return bot.value.cycles
  if (bot.value.cycles >= 1000 && bot.value.cycles < 1000000) {
    return `${Math.floor(bot.value.cycles / 100) / 10}K`
  }
  return `${Math.floor(bot.value.cycles / 100000 / 10)}M`
})

const botNews = computed(() => (symbol) => {
  const pattern = `\\b${symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}\\b`
  const flags = 'gi'
  const regex = new RegExp(pattern, flags)
  return main.news.filter(n => regex.test(n.annTitle)).length
})

const currentDropThreshold = computed(() => {
  if (!bot.value) return 0
  // Support both legacy single threshold and new threshold array
  if (
    bot.value.config.priceDropThresholds &&
    Array.isArray(bot.value.config.priceDropThresholds)
    && bot.value.config.priceDropThresholds.length > 0
  ) {
    const index = Math.min(
      bot.value.currentThresholdIndex || 0,
      bot.value.config.priceDropThresholds.length - 1
    )
    return bot.value.config.priceDropThresholds[index]
  }
  // Legacy: use single priceDropThreshold
  return bot.value.config.priceDropThreshold
})

const nextSellingTransaction = computed(() =>{
  return main.botTransactions(route.query.id).filter((t) => t.targetPrice && !t.isSold && !t.isPaused)
    .sort((a, b) => a.targetPrice - b.targetPrice)[0]
})

const nextPurchasePrice = computed(() => {
  return bot.value.lastHighestPrice * (1 - currentDropThreshold.value / 100)
})

const filteredTransactions = computed(() => main.botTransactions(route.query.id).filter((t) => transactionFilter.value === null
  || transactionFilter.value === 'purchase' && (t.targetPrice && !t.isSold)
  || transactionFilter.value === 'selling' && (!t.targetPrice)
))

const unrealizedPnl = computed(() => {
  return unsoldTransactions.value.reduce((acc, cur) => {
    return acc + getProfit(cur)
  }, 0)
})

const unsoldTransactions = computed(() => main.botTransactions(route.query.id).filter((t) => t.targetPrice && !t.isSold))

const usdUnsold = computed(() => {
  return main.usdtRound(unsoldTransactions.value.reduce((acc, cur) => {
    return acc + cur.total
  }, 0))
})

const cryptoBought = computed(() => {
  return main.jsRound(unsoldTransactions.value.reduce((acc, cur) => {
    return acc + cur.amount
  }, 0))
})

const positivePurchases = computed(() => unsoldTransactions.value.filter((t) => {
  const profit = getProfit(t)
    return profit > 0
  })
)

const symbolClass = computed(() => {
  if (!bot.value || !bot.value.config?.fee ) return '?'
  return bot.value.config.fee <= 0.1 ? 'A' : bot.value.config.fee >= 0.3 ? 'C' : 'B'
})

const getProfit = (t) => t.paid
  ? (bot.value.currentPrice * t.amount * (1 - main.kucoinFee) - (t.paid + t.fee))
  : // legacy
  (bot.value.currentPrice - t.price) * t.amount

const loadBot = (updateTradingView = true) => {
  if (!route.query.id) return
  return botService
    .getBotById(route.query.id)
    .then((response) => {
      const oldBuyUsd = bot.value ? 1 * main.usdtRound(bot.value.config.maxInvestment / bot.value.config.maxPositions) : 0
      bot.value = response
      const newBuyUsd = 1 * main.usdtRound(bot.value.config.maxInvestment / bot.value.config.maxPositions)
      if (oldBuyUsd !== newBuyUsd) {
        buyUsd.value = newBuyUsd
      }
      if (updateTradingView) {
        showBitcoin.value = bot.value.config.symbol !== `BTC${main.exchangeAsset}`
        componentKey.value += 1
      }
    })
}

const goToBot = (n) => {
  const currentBotIndex = main.bots.findIndex((b) => b._id === bot.value._id)
  let newBotIndex = currentBotIndex + n
  if (newBotIndex < 0) newBotIndex = main.bots.length - 1
  else if (newBotIndex >= main.bots.length) newBotIndex = 0
  const id = main.bots[newBotIndex]._id
  router.push({ path: '/bots', query: { id } })
}

const startBot = () => {
  botService.startBot(bot.value._id).then((res) => {
    if (bot.value._id == res._id) bot.value.hasStarted = res.hasStarted
  })
}

const pauseBot = () => {
  botService.pauseBot(bot.value._id).then((res) => {
    if (bot.value._id == res._id) bot.value.isPaused = res.isPaused
    main.updateGlobalPauseState()
  })
}

const resumeBot = () => {
  botService.resumeBot(bot.value._id).then((res) => {
    if (bot.value._id == res._id) bot.value.isPaused = res.isPaused
    main.updateGlobalPauseState()
  })
}

const toggleCryptoConvert = () => {
  botService.toggleCryptoConvert(bot.value._id, bot.value.config.convertProfitToCrypto).then((res) => {
    bot.value = res
  })
}

const toggleProfitReuse = () => {
  botService.toggleProfitReuse(bot.value._id, bot.value.config.reuseProfit).then((res) => {
    bot.value = res
  })
}

const toggleStopBuyingOnDrop = () => {
  botService.toggleStopBuyingOnDrop(bot.value._id, !bot.value.stopBuyingOnDrop).then((res) => {
    bot.value = res
  })
}

const toggleStopBuyingOnRebuy = () => {
  botService.toggleStopBuyingOnRebuy(bot.value._id, !bot.value.stopBuyingOnRebuy).then((res) => {
    bot.value = res
  })
}

const sellAllPositive = () => {
  botService.sellAllPositive(bot.value._id).then(() => {
    main.getBalances()
    main.getTotalProfits()
  })
}

const deleteBot = () => {
  botService.deleteBot(bot.value._id).then(() => {
    router.push('/bots')
  })
}

const editConfig = () => {
  editedConfig.value = bot.value.config
  showConfigEditionDialog.value = true
}

const saveConfig = () => {
  showConfigEditionDialog.value = false
  botService.updateConfig(bot.value._id, editedConfig.value).then((response) => {
    bot.value = response
    main.$patch({ snackbar: { show: true, color: 'success', text: t('components.bot.configSaved'), timeout: 5000 } })
  }).catch((err) => {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || t('components.bot.saveFailed') } })
  })
}

const buyNow = (usd = null) => {
  botService.buyNow(bot.value.id, usd).then(() => {
    main.getBalances()
  })
}

const goToNews = (symbol) => {
  router.push(`/news?search=${symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), '')}&caseSensitive=true&entireWord=true`)
}

const getLogs = () => {
  botService.getLogs(bot.value._id).then((res) => {
    logs.value = res
    showLogsDialog.value = true
  })
}

const pauseRow = (id) => {
  return transactionService.pausePurchase(id).then(() => {
    main.getBotTransactions(bot.value._id)
  })
}

const unpauseRow = (id) => {
  return transactionService.unpausePurchase(id).then(() => {
    main.getBotTransactions(bot.value._id)
  })
}

const killRow = (id) => {
  return transactionService.killPurchase(id).then(() => {
    main.getBotTransactions(bot.value._id)
  })
}

const pauseSelectedRows = () => {
  Promise.all(selectedRows.value.map((id) => pauseRow(id))).then(() => {
    selectedRows.value = []
    resetSelectedRows.value = !resetSelectedRows.value
    main.getBotTransactions(bot.value._id)
  })
}

const unpauseSelectedRows = () => {
  Promise.all(selectedRows.value.map((id) => unpauseRow(id)
  )).then(() => {
    selectedRows.value = []
    resetSelectedRows.value = !resetSelectedRows.value
    main.getBotTransactions(bot.value._id)
  })
}

const killSelectedRows = () => {
  Promise.all(selectedRows.value.map((id) => killRow(id))).then(() => {
    selectedRows.value = []
    resetSelectedRows.value = !resetSelectedRows.value
    main.getBotTransactions(bot.value._id)
  })
}
</script>
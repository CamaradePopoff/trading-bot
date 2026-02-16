<template>
  <tr 
    :class="[props.bot.config.simulation ? 'bg-simulationDark' : 'bg-blue-grey-darken-4', mdAndUp ? '' : 'text-caption']"
    class="bot-row"
  >
    <td v-if="mdAndUp">
      <BotActions
        :bot="props.bot"
        compact
        transparent
      />
    </td>
    <td
      v-else
      class="px-2"
    >
      <span :class="bot.config.simulation ? 'text-simulation' : ''">{{ bot.config.label || `(${bot.config.symbol})` }}</span>
    </td>

    <td
      v-if="mdAndUp"
      width="10%"
      class="pt-1"
    >
      <BotPositionSlider
        :bot="props.bot"
        hide-details
      />
    </td>
    <td
      v-if="mdAndUp"
      class="px-1 text-body-2"
      style="text-align: center;"
    >
      <span :class="props.bot.freePositions > 0 ? 'text-primary' : 'text-error'">
        {{ props.bot.freePositions }}
      </span>
      / {{ props.bot.config.maxPositions }}
    </td>
    <td
      v-if="mdAndUp"
      width="8%"
      class="px-1"
      style="text-align: center;"
    >
      <MiniChart
        :chart-key="`${props.bot.config.exchange}:${props.bot.config.symbol}`"
        :price="props.bot.currentPrice"
        :height="28"
        :max-points="180"
      />
    </td>
    <td
      v-if="mdAndUp"
      width="250"
    >
      <BotTradingActions
        ref="botTradingActionsRef"
        :bot="props.bot"
        transparent
        :next-selling-transaction="nextSellingTransaction"
        :is-busy="isBusy"
        @check-selling="checkSelling"
        @sell-now="sellNow"
        @buy-now="buyNow"
      />
    </td>
    <td v-else>
      <div
        class="d-flex font-weight-bold px-3 py-1"
      >
        <template v-if="nextSellingTransaction">
          <v-icon
            class="mr-1"
            size="small"
            color="purchase"
            style="margin-top: 2px;"
          >
            mdi-timer-sand
          </v-icon>
          <div :class="nextSellingTransaction.profit > 0 ? 'text-primary' : 'text-error'">
            <v-tooltip
              location="bottom"
              class="text-body-2"
            >
              <span v-if="nextSellingTransaction.profit > 0">+</span>{{ main.jsRound(nextSellingTransaction.profit) }}
              <template #activator="{ props: pps1 }">
                <span v-bind="pps1">
                  <span v-if="nextSellingTransaction.profit > 0">+</span>{{ main.usdtRound(nextSellingTransaction.profit) }}
                </span>
              </template>
            </v-tooltip>
          </div>
        </template>
        <template v-else>
          <v-icon
            class="mr-1"
            size="small"
            color="grey"
            style="margin-top: 2px;"
          >
            mdi-timer-sand
          </v-icon>
          <span
            class="text-grey"
          >{{ $t('components.bot.noNextSellingShort') }}</span>
        </template>
      </div>
    </td>
    <td :width="mdAndUp ? '22%' : '18%'">
      <div :style="mdAndUp ? 'margin: 0 0 -22px 0' : 'margin: 0 0 -22px 4px'">
        <BotCursor
          :bot="props.bot"
          dense
          hide-thumb
          :hide-details="!mdAndUp"
          :next-selling-transaction="nextSellingTransaction"
        />
      </div>
    </td>
    <td
      v-if="mdAndUp"
      style="text-align: right;"
    >
      <span
        class="px-2"
        :class="props.bot.config.simulation ? 'text-simulation' : 'text-primary'"
      >{{ main.usdtRound(props.bot.totalProfit) }}</span>
    </td>
    <td
      v-if="mdAndUp"
      style="text-align: right;"
    >
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <span
            class="px-2"
            :class="props.bot.config.simulation ? 'text-simulation' : 'text-primary'"
            v-bind="tooltipProps"
          >{{ main.jsRound(props.bot.totalProfitCrypto) }}</span>
        </template>
        {{ main.usdtRound(props.bot.totalProfitCrypto * props.bot.currentPrice) }} {{ main.exchangeAsset }}
      </v-tooltip>
    </td>
    <td
      :style="{ textAlign: 'center', width: mdAndUp ? '68px' : '50px' }"
    >
      <v-icon
        style="margin-top: -4px;"
        :size="mdAndUp ? 20 : 16"
        color="primary"
        class="clickable mx-1"
        @click.stop="showConfigDialog = true"
      >
        mdi-cog-outline
      </v-icon>
      <v-icon
        style="margin-top: -4px;"
        :size="mdAndUp ? 20 : 16"
        color="primary"
        class="clickable mr-1"
        @click.stop="selectBot(props.bot)"
      >
        mdi-location-enter
      </v-icon>
    </td>
    <td style="text-align: center; width: 34px;">
      <v-checkbox
        v-model="isSelected"
        style="margin: -4px 0 -4px 3px;"
        color="primary"
        density="compact"
        hide-details
        @update:model-value="handleCheckboxChange"
      />
    </td>
  </tr>

  <ConfirmationPopup
    v-if="showConfirmNegativeSellingDialog"
    @cancel="showConfirmNegativeSellingDialog = false; candidateSellingId = null"
    @confirm="showConfirmNegativeSellingDialog = false; sellNow()"
  >
    {{ $t('components.transactionList.confirmNegativeSelling') }}
  </ConfirmationPopup>

  <!-- Bot Config Dialog -->
  <v-dialog
    v-model="showConfigDialog"
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
            :bot="props.bot"
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
          @click="showConfigDialog = false"
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
</template>


<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import botService from '@services/bot.service'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'
import BotPositionSlider from '@components/BotPositionSlider.vue'
import BotActions from '@components/BotActions.vue'
import BotConfig from '@components/BotConfig.vue'
import MiniChart from '@components/MiniChart.vue'

const router = useRouter()
const { mdAndUp } = useDisplay()
const main = useMainStore()
const { t } = useI18n()

const isSelected = ref(false)
const showConfirmNegativeSellingDialog = ref(false)
const isBusy = ref(false)
const showChart = ref(false)
const buyUsd = ref(0)
const showConfigDialog = ref(false)
const editedConfig = ref()
const isValidConfig = ref(true)

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'unselect'])

watch(() => props.selected, (newVal) => {
  isSelected.value = newVal
}, { immediate: true })

const nextSellingTransaction = computed(() => {
  return main.nextSellingWithProfit(props.bot)
})

watch(showConfigDialog, (newVal) => {
  if (newVal) {
    editedConfig.value = props.bot.config
  }
})

watch(() => main.showAllCharts, (newVal) => {
  showChart.value = newVal
})

onMounted(() => {
  buyUsd.value = 1 * main.usdtRound(props.bot.config.maxInvestment / props.bot.config.maxPositions)
})

const checkSelling = () => {
  if (nextSellingTransaction.value.profit < 0) {
    showConfirmNegativeSellingDialog.value = true
  } else {
    sellNow()
  }
}

const sellNow = async () => {
  if (!nextSellingTransaction.value) return
  isBusy.value = true
  try {
    await botService.sellNow(props.bot._id, nextSellingTransaction.value._id)
  } catch (err) {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || t('components.bot.sellFailed') } })
  } finally {
    isBusy.value = false
  }
}

const buyNow = async (usd = null) => {
  isBusy.value = true
  try {
    await botService.buyNow(props.bot._id, usd)
  } catch (err) {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || t('components.bot.buyFailed') } })
  } finally {
    isBusy.value = false
  }
}

const selectBot = (bot) => {
  router.push({ path: '/bots', query: { id: bot._id } })
}

const handleCheckboxChange = () => {
  if (isSelected.value) {
    emit('select', props.bot)
  } else {
    emit('unselect', props.bot)
  }
}

const saveConfig = () => {
  showConfigDialog.value = false
  botService.updateConfig(props.bot._id, editedConfig.value).then((response) => {
    // Emit an update event so parent can refresh if needed
    if (response) {
      main.$patch({ snackbar: { show: true, color: 'success', text: t('components.bot.configSaved') } })
    }
  }).catch((err) => {
    main.$patch({ snackbar: { show: true, color: 'error', text: err.message || t('components.bot.saveFailed') } })
  })
}
</script>

<style scoped>
  tr.bot-row:hover {
    filter: brightness(1.5);
    transition: filter 0.2s ease;
  }

  td {
    vertical-align: middle;
    border: 1px solid #666;
  }
</style>
<template>
  <v-container
    v-if="!props.dense"
    fluid
    class="ma-0 pa-0"
  >
    <v-row
      dense
      class="px-2 mt-2 pt-0 mb-0"
    >
      <v-col cols="1">
        {{ $t('common.date') }}
      </v-col>
      <v-col cols="2">
        {{ $t('common.price') }}
      </v-col>
      <v-col cols="1">
        {{ $t('common.amount') }}
      </v-col>
      <v-col cols="1">
        {{ $t('common.total') }}
      </v-col>
      <v-col cols="1">
        {{ $t('common.margin') }}
      </v-col>
      <v-col cols="2">
        {{ $t('components.transactionList.targetPrice') }}
      </v-col>
      <v-col cols="1">
        {{ $t('common.profit') }}
      </v-col>
      <v-col cols="1">
        {{ $t('components.transactionList.crypto') }}
      </v-col>
      <v-col cols="1">
        {{ $t('common.status') }}
      </v-col>
      <v-col cols="1">
        {{ $t('components.transactionList.actions') }}
      </v-col>
    </v-row>

    <v-row class="my-0">
      <v-col
        cols="12"
        class="mb-0 pb-2"
      >
        <div style="height: calc(100dvh - 619px); overflow-y: auto; overflow-x: hidden;">
          <v-row
            v-for="(item, index) in items"
            :key="index"
            dense
            class="px-2 clickable mt-1"
            :class="[!item.targetPrice ? 'text-selling' : item.targetPrice && !item.isSold ? 'text-purchase' : 'text-purchaseDark',
                     highlightedRows.includes(item._id) ? 'bg-grey-darken-3' : '',
                     item.isNext ? 'font-weight-bold' : '']"
            @click="highlightRow(item)"
          >
            <v-col cols="1">
              <v-tooltip class="text-body-2">
                {{ main.formatDate($t, item.createdAt) }}
                <template #activator="{ props: pps }">
                  <span v-bind="pps">{{ main.shortDate(item.createdAt) }}</span>
                </template>
              </v-tooltip>
            </v-col>
            <v-col cols="2">
              <v-tooltip class="text-body-2">
                {{ item.price }}
                <template #activator="{ props: pps }">
                  <span v-bind="pps">{{ main.jsRound(item.price) }}</span>
                </template>
              </v-tooltip>
            </v-col>
            <v-col cols="1">
              <v-tooltip class="text-body-2">
                {{ item.amount }}
                <template #activator="{ props: pps }">
                  <span v-bind="pps">{{ main.jsRound(item.amount) }}</span>
                </template>
              </v-tooltip>
            </v-col>
            <v-col cols="1">
              <v-tooltip class="text-body-2">
                <div>{{ item.targetPrice ? $t('common.bought') : $t('common.sold') }}{{ $t('common.:') }} {{ main.jsRound(item.total) }} {{ main.exchangeAsset }}</div>
                <div>{{ $t('common.fee') }}{{ $t('common.:') }} {{ main.jsRound(item.fee || item.total * main.kucoinFee) }} {{ main.exchangeAsset }}</div>
                <template #activator="{ props: pps }">
                  <span v-bind="pps">{{ main.usdtRound(item.total) }}</span>
                </template>
              </v-tooltip>
            </v-col>
            <v-col cols="1">
              <div v-if="item.profitMargin">
                {{ main.jsRound(item.profitMargin * 100) }}%
                <v-tooltip
                  v-if="!item.isSold && !item.buyPrice"
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      class="clickable ml-1"
                      size="x-small"
                      v-bind="tooltipProps"
                      @click="newProfitMargin = main.jsRound(item.profitMargin * 100); selectedTransaction = item; showPurchaseMarginDialog = true"
                    >
                      mdi-pencil
                    </v-icon>
                  </template>
                  {{ $t('buttons.edit') }}
                </v-tooltip>
              </div>
            </v-col>
            <v-col cols="2">
              <v-tooltip
                v-if="item.targetPrice"
                class="text-body-2"
              >
                {{ item.targetPrice }}
                <template #activator="{ props: pps }">
                  <span v-bind="pps">{{ main.jsRound(item.targetPrice) }}</span>
                </template>
              </v-tooltip>
            </v-col>
            <v-col
              cols="1"
            >
              <v-tooltip
                v-if="item.profit"
                location="top"
              >
                <template #activator="{ props: pps611 }">
                  <span v-bind="pps611">{{ main.usdtRound(item.profit) }}</span>
                </template>
                <span>{{ $t('components.transactionList.profit') }} {{ item.profit }} {{ main.exchangeAsset }}</span>
              </v-tooltip>
            </v-col>
            <v-col cols="1">
              <v-tooltip
                v-if="item.profitAsCrypto"
                location="top"
              >
                <template #activator="{ props: tps }">
                  <span v-bind="tps">
                    {{ main.jsRound(item.profitAsCrypto) }}
                  </span>
                </template>
                <span>{{ $t('components.transactionList.profit') }} {{ main.usdtRound(item.profitAsCrypto * bot.currentPrice) }} {{ main.exchangeAsset }}</span>
              </v-tooltip>
            </v-col>
            <v-col cols="1">
              <v-icon
                v-if="item.isEmergency"
                color="emergency"
              >
                mdi-flash-outline
              </v-icon>
              <v-icon
                v-if="item.isForced"
              >
                mdi-account-outline
              </v-icon>
              <v-icon
                v-if="item.isSold"
                :class="item.isForced ? '' : 'ml-5'"
              >
                mdi-check
              </v-icon>
              <v-icon
                v-if="item.isNext"
                :class="item.isForced ? '' : 'ml-5'"
              >
                mdi-timer-sand
              </v-icon>
              <v-icon
                v-if="!item.isSold && item.isPaused"
                color="warning"
              >
                mdi-pause
              </v-icon>
            </v-col>
            <v-col cols="1">
              <v-tooltip
                v-if="item.targetPrice && item.profit !== undefined && !item.isSold"
                location="bottom"
                content-class="text-caption"
              >
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    class="ma-0 px-1"
                    variant="outlined"
                    size="x-small"
                    :disabled="item.isBusy"
                    :color="item.profit >= 0 ? 'selling' : 'error'"
                    v-bind="tooltipProps"
                    @click="checkSelling(item)"
                  >
                    <v-icon size="x-large">
                      mdi-cash
                    </v-icon>
                  </v-btn>
                </template>
                {{ $t('components.bot.sellNow') }}
              </v-tooltip>
              <input
                v-if="item.targetPrice && item.profit !== undefined && !item.isSold"
                :checked="selectedRows.includes(item._id)"
                type="checkbox"
                class="ml-2"
                :disabled="item.isBusy"
                @change="updateSelectedRows(item._id)"
              >
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <v-container
    v-else
    fluid
    class="ma-0 pa-0"
  >
    <v-row class="my-0">
      <v-col cols="12">
        <div :style="{ height: `calc(100dvh - ${mdAndUp ? 587 : 510}px)`, 'overflow-y': 'auto', 'overflow-x': 'hidden' }">
          <div
            v-for="(item, index) in items"
            :key="index"
            dense
            class="px-2 py-1 mb-2 clickable"
            :style="{ width: 'calc(100% - 8px)', border: '1px solid', borderColor: item.isEmergency ? '#FFC107' : 'grey', borderRadius: '4px' }"
            :class="[!item.targetPrice ? 'text-selling' : item.targetPrice && !item.isSold ? 'text-purchase' : 'text-purchaseDark',
                     highlightedRows.includes(item._id) ? 'bg-grey-darken-3' : '',
                     item.isNext ? 'font-weight-bold' : '']"
            @click="highlightRow(item)"
          >
            <div class="d-flex">
              <v-icon
                v-if="item.isEmergency"
                color="emergency"
              >
                mdi-flash-outline
              </v-icon>
              {{ mdAndUp ? main.formatDate($t, item.createdAt) : main.shortDate(item.createdAt) }}
              <v-spacer />
              <div>
                <v-icon
                  v-if="item.isForced"
                >
                  mdi-account-outline
                </v-icon>
                <v-icon
                  v-if="item.isSold"
                  :class="item.isForced ? '' : 'ml-5'"
                >
                  mdi-check
                </v-icon>
                <v-icon
                  v-if="item.isNext"
                  :class="item.isForced ? '' : 'ml-5'"
                >
                  mdi-timer-sand
                </v-icon>
                <v-icon
                  v-if="!item.isSold && item.isPaused"
                  color="warning"
                >
                  mdi-pause
                </v-icon>
                <v-tooltip
                  v-if="item.targetPrice && item.profit !== undefined && !item.isSold"
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      variant="outlined"
                      size="x-small"
                      class="ma-0 px-1 ml-2"
                      :disabled="item.isBusy"
                      :color="item.profit >= 0 ? 'selling' : 'error'"
                      v-bind="tooltipProps"
                      @click="checkSelling(item)"
                    >
                      <v-icon size="x-large">
                        mdi-cash
                      </v-icon>
                    </v-btn>
                  </template>
                  {{ $t('components.bot.sellNow') }}
                </v-tooltip>
                <input
                  v-if="item.targetPrice && item.profit !== undefined && !item.isSold"
                  :checked="selectedRows.includes(item._id)"
                  type="checkbox"
                  class="ml-2"
                  :disabled="item.isBusy"
                  @change="updateSelectedRows(item._id)"
                >
              </div>
            </div>
            <div>
              <span class="text-grey">{{ item.targetPrice ? $t('common.bought') : $t('common.sold') }}: </span>{{ item.amount }} <span class="text-grey px-1">x</span>
              {{ main.jsRound(item.price) }} <span class="text-grey px-1">=</span> {{ main.usdtRound(item.total) }}
            </div>
            <div class="d-flex">
              <div v-if="item.profitMargin">
                <span class="text-grey">{{ $t('common.margin') }}</span>
                {{ main.jsRound(item.profitMargin * 100) }}%
                <v-tooltip
                  v-if="!item.isSold && !item.buyPrice"
                  location="bottom"
                  content-class="text-caption"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      class="clickable ml-1"
                      size="x-small"
                      v-bind="tooltipProps"
                      @click="newProfitMargin = main.jsRound(item.profitMargin * 100); selectedTransaction = item; showPurchaseMarginDialog = true"
                    >
                      mdi-pencil
                    </v-icon>
                  </template>
                  {{ $t('buttons.edit') }}
                </v-tooltip>
              </div>
              <v-spacer />
              <div v-if="item.profit && item.buyPrice">
                <span class="text-grey">{{ $t('components.transactionList.profit') }}&nbsp;</span>
                <v-tooltip
                  location="bottom"
                  class="text-body-2"
                >
                  {{ item.profit }} {{ main.exchangeAsset }}
                  <template #activator="{ props: pps31 }">
                    <span
                      v-bind="pps31"
                    >{{ main.usdtRound(item.profit) }}</span>
                  </template>
                </v-tooltip>
              </div>
            </div>

            <div
              v-if="item.targetPrice"
              class="d-flex"
            >
              <div v-if="item.targetPrice">
                <span class="text-grey">{{ $t('components.transactionList.targetPriceColon') }}</span>
                {{ item.targetPrice ? main.jsRound(item.targetPrice) : '' }}
              </div>
              <v-spacer />
              <div v-if="item.profit">
                <span class="text-grey">{{ $t('components.transactionList.profit') }}&nbsp;</span>
                <v-tooltip location="top">
                  <template #activator="{ props: tps01 }">
                    <span v-bind="tps01">
                      {{ main.usdtRound(item.profit) }}
                    </span>
                  </template>
                  <span>{{ item.profit }} {{ main.exchangeAsset }}</span>
                </v-tooltip>
              </div>
            </div>
            <div
              v-if="item.profitAsCrypto"
              class="d-flex"
            >
              <v-spacer />
              <div>
                <span class="text-grey">{{ $t('components.transactionList.cryptoProfit') }}&nbsp;</span>
                <v-tooltip location="top">
                  <template #activator="{ props: tps }">
                    <span v-bind="tps">
                      {{ main.jsRound(item.profitAsCrypto) }}
                    </span>
                  </template>
                  <span>{{ main.usdtRound(item.profitAsCrypto * bot.currentPrice) }} {{ main.exchangeAsset }}</span>
                </v-tooltip>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>  
  </v-container>

  <ConfirmationPopup
    v-if="showConfirmNegativeSellingDialog"
    @cancel="showConfirmNegativeSellingDialog = false; candidateSellingId = null"
    @confirm="showConfirmNegativeSellingDialog = false; sellNow()"
  >
    {{ $t('components.transactionList.confirmNegativeSelling') }}
  </ConfirmationPopup>

  <v-dialog
    v-model="showPurchaseMarginDialog"
    width="500"
  >
    <v-card v-if="selectedTransaction">
      <v-card-title class="text-h5 grey lighten-2">
        {{ $t('components.transactionList.setNewMargin') }}
      </v-card-title>

      <v-card-text>
        <v-row
          dense
          class="py-0 my-0"
        >
          <v-col cols="6">
            <v-text-field
              :model-value="main.jsRound(selectedTransaction.profitMargin * 100)"
              :label="$t('components.transactionList.currentProfitMargin')"
              readonly
              disabled
              outlined
              dense
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="selectedTransaction.targetPrice"
              :label="$t('components.transactionList.currentSellingPrice')"
              readonly
              disabled
              outlined
              dense
            />
          </v-col>
        </v-row>
        <v-row
          dense
          justify="center"
          class="py-0 my-0 mb-5"
        >
          <v-col
            cols="12"
            align="center"
          >
            <v-icon
              color="primary"
              size="large"
            >
              mdi-arrow-down-bold-outline
            </v-icon>
          </v-col>
        </v-row>
        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="newProfitMargin"
              :label="$t('components.transactionList.newProfitMargin')"
              type="number"
              min="0"
              max="100"
              step="0.1"
              outlined
              dense
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              :model-value="main.jsRound(
                (selectedTransaction.paid ? selectedTransaction.paid + selectedTransaction.fee : selectedTransaction.amount * selectedTransaction.price)
                  * (1 + props.fee) * (1 + newProfitMargin / 100) / selectedTransaction.amount)"
              :label="$t('components.transactionList.newSellingPrice') "
              readonly
              disabled
              outlined
              dense
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="justify-center pt-0 pb-2 my-0">
        <v-btn
          color="error"
          variant="outlined"
          @click="selectedTransaction = null; showPurchaseMarginDialog = false"
        >
          {{ $t('buttons.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          @click="setProfitMargin(selectedTransaction._id, newProfitMargin)"
        >
          {{ $t('buttons.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useMainStore } from '@/store'
import botService from '@services/bot.service'
import transactionService from '@services/transaction.service'
import { useDisplay } from 'vuetify'
import { useSnackbar } from '@/composables/useSnackbar'

const { mdAndUp } = useDisplay()
const main = useMainStore()
const { showError } = useSnackbar()
const selectedRows = ref([])

const props = defineProps({
  bot:  {
    type: Object,
    required: true
  },
  transactions: {
    type: Array,
    required: true
  },
  highlightedTransactionIds: {
    type: Array,
    default: () => []
  },
  fee: {
    type: Number,
    required: true
  },
  dense: {
    type: Boolean,
    default: false
  },
  resetSelectedRows: { // flip-flop to reset selected rows
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['updateSelectedRows']) 

const highlightedRows = ref([])
const selectedTransaction = ref(null)
const newProfitMargin = ref(0)
const showPurchaseMarginDialog = ref(false)
const candidateSellingId = ref(null)
const showConfirmNegativeSellingDialog = ref(false)

watch(
  () => props.resetSelectedRows,
  () => {
    console.log('Resetting selected rows')
      selectedRows.value = []
  }
)

watch(
  () => props.transactions,
  (newVal) => {
    if (highlightedRows.value.length === 1) {
      // Check if the missing associated row is in the new set of transactions so we can highlight it too
      const highlightedRowId = highlightedRows.value[0]
      const tr = newVal.find((t) => t._id === highlightedRowId)
      if (tr) {
        const associatedId = tr.associatedSelling || tr.associatedPurchase
        if (associatedId) {
          highlightedRows.value.push(associatedId)
        }
      }
    }
  },
  { deep: true }
)

const items = computed(() => {
  return props.transactions.map((transaction) => {
    return {
      ...transaction,
      isNext: props.highlightedTransactionIds.includes(transaction._id),
      isBusy: transaction._id === candidateSellingId.value,
        profit:
            transaction.targetPrice && !transaction.isSold && props.bot.currentPrice
              ? transaction.paid
                ? main.jsRound(
                    props.bot.currentPrice *
                      transaction.amount *
                      (1 - props.bot.config.fee / 100) -
                      (transaction.paid + transaction.fee)
                  )
                : main.jsRound(
                    // legacy
                    (props.bot.currentPrice - transaction.price) * transaction.amount
                  )
              : transaction.profit
    }
  })
})

const highlightRow = (item) => {
  const associatedId = item.associatedSelling || item.associatedPurchase
  if (highlightedRows.value.includes(item._id)||highlightedRows.value.includes(associatedId)) {
    highlightedRows.value = []
  } else {
  highlightedRows.value = [item._id]
  if (associatedId) highlightedRows.value.push(associatedId)
  }
}

const setProfitMargin = (purchaseId, margin) => {
  transactionService.setPurchaseMargin(purchaseId, main.jsRound(margin / 100), props.fee).then(() => {
    selectedTransaction.value = null
    showPurchaseMarginDialog.value = false
    main.getBotTransactions(props.bot._id)
  })
}

const checkSelling = (item) => {
  candidateSellingId.value = item._id
  if (item.profit < 0) {
    showConfirmNegativeSellingDialog.value = true
  } else {
    sellNow()
  }
}

const sellNow = async () => {
  if (!candidateSellingId.value) return
  try {
    await botService.sellNow(props.bot.id, candidateSellingId.value)
    main.getBalances()
    main.getTotalProfits()
  } catch (err) {
    showError(err.message || 'Sell failed')
  }
}

const updateSelectedRows = (id) => {
  if (selectedRows.value.includes(id)) {
    selectedRows.value.splice(selectedRows.value.indexOf(id), 1)
  } else {
    selectedRows.value.push(id)
  }
  emit('updateSelectedRows', selectedRows.value)
}
</script>

<template>
  <tr 
    :class="props.bot.config.simulation ? 'bg-simulationDark' : 'bg-blue-grey-darken-4'"
    class="bot-row"
  >
    <td>
      <AdminBotActions
        :bot="props.bot"
        compact
        transparent
      />
    </td>
    <td
      width="14%"
      class="pt-1"
    >
      <BotPositionSlider
        :bot="props.bot"
        hide-details
      />
    </td>
    <td
      class="px-1 text-body-2"
      style="text-align: center;"
    >
      <span :class="props.bot.freePositions > 0 ? 'text-primary' : 'text-error'">
        {{ props.bot.freePositions }}
      </span>
      / {{ props.bot.config.maxPositions }}
    </td>
    <td width="120">
      <AdminBotTradingActions
        :bot="props.bot"
        transparent
        :next-selling-transaction="nextSellingTransaction"
      />
    </td>
    <td width="25%">
      <div style="margin: 0 0 -22px 0;">
        <BotCursor
          :bot="props.bot"
          dense
          hide-thumb
          :next-selling-transaction="nextSellingTransaction"
        />
      </div>
    </td>
    <td style="text-align: right;">
      <span
        class="px-2"
        :class="props.bot.config.simulation ? 'text-simulation' : 'text-primary'"
      >{{ main.usdtRound(props.bot.totalProfit) }}</span>
    </td>
    <td style="text-align: right;">
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
      style="text-align: center;"
    >
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            size="medium"
            :color="props.bot.hasStarted ? 'error' : 'primary'"
            class="clickable mr-1"
            @click.stop="toggleStartStop"
          >
            {{ props.bot.hasStarted ? 'mdi-stop' : 'mdi-play' }}
          </v-icon>
        </template>
        {{ props.bot.hasStarted ? $t('buttons.stop') : $t('buttons.start') }}
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            size="medium"
            :color="!props.bot.isPaused ? 'warning' : 'primary'"
            :disabled="!props.bot.hasStarted"
            class="clickable mr-1"
            @click.stop="togglePause"
          >
            {{ props.bot.isPaused ? 'mdi-play' : 'mdi-pause' }}
          </v-icon>
        </template>
        {{ props.bot.isPaused ? $t('buttons.resume') : $t('buttons.pause') }}
      </v-tooltip>
      <v-icon
        size="medium"
        color="primary"
        class="clickable mr-1"
        @click.stop="showConfigDialog = true"
      >
        mdi-cog-outline
      </v-icon>
      <v-icon
        size="medium"
        color="primary"
        class="clickable mr-1"
        @click.stop="getLogs"
      >
        mdi-text-box-outline
      </v-icon>
      <v-icon
        size="medium"
        color="error"
        class="clickable"
        @click.stop="showConfirmDeletionDialog = true"
      >
        mdi-delete-forever
      </v-icon>
    </td>
  </tr>

  <!-- Confirmation Dialog -->
  <ConfirmationPopup
    v-if="showConfirmDeletionDialog"
    @cancel="showConfirmDeletionDialog = false"
    @confirm="deleteBot"
  >
    {{ $t('components.bot.deletionConfirmation') }}
  </ConfirmationPopup>

  <!-- Bot Config Dialog -->
  <v-dialog
    v-model="showConfigDialog"
    max-width="800"
  >
    <v-card>
      <v-card-title class="text-h5 grey lighten-2">
        {{ $t('components.bot.viewConfigTitle') }}
      </v-card-title>

      <v-card-text class="mb-0 pr-4">
        <div style="padding-right: 8px; max-height: calc(100dvh - 240px); overflow-y: auto;">
          <BotConfig
            v-model="botConfig"
            is-edition
            readonly
            :bot="props.bot"
          />
        </div>
      </v-card-text>
      <v-card-actions class="justify-center mt-0 mb-2">
        <v-btn
          color="primary"
          variant="outlined"
          @click="showConfigDialog = false"
        >
          {{ $t('buttons.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Bot Logs Dialog -->
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
        mdi-close-circle
      </v-icon>
    </LogList>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/store'
import BotPositionSlider from '@components/BotPositionSlider.vue'
import BotCursor from '@components/BotCursor.vue'
import AdminBotActions from '@components/AdminBotActions.vue'
import AdminBotTradingActions from '@components/AdminBotTradingActions.vue'
import BotConfig from '@components/BotConfig.vue'
import LogList from '@components/LogList.vue'
import ConfirmationPopup from '@components/ConfirmationPopup.vue'
import botService from '@services/bot.service'

const main = useMainStore()
const showConfigDialog = ref(false)
const showLogsDialog = ref(false)
const showConfirmDeletionDialog = ref(false)
const logs = ref([])

const props = defineProps({
  bot: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['deleted', 'updated'])

const botConfig = computed(() => props.bot.config)

const nextSellingTransaction = computed(() => {
  return props.bot.nextSellingTransaction || null
})

const getLogs = () => {
  botService.getLogs(props.bot._id).then((res) => {
    logs.value = res
    showLogsDialog.value = true
  })
}

const togglePause = () => {
  if (props.bot.isPaused) {
    botService.resumeBot(props.bot._id).then(() => {
      emit('updated')
    })
  } else {
    botService.pauseBot(props.bot._id).then(() => {
      emit('updated')
    })
  }
}

const toggleStartStop = () => {
  if (props.bot.hasStarted) {
    // Stop the bot (sets hasStarted=false and isPaused=false)
    botService.stopBot(props.bot._id).then(() => {
      emit('updated')
    })
  } else {
    botService.startBot(props.bot._id).then(() => {
      emit('updated')
    })
  }
}

const deleteBot = () => {
  botService.deleteBot(props.bot._id).then(() => {
    showConfirmDeletionDialog.value = false
    emit('deleted', props.bot._id)
  })
}
</script>

<style scoped>
  tr.bot-row:hover {
    filter: brightness(1.2);
    transition: filter 0.2s ease;
  }

  td {
    vertical-align: middle;
    border: 1px solid #666;
  }
</style>

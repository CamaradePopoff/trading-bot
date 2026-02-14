<template>
  <div
    class="d-flex font-weight-bold px-3 py-1"
    :class="transparent ? '' : 'bg-grey-darken-3'"
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
      <v-spacer />
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
        v-if="props.transparent"
        class="text-grey"
      >{{ $t('components.bot.noNextSellingShort') }}</span>
      <span
        v-else
        class="text-grey"
      >{{ $t('components.bot.noNextSelling') }}</span>
      <v-spacer />
    </template>
  </div>
</template>

<script setup>
import { useMainStore } from '@/store'

const main = useMainStore()

const props = defineProps({
  bot: {
    type: Object,
    required: true
  },
  nextSellingTransaction: {
    type: Object,
    default: null
  },
  transparent: {
    type: Boolean,
    default: false
  }
})
</script>

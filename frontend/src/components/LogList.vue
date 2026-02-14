<template>
  <v-card>
    <v-card-title class="d-flex grey lighten-2">
      <span
        v-if="props.title"
        class="text-h5 mr-4"
      >{{ props.title }}</span>
      <v-select
        v-model="selectedLog"
        density="compact"
        variant="outlined"
        hide-details
        :max-width="200"
        :items="items"
      />
      <v-spacer class="ml-2" />
      <slot />
    </v-card-title>
    <v-card-text class="mb-0">
      <div
        :style="{ height: props.height, 'overflow-y': 'auto' }"
      >
        <div
          v-for="log in logsByTypeAndDate"
          :key="log"
        >
          <pre :class="logClass(log)">{{ log }}</pre>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  logs: {
    type: Object,
    required: true
  },
  height: {
    type: String,
    required: true
  }
})

onMounted(() => {
  selectedLog.value = items.value[0].value
})

const selectedLog = ref()

const items = computed(() => {
  return [
    ...Object.keys(props.logs.error).map(date => ({ value: { date, type: 'error' }, title: `Error - ${date}` })),
    ...Object.keys(props.logs.info).map(date => ({ value: { date, type: 'info' }, title: `Info - ${date}`}))
  ]
})

const logsByTypeAndDate = computed(() => {
  if (!selectedLog.value) return []
  return props.logs[selectedLog.value.type][selectedLog.value.date]
    .map((l) => l.replace(/^[0-9]{4}-[0-9]{2}-[0-9]{2} /, ''))
})

const logClass = (log) => {
  if (log.includes('Memory usage')) return 'text-grey'
  if (log.includes('ERROR')) return 'text-error'
  if (log.includes(' Sold ')) return 'text-selling'
  if (log.includes(' Bought ')) return 'text-purchase'
  if (log.includes(' restor')) return 'text-purple-lighten-2'
  if (log.includes('Starting trading bot')) return 'bg-green-lighten-2'
  if (log.includes('Bot resumed')) return 'bg-green-lighten-2'
  if (log.includes('Bot paused')) return 'bg-yellow'
  if (log.includes('CONFIG')) return 'text-yellow'
  return ''
}
</script>

<style scoped>
pre {
  white-space: pre-wrap;
}
</style>

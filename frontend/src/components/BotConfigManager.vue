<template>
  <v-dialog
    v-model="isOpen"
    max-width="800"
  >
    <v-card>
      <v-card-title class="d-flex text-h5 grey lighten-2">
        {{ $t('components.botConfigManager.title') }}
        <v-spacer />
        <v-icon
          color="error"
          class="mt-1"
          @click="close"
        >
          mdi-close-box-outline
        </v-icon>
      </v-card-title>

      <v-card-text class="mt-4">
        <v-tabs
          v-model="activeTab"
          color="primary"
        >
          <v-tab value="export">
            {{ $t('components.botConfigManager.export') }}
          </v-tab>
          <v-tab value="import">
            {{ $t('components.botConfigManager.import') }}
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <v-window-item value="export">
            <div class="mt-4">
              <div class="mb-3">
                <div class="d-flex mb-2">
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="text"
                    @click="selectAllBots"
                  >
                    {{ $t('components.botConfigManager.selectAll') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    @click="deselectAllBots"
                  >
                    {{ $t('components.botConfigManager.deselectAll') }}
                  </v-btn>
                </div>
                
                <div
                  style="max-height: calc(100dvh - 500px); overflow-y: auto;"
                  class="pa-2 border"
                >
                  <v-checkbox
                    v-for="bot in availableBots"
                    :key="bot._id"
                    v-model="selectedBotIds"
                    :value="bot._id"
                    :color="bot.config.simulation ? 'simulation' : 'primary'"
                    density="compact"
                    hide-details
                  >
                    <template #label>
                      <span
                        class="pl-1"
                        :class="bot.config.simulation ? 'text-simulation' : 'text-primary'"
                      >
                        {{ bot.config.label || bot.config.symbol }}
                      </span>
                    </template>
                  </v-checkbox>
                </div>
              </div>

              <v-alert
                v-if="exportError"
                type="error"
                class="mb-3"
              >
                {{ exportError }}
              </v-alert>

              <v-btn
                variant="outlined"
                color="primary"
                block
                :disabled="selectedBotIds.length === 0"
                @click="exportConfigs"
              >
                <v-icon class="mr-2">
                  mdi-download
                </v-icon>
                {{ $t('components.botConfigManager.downloadJson') }} ({{ selectedBotIds.length }})
              </v-btn>
            </div>
          </v-window-item>

          <v-window-item value="import">
            <div class="mt-4">
              <div v-if="!pendingImportConfigs.length">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json"
                  style="display: none"
                  @change="handleFileSelect"
                >
                <v-btn
                  variant="outlined"
                  color="primary"
                  block
                  @click="$refs.fileInput.click()"
                >
                  <v-icon class="mr-2">
                    mdi-upload
                  </v-icon>
                  {{ $t('components.botConfigManager.uploadJson') }}
                </v-btn>
              </div>

              <div
                v-else
                class="mb-3"
              >
                <div class="d-flex mb-2">
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="text"
                    @click="selectAllImportConfigs"
                  >
                    {{ $t('components.botConfigManager.selectAll') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    @click="deselectAllImportConfigs"
                  >
                    {{ $t('components.botConfigManager.deselectAll') }}
                  </v-btn>
                </div>
          
                <div
                  style="max-height: calc(100dvh - 500px); overflow-y: auto;"
                  class="pa-2 border"
                >
                  <v-checkbox
                    v-for="(config, index) in pendingImportConfigs"
                    :key="index"
                    v-model="selectedImportIndices"
                    :value="index"
                    :color="config.simulation ? 'simulation' : 'primary'"
                    density="compact"
                    hide-details
                  >
                    <template #label>
                      <span :class="config.simulation ? 'text-simulation' : 'text-primary'">
                        {{ config.label || config.symbol }}
                      </span>
                    </template>
                  </v-checkbox>
                </div>

                <v-alert
                  v-if="importError"
                  type="error"
                  class="mt-3"
                >
                  {{ importError }}
                </v-alert>

                <div class="d-flex mt-3">
                  <v-btn
                    variant="outlined"
                    color="primary"
                    :disabled="selectedImportIndices.length === 0"
                    @click="confirmImport"
                  >
                    {{ $t('components.botConfigManager.importSelected') }} ({{ selectedImportIndices.length }})
                  </v-btn>
                </div>
              </div>

              <v-alert
                v-if="importResults.length > 0"
                :type="importResults.some(r => !r.success) ? 'error' : 'success'"
                class="mt-4"
              >
                <div
                  v-for="(result, index) in importResults"
                  :key="index"
                >
                  {{ result.config }}: {{ result.success ? $t('common.success') : result.error }}
                </div>
              </v-alert>
            </div>
          </v-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-card-actions class="justify-center mb-2">
        <v-btn
          color="primary"
          variant="outlined"
          @click="close"
        >
          {{ $t('buttons.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMainStore } from '@/store'
import botService from '@/services/bot.service'

const main = useMainStore()

const isOpen = defineModel({ type: Boolean, default: false })
const fileInput = ref(null)
const importResults = ref([])
const selectedBotIds = ref([])
const exportError = ref(null)
const pendingImportConfigs = ref([])
const selectedImportIndices = ref([])
const importError = ref(null)
const activeTab = ref('export')

const currentExchange = computed(() => main.exchange)

const availableBots = computed(() => {
  return main.bots.filter(bot => 
    bot.config.exchange.toLowerCase() === currentExchange.value.toLowerCase()
  )
})

watch(isOpen, async (newValue) => {
  if (newValue) {
    // Load bots if the list is empty
    if (main.bots.length === 0) {
      await main.getBots()
    }
    // Select all bots by default when opening
    selectedBotIds.value = availableBots.value.map(bot => bot._id)
    exportError.value = null
  }
})

const selectAllBots = () => {
  selectedBotIds.value = availableBots.value.map(bot => bot._id)
}

const deselectAllBots = () => {
  selectedBotIds.value = []
}

const close = () => {
  pendingImportConfigs.value = []
  selectedImportIndices.value = []
  importError.value = null
  isOpen.value = false
  importResults.value = []
  exportError.value = null
}

const exportConfigs = async () => {
  exportError.value = null
  
  if (selectedBotIds.value.length === 0) {
    exportError.value = main.$t('components.botConfigManager.noBotsSelected')
    return
  }
  
  try {
    const configs = await botService.exportBotConfigs(currentExchange.value, selectedBotIds.value)
    const dataStr = JSON.stringify(configs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bot-configs-${currentExchange.value}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
    exportError.value = error.message
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const configs = JSON.parse(text)
    
    if (!Array.isArray(configs)) {
      throw new Error('Invalid JSON format. Expected an array of configurations.')
    }

    // Validate that all configs match the current exchange
    const invalidExchange = configs.find(
      (config) => config.exchange && config.exchange.toLowerCase() !== currentExchange.value.toLowerCase()
    )
    if (invalidExchange) {
      throw new Error(
        `Config mismatch: Expected exchange "${currentExchange.value.toLowerCase()}" but found "${invalidExchange.exchange}" in config.`
      )
    }

    // Store configs for selection and select all by default
    pendingImportConfigs.value = configs
    selectedImportIndices.value = configs.map((_, index) => index)
    importResults.value = []
    importError.value = null
  } catch (error) {
    console.error('Import failed:', error)
    importResults.value = [{
      success: false,
      config: 'Import',
      error: error.message
    }]
  }
  
  // Reset file input
  event.target.value = ''
}

const selectAllImportConfigs = () => {
  selectedImportIndices.value = pendingImportConfigs.value.map((_, index) => index)
}

const deselectAllImportConfigs = () => {
  selectedImportIndices.value = []
}

const confirmImport = async () => {
  importError.value = null
  
  if (selectedImportIndices.value.length === 0) {
    importError.value = main.$t('components.botConfigManager.noImportSelected')
    return
  }
  
  try {
    const selectedConfigs = selectedImportIndices.value.map(index => pendingImportConfigs.value[index])
    const results = await botService.importBotConfigs(currentExchange.value, selectedConfigs)
    importResults.value = results
    
    // Refresh bots list
    await main.getBots()
    
    // Clear pending imports
    pendingImportConfigs.value = []
    selectedImportIndices.value = []
  } catch (error) {
    console.error('Import failed:', error)
    importError.value = error.message
  }
  
  // Reset file input
  event.target.value = ''
}
</script>

<template>
  <PageHeader
    :title="$t('menus.admin.bots')"
    :loading="isLoading"
  />

  <v-container
    fluid
    class="my-0 pa-0 pt-4"
  >
    <v-row
      dense
      class="mx-4 mb-4"
    >
      <v-col
        cols="12"
        md="6"
      >
        <v-select
          v-model="selectedUserId"
          :items="userOptions"
          :label="$t('pages.admin.bots.selectUser')"
          item-title="text"
          item-value="value"
          variant="outlined"
          density="compact"
          @update:model-value="onUserChange"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-select
          v-model="selectedExchange"
          :items="exchangeOptions"
          :label="$t('pages.admin.bots.selectExchange')"
          :disabled="!selectedUserId || exchangeOptions.length === 0"
          variant="outlined"
          density="compact"
          @update:model-value="loadBots"
        />
      </v-col>
    </v-row>

    <v-row
      v-if="selectedUserId && selectedExchange && bots.length > 0"
      dense
      class="mx-4"
    >
      <v-col cols="12">
        <div class="mb-2 d-flex align-center">
          <v-icon
            class="mr-2"
            color="primary"
          >
            mdi-robot-outline
          </v-icon>
          <span class="text-h6">
            {{ selectedUserName }} - {{ selectedExchange }} ({{ bots.length }} {{ $t('pages.admin.bots.bots', bots.length) }})
          </span>
        </div>
        <table
          class="table table-striped table-hover w-100"
          style="border-collapse: collapse;"
        >
          <tbody>
            <AdminBotRow
              v-for="bot in bots"
              :key="bot._id"
              :bot="bot"
              @deleted="handleBotDeleted"
              @updated="loadBots"
            />
          </tbody>
        </table>
      </v-col>
    </v-row>

    <v-row
      v-else-if="selectedUserId && selectedExchange && bots.length === 0 && !isLoading"
      dense
      class="mx-4"
    >
      <v-col cols="12">
        <v-alert
          type="info"
          variant="tonal"
        >
          {{ $t('pages.admin.bots.noBots') }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row
      v-else-if="!selectedUserId"
      dense
      class="mx-4"
    >
      <v-col cols="12">
        <v-alert
          type="info"
          variant="tonal"
        >
          {{ $t('pages.admin.bots.selectUserFirst') }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '@/store'
import { useRouter } from 'vue-router'
import userService from '@services/user.service'
import botService from '@services/bot.service'
import AdminBotRow from '@/components/AdminBotRow.vue'

const main = useMainStore()
const router = useRouter()
const users = ref([])
const selectedUserId = ref(null)
const selectedExchange = ref(null)
const bots = ref([])
const isLoading = ref(false)
let pollingInterval = null

const userOptions = computed(() => {
  return users.value.map(user => ({
    text: user.username,
    value: user._id
  }))
})

const selectedUser = computed(() => {
  return users.value.find(u => u._id === selectedUserId.value)
})

const selectedUserName = computed(() => {
  return selectedUser.value?.username || ''
})

const exchangeOptions = computed(() => {
  if (!selectedUser.value || !selectedUser.value.exchanges) {
    return []
  }
  return selectedUser.value.exchanges.map(ex => ex.name)
})

const onUserChange = () => {
  selectedExchange.value = null
  bots.value = []
  stopPolling()
  
  // Auto-select first exchange if available
  if (exchangeOptions.value.length > 0) {
    selectedExchange.value = exchangeOptions.value[0]
    loadBots()
  }
}

const loadBots = async () => {
  if (!selectedUserId.value || !selectedExchange.value) {
    stopPolling()
    return
  }
  try {
    const response = await botService.getAdminBots(selectedUserId.value, selectedExchange.value.toLowerCase())
    bots.value = response || []
  } catch (error) {
    console.error('Failed to load bots:', error)
    bots.value = []
  }
  
  // Start polling after first successful load
  startPolling()
}

const startPolling = () => {
  stopPolling()
  pollingInterval = setInterval(() => {
    if (selectedUserId.value && selectedExchange.value) {
      loadBots()
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

const handleBotDeleted = (botId) => {
  bots.value = bots.value.filter(bot => bot._id !== botId)
}

onMounted(async () => {
  if (!main.adminMode) {
    router.replace('/home')
    return
  }
  
  isLoading.value = true
  try {
    const data = await userService.getAllUsers()
    users.value = data
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

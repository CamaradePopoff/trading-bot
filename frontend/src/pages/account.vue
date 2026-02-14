<template>
  <PageHeader
    :title="$t('menus.account')"
    :loading="isLoading"
  >
    <div
      v-if="user"
      class="mt-3 mr-2"
    >
      {{ $t('common.created') }} {{ main.formatDate($t, user.createdAt) }}
    </div>
  </PageHeader>

  <v-container
    fluid
    class="my-0 pa-0 pt-4 justify-center"
  >
    <v-row
      justify="center"
      dense
      class="mx-4"
    >
      <v-col cols="12">
        <v-card width="100%">
          <v-card-title class="text-h6">
            {{ $t('pages.account.personalInfo') }}
          </v-card-title>
          <v-card-text class="pa-0">
            <UserInfo
              v-if="user"
              v-model="user" 
              @valid="isValidUser = true"
              @invalid="isValidUser = false"
            >
              <v-col
                cols="12"
                md="3"
                class="d-flex mb-2"
                :class="mdAndUp ? 'mt-2' : ' mt-0 d-flex justify-center'"
              >
                <v-btn
                  :disabled="!isValidUser"
                  variant="outlined"
                  color="primary"
                  @click="saveAccount"
                >
                  {{ $t('buttons.save') }}
                </v-btn>
              </v-col>
            </UserInfo>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      justify="center"
      dense
      class="mx-4 mt-4"
    >
      <v-col cols="12">
        <v-card width="100%">
          <v-card-title class="text-h6">
            {{ $t('pages.account.exchanges') }}
          </v-card-title>
          <v-card-text class="pa-0">
            <v-alert
              v-if="serverIp"
              type="info"
              variant="tonal"
              class="ma-4 mb-2"
              icon="mdi-information-outline"
            >
              {{ $t('pages.account.ipWhitelistInfo', { ip: serverIp }) }}
            </v-alert>
            <v-container>
              <v-row :class="mdAndUp ? 'pb-2' : 'pb-1'">
                <v-col
                  v-for="(exchange, name) in main.openExchanges"
                  :key="name"
                  cols="12"
                  :class="mdAndUp ? 'py-1' : 'py-2'"
                >
                  <v-sheet class="bg-blue-grey-darken-4 pa-0">
                    <Exchange
                      v-model="main.exchanges[name]"
                      :disabled="exchange.disabled"
                      @valid="isValidExchange[name] = true"
                      @invalid="isValidExchange[name] = false"
                    >
                      <v-col
                        cols="12"
                        md="4"
                        class="d-flex mb-2"
                        :class="mdAndUp ? 'mt-2' : ' mt-0 d-flex justify-center'"
                      >
                        <v-btn
                          :disabled="!isValidExchange[exchange.name]"
                          variant="outlined"
                          color="primary"
                          @click="saveExchange(exchange)"
                        >
                          {{ $t('buttons.save') }}
                        </v-btn>
                        <v-btn
                          v-if="exchange.id"
                          variant="outlined"
                          class="ml-2"
                          color="error"
                          @click="deleteExchange(exchange)"
                        >
                          {{ $t('buttons.delete') }}
                        </v-btn>
                      </v-col>
                    </Exchange>
                  </v-sheet>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      justify="center"
      dense
      class="mx-4 mt-4"
    >
      <v-col cols="12">
        <v-card width="100%">
          <v-card-title class="text-h6">
            {{ $t('pages.account.botManagement') }}
          </v-card-title>
          <v-card-text :class="mdAndUp ? 'd-flex align-center justify-space-between' : ''">
            <div>
              {{ $t('pages.account.importExportDescription') }}
            </div>
            <v-btn
              variant="outlined"
              color="primary"
              :class="!mdAndUp ? 'mt-3' : ''"
              :block="!mdAndUp"
              @click="showBotConfigManager = true"
            >
              <v-icon class="mr-2">
                mdi-robot-outline
              </v-icon>
              {{ $t('components.botConfigManager.title') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <BotConfigManager v-model="showBotConfigManager" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useMainStore } from '@/store'
import userService from '@services/user.service'
import appService from '@services/app.service'
import { useDisplay } from 'vuetify'

const { mdAndUp } = useDisplay()
const main = useMainStore()

const isLoading = ref(false)
const user = ref()
const serverIp = ref(null)
const isValidUser = ref(false)
const isValidExchange = ref({
  KuCoin: false,
  Binance: false
})
const showBotConfigManager = ref(false)

onMounted(() => {
  isLoading.value = true
  userService.getMe().then((data) => {
    user.value = {
      createdAt: data.createdAt,
      username: data.username,
      password: null,
      confirmPassword: null
    }
    main.getExchanges().then(() => {
      isLoading.value = false
    })
  })
  
  // Récupérer l'IP du serveur
  appService.getServerIp().then((data) => {
    serverIp.value = data.ip
  }).catch((error) => {
    console.error('Failed to get server IP:', error)
  })
})

const saveAccount = () => {
  if (!isValidUser.value) return
  const u = {
    username: user.value.username,
    password: user.value.password,
  }
  userService.saveMe(u).then((data) => {
    user.value = {
      createdAt: data.createdAt,
      username: data.username,
      password: null,
      confirmPassword: null,
    }
    main.updateUser(data)
    user.value = data
  })
}

const saveExchange = (exchange) => {
  if (!isValidExchange.value[exchange.name]) return
  const exch = {
    name: exchange.name,
    apiKey: main.enc(exchange.apiKey),
    apiSecret: main.enc(exchange.apiSecret),
    apiPassphrase: main.enc(exchange.apiPassphrase)
  }
  userService.saveExchange(exch).then((data) => {
    main.exchanges[exchange.name].id = data._id
  })
}

const deleteExchange = (exchange) => {
  userService.deleteExchange(exchange.id).then(() => {
    main.exchanges[exchange.name].id = null
    main.exchanges[exchange.name].apiKey = null
    main.exchanges[exchange.name].apiSecret = null
    main.exchanges[exchange.name].apiPassphrase = null
  })
}
</script>
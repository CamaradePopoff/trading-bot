<template>
  <v-main>
    <CryptoSnowfall />
    <div>
      <v-container
        fluid
        class="mb-0"
      >
        <v-row>
          <v-col cols="12">
            <div
              class="d-flex justify-center align-center bg-transparent mb-1"
            >
              <v-icon
                color="primary"
                size="36"
                class="mr-2"
              >
                mdi-robot-angry
              </v-icon>
              <h2>{{ $t('common.welcomeTo') }}</h2>
              <BotBrand text />
            </div>
            <div
              class="d-flex justify-center align-center bg-transparent text-white"
              :class="mdAndUp ? 'mt-2 mb-4' : ''"
            >
              <h3>{{ $t('common.welcomeToSubtitle') }}</h3>
            </div>
            <div
              class="d-flex justify-center align-center flex-wrap ga-2"
              :class="mdAndUp ? 'my-2' : 'mt-2'"
            >
              <v-tooltip
                v-for="exchange in Object.keys(main.openExchanges)"
                :key="exchange"
                location="bottom"
              >
                <template #activator="{ props }">
                  <img
                    v-bind="props"
                    style="height: 32px"
                    :src="`/${main.exchanges[exchange]?.name?.toLowerCase()}.png`"
                    :alt="exchange"
                  >
                </template>
                <span>{{ main.exchanges[exchange]?.name || exchange }}</span>
              </v-tooltip>
            </div>
          </v-col>

          <v-col cols="12">
            <v-sheet
              class="d-flex justify-center align-center bg-transparent"
            >
              <v-card
                :width="mdAndUp ? 600 : 240"
                color="rgba(38, 50, 56, 0.85)"
                class="backdrop-blur glow-card"
              >
                <v-card-content>
                  <v-container class="ma-0 pa-0">
                    <v-row
                      dense
                      class="ma-0 pa-0"
                    >
                      <v-col
                        cols="12"
                        md="6"
                        class="ma-0 pa-0"
                      >
                        <div
                          class="robot"
                          :style="{ height: mdAndUp ? '300px' : '240px', width: mdAndUp ? '300px' : '240px' }"
                        />
                      </v-col>
                      <v-col
                        cols="12"
                        md="6"
                        class="ma-0 pa-0"
                      >
                        <v-sheet
                          class="mx-auto"
                          :width="mdAndUp ? 300 : 240"
                          color="transparent"
                        >
                          <v-form :width="mdAndUp ? 300 : 240">
                            <div class="ma-4">
                              <div
                                class="d-flex"
                                :class="mdAndUp ? 'mb-0' : 'mb-1'"
                              >
                                <!--v-spacer />
                            <router-link to="/register"
                              <v-icon color="primary">
                                mdi-account-plus-outline
                              </v-icon>
                            </router-link-->
                              </div>
                              <v-text-field
                                v-model="username"
                                :density="mdAndUp ? 'default' : 'compact'"
                                required
                                :label="$t('components.userInfo.username')"
                                variant="outlined"
                                hide-details
                                :class="mdAndUp ? 'mb-5' : 'mb-4'"
                              />
                              <v-text-field
                                v-model="password"
                                :density="mdAndUp ? 'default' : 'compact'"
                                :type="showPassword ? 'text' : 'password'"
                                required
                                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                                :label="$t('components.userInfo.password')"
                                variant="outlined"
                                hide-details
                                :class="mdAndUp ? 'mb-5' : 'mb-4'"
                                @click:append-inner="showPassword = !showPassword"
                              />

                              <v-select
                                v-model="chosenExchange"
                                :items="Object.keys(main.openExchanges)"
                                variant="outlined"
                                hide-details
                                :class="mdAndUp ? 'mb-5' : 'mb-4'"
                                :density="mdAndUp ? 'default' : 'compact'"
                                :label="$t('common.exchange')"
                              >
                                <template #selection="{ item }">
                                  <img
                                    style="height: 24px"
                                    class="mr-2"
                                    :src="`/${main.exchanges[item.value]?.name?.toLowerCase()}.png`"
                                    alt=""
                                  >
                                  {{ item.title }}
                                </template>
                              </v-select>

                              <v-btn
                                class="mt-0 mb-0"
                                color="primary"
                                variant="outlined"
                                block
                                :disabled="!username || !password || !chosenExchange || isLoading"
                                :loading="isLoading"
                                @click="login()"
                              >
                                {{ $t('buttons.submit') }}
                              </v-btn>
                            </div>
                          </v-form>
                        </v-sheet>
                      </v-col>
                    </v-row>
                  </v-container>
                </v-card-content>
                <div
                  v-if="errorMessage"
                  class="pa-3 bg-error text-white rounded"
                  style="width: 100%; max-width: 600px;"
                >
                  {{ errorMessage }}
                </div>
              </v-card>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-main>
</template>

<script setup>
import { ref, onMounted  } from 'vue'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'
import CryptoSnowfall from './CryptoSnowfall.vue'

const main = useMainStore()
const { mdAndUp } = useDisplay()
const username = ref()
const password = ref()
const showPassword = ref(false)
const chosenExchange = ref()
const isLoading = ref(false)
const errorMessage = ref(null)

onMounted(() => {
  const ex = localStorage.getItem('exchange') || Object.keys(main.openExchanges)[0]
  chosenExchange.value = main.exchangeByName(ex).name
})

const login = async () => {
  isLoading.value = true
  errorMessage.value = null
  
  main.exchange = chosenExchange.value.toLowerCase()
  const usernameValue = username.value
  const passwordValue = password.value
  
  main.login(usernameValue, passwordValue)
    .then((response) => {
      if (!response) {
        errorMessage.value = 'Invalid credentials'
        isLoading.value = false
        return null
      }
    })
    .then(() => {
      // Clear sensitive data from memory
      password.value = null
      username.value = null
    })
    .catch((error) => {
      console.error('Login error:', error)
      errorMessage.value = error?.message || 'Login failed. Please try again.'
      isLoading.value = false
      // Clear password on error
      password.value = null
    })
}
</script>

<style scoped>
.robot {
  background-image: url('/robot.jpg');
  background-size: contain;
  background-repeat: no-repeat;
  margin: 0 auto;
}

.backdrop-blur {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.glow-card {
  box-shadow: 
    0 0 10px rgba(var(--v-theme-primary), 0.5),
    0 0 20px rgba(var(--v-theme-primary), 0.3),
    0 0 30px rgba(var(--v-theme-primary), 0.1),
    inset 0 0 10px rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.4);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 
      0 0 10px rgba(var(--v-theme-primary), 0.5),
      0 0 20px rgba(var(--v-theme-primary), 0.3),
      0 0 30px rgba(var(--v-theme-primary), 0.1),
      inset 0 0 10px rgba(var(--v-theme-primary), 0.05);
  }
  50% {
    box-shadow: 
      0 0 15px rgba(var(--v-theme-primary), 0.7),
      0 0 30px rgba(var(--v-theme-primary), 0.4),
      0 0 45px rgba(var(--v-theme-primary), 0.15),
      inset 0 0 15px rgba(var(--v-theme-primary), 0.1);
  }
}
</style>

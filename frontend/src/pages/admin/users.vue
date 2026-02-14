<template>
  <PageHeader
    :title="$t('menus.admin.users')"
    :loading="isLoading"
  />

  <v-container
    fluid
    class="my-0 pa-0 pt-4"
  >
    <v-row
      dense
      class="mx-4"
    >
      <v-col cols="12">
        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-left">
                {{ $t('menus.admin.userCard.username') }}
              </th>
              <th class="text-left">
                {{ $t('menus.admin.userCard.permissions') }}
              </th>
              <th class="text-left">
                {{ $t('common.created') }}
              </th>
              <th class="text-left">
                {{ $t('menus.admin.userCard.lastConnection') }}
              </th>
              <th class="text-left">
                {{ $t('menus.admin.userCard.exchanges') }}
              </th>
              <th class="text-right">
                {{ $t('menus.admin.userCard.totalRealProfit') }}
              </th>
              <th class="text-right">
                {{ $t('menus.admin.userCard.totalSimulatedProfit') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user._id"
            >
              <td>
                <div class="d-flex align-center">
                  <v-icon
                    class="mr-2"
                    size="small"
                    :color="user.permissions.includes('admin') ? 'admin' : ''"
                  >
                    mdi-account
                  </v-icon>
                  <span :class="user.permissions.includes('admin') ? 'text-admin' : ''">
                    {{ user.username }}
                  </span>
                </div>
              </td>
              <td>
                <v-chip
                  v-for="permission in user.permissions"
                  :key="permission"
                  size="small"
                  class="mr-1"
                  :color="permission === 'admin' ? 'admin' : undefined"
                >
                  {{ permission }}
                </v-chip>
              </td>
              <td>
                {{ main.formatDate($t, user.createdAt) }}
              </td>
              <td>
                <span v-if="user.lastConnection">
                  {{ main.formatDate($t, user.lastConnection) }}
                </span>
                <span
                  v-else
                  class="text-grey"
                >
                  {{ $t('menus.admin.userCard.neverConnected') }}
                </span>
              </td>
              <td>
                <div
                  v-if="user.exchanges && user.exchanges.length > 0"
                  class="d-flex flex-wrap gap-2"
                >
                  <v-tooltip
                    v-for="(exchange, index) in user.exchanges"
                    :key="exchange._id"
                    location="bottom"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <div
                        v-bind="tooltipProps"
                        class="d-flex align-center gap-1"
                      >
                        <img
                          style="height: 20px"
                          :class="index > 0 ? 'ml-2' : ''"
                          :src="`/${exchange.name.toLowerCase()}.png`"
                          alt=""
                        >
                        <span class="text-caption px-1">
                          {{ exchange.botCount.normal }}
                        </span>
                        <span class="text-caption text-simulation px-1">
                          {{ exchange.botCount.simulation }}
                        </span>
                      </div>
                    </template>
                    {{ exchange.name }}
                  </v-tooltip>
                </div>
                <span
                  v-else
                  class="text-grey"
                >
                  -
                </span>
              </td>
              <td class="text-right">
                <div v-if="getTotalRealProfit(user).usd !== 0 || getTotalRealProfit(user).usdt !== 0">
                  <div class="d-flex align-center justify-end text-primary">
                    <v-icon
                      size="small"
                      class="mr-1"
                    >
                      mdi-currency-usd
                    </v-icon>
                    {{ main.usdtRound(getTotalRealProfit(user).usd) }} USD
                  </div>
                  <div class="d-flex align-center justify-end text-primary">
                    <v-icon
                      size="small"
                      class="mr-1"
                    >
                      mdi-currency-btc
                    </v-icon>
                    {{ main.usdtRound(getTotalRealProfit(user).usdt) }} USD
                  </div>
                </div>
                <span
                  v-else
                  class="text-grey"
                >
                  -
                </span>
              </td>
              <td class="text-right">
                <div v-if="getTotalSimulatedProfit(user).usd !== 0 || getTotalSimulatedProfit(user).usdt !== 0">
                  <div class="d-flex align-center justify-end text-simulation">
                    <v-icon
                      size="small"
                      class="mr-1"
                    >
                      mdi-currency-usd
                    </v-icon>
                    {{ main.usdtRound(getTotalSimulatedProfit(user).usd) }} USD
                  </div>
                  <div class="d-flex align-center justify-end text-simulation">
                    <v-icon
                      size="small"
                      class="mr-1"
                    >
                      mdi-currency-btc
                    </v-icon>
                    {{ main.usdtRound(getTotalSimulatedProfit(user).usdt) }} USD
                  </div>
                </div>
                <span
                  v-else
                  class="text-grey"
                >
                  -
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useMainStore } from '@/store'
import { useRouter } from 'vue-router'
import userService from '@services/user.service'

const main = useMainStore()
const router = useRouter()
const users = ref([])
const isLoading = ref(false)

const getTotalRealProfit = (user) => {
  if (!user.profits) return { usd: 0, usdt: 0 }
  return user.profits
    .filter(profit => !profit.simulation)
    .reduce((total, profit) => {
      return {
        usd: total.usd + (profit.usd || 0),
        usdt: total.usdt + (profit.usdt || 0)
      }
    }, { usd: 0, usdt: 0 })
}

const getTotalSimulatedProfit = (user) => {
  if (!user.profits) return { usd: 0, usdt: 0 }
  return user.profits
    .filter(profit => profit.simulation)
    .reduce((total, profit) => {
      return {
        usd: total.usd + (profit.usd || 0),
        usdt: total.usdt + (profit.usdt || 0)
      }
    }, { usd: 0, usdt: 0 })
}

onMounted(() => {
  if (!main.adminMode) {
    router.replace('/home')
    return
  }
  
  isLoading.value = true
  userService.getAllUsers().then((data) => {
    users.value = data
    isLoading.value = false
  }).catch((error) => {
    console.error('Failed to load users:', error)
    isLoading.value = false
  })
})
</script>

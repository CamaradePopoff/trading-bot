<template>
  <v-main>
    <div
      class="d-flex justify-center align-center bg-transparent"
      style="height: 74vh"
    >
      <v-card>
        <v-card-title class="bg-blue-grey-darken-4">
          <div
            class="d-flex align-center"
          >
            <BotBrand
              icon
              text
            />
            <h1 class="text-grey-darken-2 mx-4">
              |
            </h1>
            <span class="pt-1">{{ $t('components.register.newUser') }}</span>
          </div>
        </v-card-title>
        <v-card-text>
          <v-container fluid>
            <v-row
              dense
              class="justify-center mt-2"
            >
              <UserInfo
                v-model="user" 
                @valid="isValidUser = true"
                @invalid="isValidUser = false"
              />
            </v-row>
              
            <v-row class="justify-center my-0">
              <v-btn
                variant="outlined"
                color="error"
                class="mr-4"
                @click="router.go(-1)"
              >
                {{ $t('buttons.cancel') }}
              </v-btn>
              <v-btn
                :disabled="!isValidUser"
                variant="outlined"
                color="primary"
                @click="register"
              >
                {{ $t('buttons.register') }}
              </v-btn>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>
    </div>
  </v-main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/store'
import userService from '@services/user.service'

const main = useMainStore()
const router = useRouter()

const user = ref({
  username: null,
  password: null,
  confirmPassword: null
})
const isValidUser = ref(false)

const register = () => {
  const encodedUser =  {
    username: main.enc(user.value.username),
    password: main.enc(user.value.password)
  }
  userService.register(encodedUser).then(() => {
    router.push('/login')
  })
}
</script>

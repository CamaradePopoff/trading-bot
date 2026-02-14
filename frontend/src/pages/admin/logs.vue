<template>
  <PageHeader :title="$t('menus.logs')" />
  
  <v-container
    fluid
    class="mt-2 mb-0 pl-1 pr-0"
  >
    <v-row
      class="mx-2"
      justify="center"
    >
      <v-col cols="12">
        <LogList
          v-if="logs"
          :logs="logs"
          height="calc(100vh - 275px)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
  
<script setup>
import { ref, onMounted } from 'vue'
import appService from '@/services/app.service'

const logs = ref()

onMounted(() => {
  appService.getLogs().then((data) => {
    logs.value = data
  })
})
</script>

<template>
  <h2>Logout</h2>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMainStore } from '@/store'

const main = useMainStore()

onMounted(() => {
  main.logout()
})
</script>

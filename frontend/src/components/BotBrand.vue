<template>
  <v-icon
    v-if="props.icon"
    color="primary"
  >
    mdi-robot-angry
  </v-icon>
  <template v-if="props.text">
    <h1 class="ml-2 text-primary font-weight-bold">
      MCT
    </h1>
    <h1>Bot</h1>
  </template>
</template>

<script setup>
const props = defineProps({
  icon:  {
    type: Boolean,
    default: false
  },
  text: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
  h1 { font-size: 1.5rem; }
</style>
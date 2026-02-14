<template>
  <v-container
    fluid
    class="my-0 pb-2"
  >
    <v-row
      dense
      class="pl-4 py-0"
    >
      <h2 class="pt-1">
        {{ props.title }}
      </h2>
      <img
        v-if="props.loading"
        class="ml-2"
        src="/loading.gif"
        height="32"
        style="margin-top: 6px;"
      >
      <v-spacer />
      <slot />
    </v-row>
  </v-container>
</template>

<script setup>
    const props = defineProps({
      title: {
        type: String,
        required: true
      },
      loading: {
        type: Boolean,
        default: false
      }
    })
</script>

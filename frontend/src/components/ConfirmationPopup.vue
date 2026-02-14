<template>
  <v-dialog
    v-model="dialog"
    width="500"
    @after-leave="$emit('cancel')"
  >
    <v-card>
      <v-card-title class="text-h5 grey lighten-2">
        {{ $t('common.confirmation') }}
      </v-card-title>

      <v-card-text>
        <slot>{{ $t('common.areYouSure') }}</slot>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="error"
          variant="outlined"
          @click="dialog = false; emit('cancel')"
        >
          {{ $t('buttons.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          @click="dialog = false; emit('confirm')"
        >
          {{ $t('buttons.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'

const dialog = ref(true)
const emit = defineEmits(['cancel', 'confirm'])

</script>
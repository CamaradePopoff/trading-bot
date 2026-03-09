<template>
  <v-form v-if="localForm">
    <v-container>
      <v-row>
        <v-col
          cols="12"
          md="2"
        >
          <div class="d-flex ">
            <img
              style="height: 54px"
              :src="`/${localForm.name.toLowerCase()}.png`"
              alt=""
            >
            <div style="margin-top: -4px;">
              <div
                class="text-h6 pl-4"
                :class="props.disabled ? 'text-disabled' : ''"
              >
                {{ localForm.name }}
              </div>
              <v-chip
                class="ma-0 ml-4 pa-0 pr-3"
                size="24px"
              >
                <img
                  style="height: 24px;"
                  :src="`/${props.asset}.png`"
                  alt=""
                >
                <span class="pl-2">{{ props.asset }}</span>
              </v-chip>
            </div>
          </div>
        </v-col>
        <v-col
          cols="12"
          md="2"
        >
          <v-text-field
            v-model="localForm.apiKey"
            :disabled="props.disabled"
            hide-details
            :type="fieldTypes.apiKey"
            :label="$t('components.exchange.apiKey')"
            variant="outlined"
            :append-inner-icon="fieldTypes.apiKey === 'text' ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append-inner="toggleType('apiKey')"
          />
        </v-col>
    
        <v-col
          cols="12"
          md="2"
        >
          <v-text-field
            v-model="localForm.apiSecret"
            :disabled="props.disabled"
            hide-details
            :type="fieldTypes.apiSecret"
            :label="$t('components.exchange.apiSecret')"
            variant="outlined"
            :append-inner-icon="fieldTypes.apiSecret === 'text' ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append="toggleEye"
            @click:append-inner="toggleType('apiSecret')"
          />
        </v-col>
      
        <v-col
          cols="12"
          md="2"
        >
          <v-text-field
            v-model="localForm.apiPassphrase"
            :disabled="props.disabled"
            hide-details
            :type="fieldTypes.apiPassphrase"
            :label="$t('components.exchange.apiPassphrase')"
            variant="outlined"
            :append-inner-icon="fieldTypes.apiPassphrase === 'text' ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append-inner="toggleType('apiPassphrase')"
          />
        </v-col>

        <slot />
      </v-row>
    </v-container>
  </v-form>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  asset: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'valid', 'invalid'])

const localForm = ref()

const fieldTypes = ref({
  apiKey: 'password',
  apiSecret: 'password',
  apiPassphrase: 'password'
})

onMounted(() => {
  localForm.value = { ...props.modelValue }
})

watch(localForm, (newVal) => {
  emit('update:modelValue', newVal)
  emit(isValidExchange.value ? 'valid' : 'invalid')
}, { deep: true })

const toggleType = (fieldName) =>{
  fieldTypes.value[fieldName] = fieldTypes.value[fieldName] === 'text' ? 'password' : 'text'
}

const isValidExchange = computed(() => {
  return localForm.value.name &&
    localForm.value.apiKey &&
    localForm.value.apiSecret
})
</script>

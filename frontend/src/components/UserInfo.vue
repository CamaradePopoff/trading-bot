<template>
  <v-form v-if="localForm">
    <v-container class="pb-4">
      <v-row>
        <v-col
          cols="12"
          md="3"
        >
          <v-text-field
            v-model="localForm.username"
            hide-details
            :label="$t('components.userInfo.username')"
            variant="outlined"
          />
        </v-col>
      
        <v-col
          cols="12"
          md="3"
        >
          <v-text-field
            v-model="localForm.password"
            hide-details
            :type="fieldTypes.password"
            :label="$t('components.userInfo.password')"
            variant="outlined"
            :append-inner-icon="fieldTypes.password === 'text' ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append-inner="toggleType('password')"
          />
        </v-col>
      
        <v-col
          cols="12"
          md="3"
        >
          <v-text-field
            v-model="localForm.confirmPassword"
            hide-details
            :type="fieldTypes.confirmPassword"
            :label="$t('components.userInfo.confirmPassword')"
            variant="outlined"
            :append-inner-icon="fieldTypes.confirmPassword === 'text' ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append-inner="toggleType('confirmPassword')"
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
  }
})

const emit = defineEmits(['update:modelValue', 'valid', 'invalid'])

const localForm = ref()

const fieldTypes = ref({
  password: 'password',
  confirmPassword: 'password'
})


onMounted(() => {
  localForm.value = { ...props.modelValue }
})

watch(localForm, (newVal) => {
  emit('update:modelValue', newVal)
  emit(isValidUser.value ? 'valid' : 'invalid')
}, { deep: true })

const toggleType = (fieldName) =>{
  fieldTypes.value[fieldName] = fieldTypes.value[fieldName] === 'text' ? 'password' : 'text'
}

const isValidUser = computed(() => {
  return localForm.value.username &&
    !(localForm.value.username.length > 16 || localForm.value.username.length < 4) &&
    localForm.value.password &&
    localForm.value.confirmPassword &&   
    localForm.value.password === localForm.value.confirmPassword
})
</script>

<template>
  <PageHeader :title="'News (' + (filteredNews.length < main.news.length ? `${filteredNews.length} out of ` : '') + main.news.length + ')'">
    <div id="news-portal-md" />
  </PageHeader>

  <v-container
    v-if="!mdAndUp"
    fluid
    class="py-0"
  >
    <v-row
      dense
      class="mt-4 px-4"
    >
      <div id="news-portal-xs" />
    </v-row>
  </v-container>

  <Teleport :to="mdAndUp ? '#news-portal-md' : '#news-portal-xs'">
    <div 
      class="d-flex align-center"
      :style="{ width: mdAndUp ? '700px': '100%' }"
    >
      <v-row dense>
        <v-col
          cols="12"
          md="5"
        >
          <v-text-field
            v-model="search"
            hide-details
            clearable
            :label="$t('pages.news.search')"
            variant="outlined"
            density="compact"
            type="text"
            prepend-inner-icon="mdi-magnify"
            @update:model-value="updateQuery"
          />
        </v-col>
        <v-col
          cols="12"
          md="7"
          class="ma-0 pa-0"
          :align=" mdAndUp ? 'right' : 'center'"
        >
          <div
            class="d-flex align-start justify-start"
            :style="{ width: mdAndUp ? '420px' : '100%', 'margin-top': '-3px' }"
          >
            <v-checkbox
              v-model="caseSensitive"
              :label="$t('pages.news.caseSensitive')"
              hide-details
              class="ml-2"
              color="primary"
              @update:model-value="updateQuery"
            />
            <v-checkbox
              v-model="entireWord"
              :label="$t('pages.news.entireWord')"
              hide-details
              class="ml-2 mr-5"
              color="primary"
              @update:model-value="updateQuery"
            />
          </div>
        </v-col>
      </v-row>
    </div>
  </Teleport>
  
  <v-container
    fluid
    class="mt-2 mb-0 pl-1 pr-0"
  >
    <v-row
      class="mx-2"
      justify="center"
    >
      <v-col cols="12">
        <v-hover
          v-for="n in filteredNews"
          :key="n.annId"
          v-slot="{ isHovering, props: pps }"
        >
          <div
            v-bind="pps"
            :class="isHovering ? 'bg-blue-grey-darken-4 text-grey-lighten-3' : 'bg-grey-darken-4 text-grey-lighten-1'"
            class="text-body-1 clickable mb-2 px-4 py-2"
            style="border-radius: 6px;"
            @click="open(n.annUrl)"
          >
            <span class="text-primary">{{ main.formatDate($t, n.cTime).split(' ')[0].replace(currentYear, '') }}</span> - <span v-html="highlight(main.highlightBotSymbols(n.annTitle))" />
          </div>
        </v-hover>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '@/store'
import { useDisplay } from 'vuetify'

const route = useRoute()
const main = useMainStore()
const { mdAndUp } = useDisplay()

const search = ref()
const caseSensitive = ref(false)
const entireWord = ref(false)

const currentYear = '/' + new Date().getFullYear()

onMounted(() => {
  search.value = route.query.search || null
  caseSensitive.value = route.query.caseSensitive === 'true'
  entireWord.value = route.query.entireWord === 'true'
})

const filteredNews = computed(() => {
  if (!search.value || search.value.trim() === '') return main.news
  const pattern = entireWord.value ? `\\b${search.value}\\b` : search.value
  const flags = caseSensitive.value ? 'g' : 'gi'
  const regex = new RegExp(pattern, flags)
  return main.news.filter(n => regex.test(n.annTitle))
})

const open = (url) => {
  window.open(url, '_blank')
}

const updateQuery = () => {
  const url = new URL(window.location)
  url.searchParams.set('search', search.value)
  url.searchParams.set('caseSensitive', caseSensitive.value)
  url.searchParams.set('entireWord', entireWord.value)
  window.history.replaceState({}, '', url)
}

const highlight = (text) => {
  if (!search.value || search.value.trim() === '') return text
  const pattern = entireWord.value ? `\\b${search.value}\\b` : search.value
  const flags = caseSensitive.value ? 'g' : 'gi'
  const regex = new RegExp(pattern, flags)
  return text.replace(regex, match => `<span class="text-blue">${match}</span>`)
}
</script>

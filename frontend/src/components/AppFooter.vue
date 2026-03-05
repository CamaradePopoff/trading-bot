<template>
  <div class="mx-auto marquee">
    <span
      v-if="main.news.length > 0"
      class="marquee-content"
      :style="{ 'animation-duration': `${main.news.length * 10}s` }"
    >
      <v-hover
        v-for="n in main.news"
        :key="n"
        v-slot="{ isHovering, props: pps }"
      >
        <v-chip
          v-bind="pps"
          :class="isHovering ? 'bg-blue-grey-darken-4 text-grey-lighten-3' : 'text-grey-lighten-1'"
          class="text-body-1 clickable mr-2"
          @click="open(n.annUrl)"
        >
          <span class="text-primary">{{ main.formatDate($t, n.cTime).split(' ')[0].replace(currentYear, '') }}</span>
          &nbsp;-&nbsp;
          <span v-html="main.highlightBotSymbols(n.annTitle)" />
        </v-chip>
      </v-hover>
    </span>
    <div
      v-else
      class="text-grey-lighten-1 text-body-2"
    >
      {{ $t('common.noNewsAvailable') }}
    </div>
  </div>
</template>

<script setup>
import { useMainStore } from '@/store'

const main = useMainStore()

const currentYear = '/' + new Date().getFullYear()

const open = (url) => {
  window.open(url, '_blank')
}
</script>

<style scoped>
.marquee {
  white-space: nowrap;
  overflow: hidden;
  position: absolute;
  left: 4px;
  width: calc(100% - 50px);
}

.marquee-content {
  display: inline-block;
  animation: marquee linear infinite;
}

@keyframes marquee {
  from {
    transform: translateX(0%);
  }
  to {
    transform: translateX(-100%);
  }
}
</style>

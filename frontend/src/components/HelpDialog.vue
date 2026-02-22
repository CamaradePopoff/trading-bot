<template>
  <v-dialog
    v-model="isOpen"
    fullscreen
    :scrim="false"
    transition="dialog-bottom-transition"
  >
    <v-card
      class="d-flex flex-column"
      style="height: 100vh"
    >
      <v-card-title class="bg-blue-grey-darken-4 text-white d-flex justify-space-between align-center">
        <span>{{ $t('common.help') }} - {{ manualTitle }}</span>
        <v-icon
          size="large"
          class="clickable"
          @click="closeHelp"
        >
          mdi-close
        </v-icon>
      </v-card-title>

      <div
        ref="scrollContainer"
        class="flex-grow-1 overflow-auto pa-6"
        @click="handleLinkClick"
      >
        <div class="help-content">
          <!-- v-html is intentionally used here for rendering sanitized markdown content -->
          <!-- The content is from asciidoctor which sanitizes HTML -->
          <div
            v-html="renderedMarkdown"
          />
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/store'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const main = useMainStore()
const isOpen = ref(false)
const docContent = ref('')
const scrollContainer = ref(null)

marked.setOptions({
  gfm: true,
  breaks: true
})

const manualTitle = computed(() => {
  const titles = {
    en: 'User Manual - English',
    fr: 'Manuel d\'Utilisation - Français',
    es: 'Manual de Usuario - Español'
  }
  return titles[main.lang] || 'User Manual'
})

const renderedMarkdown = computed(() => {
  if (!docContent.value) return ''
  return DOMPurify.sanitize(marked.parse(docContent.value))
})

const isHtmlDocument = (text) => {
  const head = text.slice(0, 500).toLowerCase()
  return (
    head.includes('<!doctype html') ||
    head.includes('<html') ||
    head.includes('/@vite/client')
  )
}

const tryLoadDoc = async (url) => {
  const response = await fetch(url)
  if (!response.ok) return null

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const text = await response.text()

  if (contentType.includes('text/html') || isHtmlDocument(text)) {
    return null
  }

  return text
}

const openHelp = async () => {
  try {
    const lang = main.lang || 'en'

    const docUrls = [
      `/docs/${lang}.md`,
      '/docs/en.md'
    ]

    let loadedContent = null
    for (const url of docUrls) {
      loadedContent = await tryLoadDoc(url)
      if (loadedContent) break
    }

    if (!loadedContent) {
      throw new Error('No markdown help documentation file found.')
    }

    docContent.value = loadedContent
    isOpen.value = true
  } catch (error) {
    console.error('Failed to load help documentation:', error)
  }
}

const closeHelp = () => {
  isOpen.value = false
}

const handleLinkClick = (event) => {
  const target = event.target
  if (target.tagName === 'A' && target.href) {
    const href = target.getAttribute('href')
    if (href.startsWith('#')) {
      event.preventDefault()
      const elementId = href.slice(1)
      const element = scrollContainer.value?.querySelector(`[id="${elementId}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }
}

defineExpose({
  openHelp,
  closeHelp
})
</script>

<style>
.help-content {
  color: #bbb;
  width: 100%;
  max-width: 100%;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.7;
  font-size: 15px;
}

/* Headings */
.help-content h1,
.help-content h2,
.help-content h3,
.help-content h4,
.help-content h5,
.help-content h6 {
  color: #1976d2;
  font-weight: 600;
  margin: 30px 0 20px;
  letter-spacing: -0.5px;
}

.help-content h1 {
  font-size: 2.2em;
  border-bottom: 3px solid #42a5f5;
  padding-bottom: 15px;
  margin-top: 40px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.help-content h2 {
  font-size: 1.8em;
  border-left: 5px solid #42a5f5;
  background: linear-gradient(to right, #f0f7ff, transparent);
  padding: 12px 15px;
  margin-left: -15px;
}

.help-content h3 {
  font-size: 1.4em;
  color: #1976d2;
  border-bottom: 1px solid #e3f2fd;
  padding-bottom: 8px;
}

.help-content h4 {
  font-size: 1.15em;
  color: #1565c0;
}

.help-content h5,
.help-content h6 {
  font-size: 1.05em;
}

/* Text elements */
.help-content p {
  margin-bottom: 18px;
  line-height: 1.8;
}

.help-content strong {
  font-weight: 700;
  color: #fff;
}

.help-content em {
  font-style: italic;
  color: #555;
}

/* Lists */
.help-content ul,
.help-content ol,
.help-content .ulist > ul,
.help-content .olist > ol {
  margin-left: 40px;
  margin-bottom: 20px;
}

.help-content li {
  margin: 8px 0 12px;
  line-height: 1.8;
}

.help-content li > p {
  margin-bottom: 8px;
}

/* Definition lists */
.help-content .dlist {
  margin: 20px 0;
}

.help-content .dlist dt {
  font-weight: 600;
  color: #1565c0;
  margin-top: 12px;
  margin-bottom: 4px;
}

.help-content .dlist dd {
  margin-left: 30px;
  margin-bottom: 12px;
  line-height: 1.8;
}

/* Code */
.help-content code {
  background-color: #f5f5f5;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  color: #c41c3b;
  font-size: 0.95em;
  border: 1px solid #e0e0e0;
}

.help-content pre {
  background-color: #263238;
  color: #aed581;
  padding: 20px;
  border-radius: 6px;
  border-left: 4px solid #1976d2;
  overflow-x: auto;
  margin: 25px 0;
  line-height: 1.5;
  font-size: 0.93em;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.help-content pre code {
  background-color: transparent;
  color: #aed581;
  border: none;
  padding: 0;
  font-size: inherit;
}

/* Blockquotes & Admonitions */
.help-content blockquote {
  border-left: 5px solid #1976d2;
  padding: 15px 20px;
  margin: 25px 0;
  background-color: #f0f7ff;
  color: #1f2d3d;
  font-style: normal;
  border-radius: 4px;
}

.help-content blockquote p {
  margin-bottom: 0;
  color: inherit;
}

.help-content blockquote strong,
.help-content blockquote p strong,
.help-content blockquote li strong {
  color: #0d47a1;
}

.help-content blockquote code {
  color: #37474f;
  background-color: #e3f2fd;
  border-color: #bbdefb;
}

.help-content .admonitionblock {
  margin: 25px 0;
  padding: 0px;
  border-left: 5px solid #1976d2;
  background-color: #333;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.help-content .admonitionblock.warning {
  border-left-color: #ff9800;
  background-color: #fff3e055;
}

.help-content .admonitionblock.important {
  border-left-color: #d32f2f;
  background-color: #ffebee55;
}

.help-content .admonitionblock.tip {
  border-left-color: #388e3c;
  background-color: #e8f5e955;
}

.help-content .admonitionblock .icon {
  display: none;
}

.help-content .admonitionblock p {
  margin-bottom: 0;
}

.help-content .admonitionblock,
.help-content .admonitionblock p,
.help-content .admonitionblock li,
.help-content .admonitionblock strong {
  color: #eceff1;
}

/* Tables */
.help-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 25px 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}

.help-content th {
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  color: white;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  border: none;
}

.help-content td {
  border: 1px solid #ddd;
  padding: 12px 15px;
}

.help-content tr:nth-child(even) {
  background-color: #f9f9f9;
}

.help-content tbody tr:hover {
  background-color: #f0f7ff55;
  transition: background-color 0.2s ease;
}

/* Links */
.help-content a {
  color: #1976d2;
  font-weight: 500;
  text-decoration: none;
  border-bottom: 1px dotted transparent;
  transition: all 0.2s ease;
}

.help-content a:hover {
  color: #1565c0;
  text-decoration: underline;
  border-bottom-color: #1976d2;
}

/* Horizontal rules */
.help-content hr {
  border: none;
  border-top: 2px solid #e0e0e0;
  margin: 40px 0;
}

/* Listing block */
.help-content .listingblock {
  margin: 25px 0;
}

.help-content .listingblock .title {
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 8px;
  font-size: 0.95em;
}

/* Section bodies */
.help-content .sectionbody {
  margin-left: 0;
}

/* Paragraphs with titles */
.help-content .paragraph {
  margin-bottom: 18px;
}

.help-content .paragraph.title {
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 8px;
}

/* Images and figures */
.help-content .imageblock {
  margin: 25px 0;
  text-align: center;
}

.help-content .imageblock img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.help-content .imageblock .title {
  font-weight: 600;
  color: #1565c0;
  margin-top: 8px;
  font-size: 0.95em;
}

/* Sidebar */
.help-content .sidebar {
  margin: 25px 0;
  padding: 15px 20px;
  background-color: #f5f5f5;
  border-left: 5px solid #9c27b0;
  border-radius: 4px;
}

.help-content .sidebar .title {
  font-weight: 600;
  color: #6a1b9a;
  margin-bottom: 12px;
}

/* Utility classes */
.help-content > *:first-child {
  margin-top: 0;
}

.help-content > *:last-child {
  margin-bottom: 0;
}

/* Refinement for nested structures */
.help-content .dlist .dlist {
  margin-left: 20px;
}

.help-content .ulist .ulist,
.help-content .olist .olist {
  margin-top: 8px;
}
</style>

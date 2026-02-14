import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from '@i18n/en'
import es from '@i18n/es'
import fr from '@i18n/fr'

export const pinia = createPinia()

const i18n = createI18n({
  locale: navigator.language.substring(0, 2),
  fallbackLocale: 'en',
  messages: {
    en,
    es,
    fr
  }
})

export function registerPlugins(app) {
  return app.use(vuetify).use(router).use(pinia).use(i18n)
}

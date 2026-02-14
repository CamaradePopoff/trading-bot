import { registerPlugins } from '@/plugins'
import App from './App.vue'
import { createApp } from 'vue'
import 'vue-data-ui/style.css'
import { VueUi3dBar, VueUiDonutEvolution } from 'vue-data-ui'

const app = createApp(App)
registerPlugins(app)

app.component('VueUi3dBar', VueUi3dBar)
app.component('VueUiDonutEvolution', VueUiDonutEvolution)
app.mount('#app')

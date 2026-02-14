import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { VCheckbox } from 'vuetify/components/VCheckbox'

const myCustomTheme = {
  dark: true,
  colors: {
    primary: '#01bc8d',
    primaryDark: '#00796b',
    simulation: '#f48700',
    simulationDark: '#392d22',
    purchase: '#01bc8d',
    purchaseDark: '#00796b',
    selling: '#f13456',
    sellingDark: '#914b58',
    emergency: '#ffc107',
    admin: '#AD5BFF',
    surface: '#1c1c1c'
  }
}

export default createVuetify({
  components: {
    VCheckbox
  },
  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme
    }
  }
})

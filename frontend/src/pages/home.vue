<template>
  <PageHeader
    :title="$t('menus.home')"
    :loading="isLoading"
  >
    <v-switch
      v-model="profitsSimul"
      :label="$t('common.simulated')"
      hide-details
      class="mr-4"
      color="primary"
    />
  </PageHeader>

  <div
    class="d-flex justify-center"
  >
    <v-container
      fluid
      class="mx-6 my-0 pa-0"
    >
      <v-row
        justify="center"
      >
        <v-col
          cols="12"
          md="5"
        >
          <v-card>
            <v-card-text>
              <div style="width: 100%; height: calc(100dvh - 228px)">
                <VueUi3dBar
                  v-if="main.bots.length" 
                  :dataset="botsDataset"
                  :config="botsConfig"
                />
                <div
                  v-else
                  class="d-flex justify-center"
                >
                  <h2>{{ botsTitle }}: {{ $t('pages.home.noBots') }}</h2>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col
          cols="12"
          md="7"
        >
          <v-card>
            <v-card-text>
              <div style="width: 100%;height: calc(100dvh - 228px)">
                <VueUiDonutEvolution
                  v-if="profitsDataset && profitsDataset.length"
                  :dataset="profitsDataset"
                  :config="profitsConfig"
                />
                <div
                  v-else
                  class="d-flex justify-center"
                >
                  <h2>{{ profitsTitle }}: no data</h2>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import userService from '@services/user.service'
import { useMainStore } from '@/store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const main = useMainStore()

const isLoading = ref(false)
const dailyProfits = ref([])
const dailyProfitsSimulated = ref([])
const interval = ref()
const windowHeight = ref(window.innerHeight)
const profitsSimul = ref(false)

onMounted(async () => {
  isLoading.value = true
  await main.getBots()
  await getDailyProfits()
  await getDailyProfitsSimulated()
  interval.value = setInterval(() => {
    main.getBots()
    getDailyProfits()
  }, 60000)
  window.addEventListener('resize', updateHeight)
  isLoading.value = false
})

onUnmounted(() => {
  clearInterval(interval.value)
  window.removeEventListener('resize', updateHeight)
})

const updateHeight = () => {
  windowHeight.value = window.innerHeight
}

const botsConfig = computed(() => {
  let height = windowHeight.value - 500
  if (height < 150) height = 150
  if (height > 260) height = 260
  return {
    "style": {
      "fontFamily":"inherit",
      "shape":"bar",
      "chart":{
        "animation":{
          "use":true,
          "speed":1,
          "acceleration":1
        },
        "backgroundColor":"transparent",
        "color":"#CCCCCC",
        "bar":{
          "color":"#5f8bee",
          "stroke":"#5f8bee",
          "strokeWidth":0.7,
          "shadeColor":"#2D353C"
        },
        "box":{
          "stroke":"#CCCCCC",
          "strokeWidth":0.7,
          "strokeDasharray":2,
          "dimensions":{
            "width":140,
            height,
            "top":20,
            "bottom":20,
            "left":16,
            "right":16,
            "perspective":18
          }
        },
        "title":{
          "text": botsTitle.value,
          "color":"#CCCCCC",
          "fontSize":20,
          "bold":true,
          "subtitle":{
            "color":"#A1A1A1",
            "text":t('pages.home.breakdownByCurrency'),
            "fontSize":16,
            "bold":false
          }
        },
        "legend":{
          "showDefault":true,
          "fontSize":8,
          "color":"#CCCCCC",
          "bold":false,
          "roundingValue":2,
          "roundingPercentage":0,
          "prefix":"",
          "suffix":` ${main.exchangeAsset}`,
          "hideUnderPercentage":0
        },
        "dataLabel":{
          "show":false,
          "bold":true,
          "color":"#5f8bee",
          "fontSize":8,
          "rounding":1
        }
      }
    },
    "userOptions":{
      "show":false
    },
    "table":{
      "show":false,
      "responsiveBreakpoint":300,
      "columnNames":{
        "series":"Series",
        "value":"Value",
        "percentage":"Percentage"
      },
      "th":{
        "backgroundColor":"#2A2A2A",
        "color":"#CCCCCC",
        "outline":"none"
      },
      "td":{
        "backgroundColor":"#2A2A2A",
        "color":"#CCCCCC",
        "outline":"none",
        "roundingValue":0,
        "roundingPercentage":0
      }
    }
  }
})

const botsTitle = computed(() => {
  return profitsSimul.value ? t('pages.home.botsTitleSimulation') : t('pages.home.botsTitle')
})

const profitsTitle = computed(() => {
  return profitsSimul.value ? t('pages.home.profitsTitleSimulation', { asset: main.exchangeAsset }) : t('pages.home.profitsTitle', { asset: main.exchangeAsset })
})

const profitsConfig = computed(() => {
  let height = windowHeight.value - 600
  if (height < 100) height = 100
  if (height > 230) height = 230
  return {
    "theme":"",
    "customPalette":[
      
    ],
    "style":{
      "fontFamily":"inherit",
      "chart":{
        "backgroundColor":"transparent",
        "color":"#CCCCCC",
        "zoom":{
          "show":true,
          "color":"#CCCCCC",
          "highlightColor":"#4A4A4A",
          "fontSize":14,
          "useResetSlot":false,
          "startIndex":null,
          "endIndex":null,
          "enableRangeHandles":true,
          "enableSelectionDrag":true
        },
        "layout":{
          height,
          "width":512,
          "padding":{
            "top":24,
            "right":24,
            "bottom":12,
            "left":36
          },
          "grid":{
            "show":true,
            "stroke":"#e1e5e8",
            "strokeWidth":0.7,
            "showVerticalLines":true,
            "yAxis":{
              "dataLabels":{
                "show":true,
                "fontSize":10,
                "color":"#CCCCCC",
                "roundingValue":2,
                "offsetX":0,
                "bold":false,
                "steps":10
              }
            },
            "xAxis":{
              "dataLabels":{
                "show":true,
                "values": dailyProfitsSimulated.value.dates,
                "fontSize":10,
                "showOnlyFirstAndLast":false,
                "color":"#CCCCCC",
                "rotation":0,
                "offsetY":0
              }
            }
          },
          "line":{
            "show":true,
            "stroke":"#CCCCCC",
            "strokeWidth":4
          },
          "highlighter":{
            "color":"#2D353C",
            "opacity":5
          },
          "dataLabels":{
            "show":true,
            "fontSize":10,
            "color":"#CCCCCC",
            "bold":false,
            "rounding":0,
            "prefix":"",
            "suffix":"",
            "offsetY":0,
            "formatter":null
          }
        },
        "title":{
          "text":profitsTitle.value,
          "color":"#fffCCCCCC",
          "fontSize":20,
          "bold":true,
          "textAlign":"center",
          "paddingLeft":0,
          "paddingRight":0,
          "subtitle":{
            "color":"#A1A1A1",
            "text":t('pages.home.breakdownByCurrency'),
            "fontSize":16,
            "bold":false
          }
        },
        "legend":{
          "show":true,
          "bold":false,
          "backgroundColor":"transparent",
          "color":"#CCCCCC",
          "fontSize":18,
          "roundingValue":2,
          "roundingPercentage":0
        }
      }
    },
    "userOptions":{
      "show":false,
      "showOnChartHover":false,
      "keepStateOnChartLeave":true,
      "position":"right",
      "buttons":{
        "tooltip":false,
        "pdf":true,
        "csv":true,
        "img":true,
        "table":true,
        "labels":false,
        "fullscreen":true,
        "sort":false,
        "stack":false,
        "animation":false,
        "annotator":true
      },
      "buttonTitles":{
        "open":"Open options",
        "close":"Close options",
        "pdf":"Download PDF",
        "csv":"Download CSV",
        "img":"Download PNG",
        "table":"Toggle table",
        "fullscreen":"Toggle fullscreen",
        "annotator":"Toggle annotator"
      }
    },
    "table":{
      "show":false,
      "responsiveBreakpoint":400,
      "columnNames":{
        "period":"Period",
        "total":"Total"
      },
      "th":{
        "backgroundColor":"#fafafa",
        "color":"#2D353C",
        "outline":"none"
      },
      "td":{
        "backgroundColor":"#FFFFFF",
        "color":"#2D353C",
        "outline":"none",
        "roundingValue":0,
        "roundingPercentage":0
      }
    }
  }
})

const baseColor = computed(() => {
  return profitsSimul.value ? "#fb8c00" : "#01bc8d"
})  

const botsDataset = computed(() => {
  let seriesCount = 0
  const currencyCount = new Set(main.bots.map(bot => bot.config.symbol)).size
  const colors = interpolateToWhite(baseColor.value, currencyCount)
  const series = Object.values(
    main.bots.reduce((acc, cur) => {
      const symbol = cur.config.symbol
      if (!acc[symbol]) {
        acc[symbol] = {
          name: symbol.replace(new RegExp(`-?${main.exchangeAsset}$`), ''),
          value: 0,
          breakdown: []
        }
        acc[symbol].color=colors[seriesCount]
        seriesCount++
      }
      const p = profitsSimul.value && cur.config.simulation  || !profitsSimul.value && !cur.config.simulation? cur.totalProfit : 0
      acc[symbol].value += p
      acc[symbol].breakdown.push({
        name: cur.config.label || cur._id,
        value: p
      })
      return acc
    }, {})
    )
  return {
    series
  }
})

const profitsDataset = computed(() => {
  return profitsSimul.value ? dailyProfitsSimulated.value?.series || [] : dailyProfits.value?.series || []
})

const paintSeries = (series, baseColor) => {
  const colors = interpolateToWhite(baseColor, series.length)
  return series.map((serie, index) => {
    return {
      ...serie,
      color: colors[index]
    }
  })
}

const getDailyProfits = () => {
  return userService.getDailyProfits('week')
    .then((data) => {
      if (!data || !data.series) {
        dailyProfits.value = { dates: [], series: [] }
        return
      }
      // Convert negative values to 0 for chart compatibility
      const sanitizedSeries = data.series.map(serie => ({
        ...serie,
        data: serie.values.map(value => value < 0 ? 0 : value)
      }))
      dailyProfits.value = {
        dates: data.dates,
        series: paintSeries(sanitizedSeries, "#01bc8d")
      }
    })
    .catch((error) => {
      console.error('Error fetching daily profits:', error)
      dailyProfits.value = { dates: [], series: [] }
    })
}

const getDailyProfitsSimulated = () => {
  return userService.getDailyProfitsSimulated('week')
    .then((data) => {
      if (!data || !data.series || !Array.isArray(data.series)) {
        dailyProfitsSimulated.value = { dates: [], series: [] }
        return
      }
      // Convert negative values to 0 for chart compatibility
      const sanitizedSeries = data.series.map(serie => ({
        ...serie,
        data: Array.isArray(serie.data) ? serie.data.map(value => value < 0 ? 0 : value) : []
      }))
      dailyProfitsSimulated.value = {
        dates: data.dates || [],
        series: paintSeries(sanitizedSeries, "#fb8c00")
      }
    })
    .catch((error) => {
      console.error('Error fetching daily profits (simulated):', error)
      dailyProfitsSimulated.value = { dates: [], series: [] }
    })
}

const interpolateToWhite = (startColor, steps) =>{
    const start = parseColor(startColor)
    const wayToWhite = 0.7
    const end = {
      r: Math.round(start.r + (255 - start.r) * wayToWhite),
      g: Math.round(start.g + (255 - start.g) * wayToWhite),
      b: Math.round(start.b + (255 - start.b) * wayToWhite)
    }
    const colors = []
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(start.r + (end.r - start.r) * t)
      const g = Math.round(start.g + (end.g - start.g) * t)
      const b = Math.round(start.b + (end.b - start.b) * t)
      colors.push(`rgb(${r}, ${g}, ${b})`)
    }
    return colors
}

const parseColor = (hex) => {
  hex = hex.replace(/^#/, '')
  let bigint = parseInt(hex, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}
</script>

<style scoped>
.love-bg {
  background-image: url('/love-bg.jpg');
  background-size: 20%;
  background-repeat: repeat;
}
.love {
  border: 20px solid #FCC1BB;
  border-radius: 10px;
  box-shadow: 10px 10px 10px #000, -10px -10px 10px #000;
}
.valentine {
  background-image: url('/love.jpg');
  background-size: contain;
  background-repeat: no-repeat;
  height: 320px;
  width: 320px;
}
.yo {
  background-image: url('/yo.jpg');
  background-size: contain;
  background-repeat: no-repeat;
  height: 284px;
  width: 284px;
}
.robots {
  background-image: url('/robots.jpg');
  background-size: contain;
  background-repeat: no-repeat;
  height: 180px;
  width: 240px;
}
.cumple {
  background-image: url('/cumple.jpg');
  background-size: contain;
  background-repeat: no-repeat;
  height: calc(510px / 2.1);
  width: calc(580px / 2.1);
}
.bounce {
  position:fixed;
  top: 180px;
  animation: bounce 2.5s infinite;
}

@keyframes bounce {
  50% { top: 220px; }
}
</style>
<template>
  <div class="crypto-snowfall">
    <div
      v-for="flake in flakes"
      :key="flake.id"
      class="crypto-flake-container"
      :style="flake.containerStyle"
    >
      <div
        class="crypto-flake crypto-symbol"
        :style="flake.flakeStyle"
      >
        {{ flake.symbol }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const flakes = ref([])
let nextId = 0
let intervalId = null

const cryptoItems = [
  { name: 'Bitcoin', symbol: '₿', color: '#F7931A' },
  { name: 'Ethereum', symbol: 'Ξ', color: '#627EEA' },
  { name: 'Tether', symbol: '₮', color: '#26A17B' },
  { name: 'Litecoin', symbol: 'Ł', color: '#345D9D' },
  { name: 'Dollar', symbol: '$', color: '#00C853' },
  { name: 'Solana', symbol: '◎', color: '#4ECDC4' },
  { name: 'Dogecoin', symbol: 'Ð', color: '#8247E5' },
  { name: 'XRP', symbol: '✕', color: '#FFD93D' },
  { name: 'Cardano', symbol: '₳', color: '#0033AD' },
  { name: 'Tezos', symbol: 'ꜩ', color: '#2C7DF7' },
  { name: 'Dai', symbol: '◈', color: '#E6007A' },
]

const createFlake = () => {
  const item = cryptoItems[Math.floor(Math.random() * cryptoItems.length)]
  const size = Math.random() * 30 + 25 // 25-55px
  const startX = Math.random() * 100 // 0-100%
  const duration = Math.random() * 15 + 10 // 10-25s
  const delay = Math.random() * 5 // 0-5s
  const drift = (Math.random() - 0.5) * 100 // -50 to 50px
  const rotationSpeed = (Math.random() - 0.5) * 4 // -2 to 2 rotations
  const opacity = Math.random() * 0.4 + 0.5 // 0.5-0.9

  return {
    id: nextId++,
    symbol: item.symbol,
    containerStyle: {
      left: `${startX}%`,
      animationDuration: `${duration}s`,
      animationDelay: `-${delay}s`,
      '--drift': `${drift}px`,
    },
    flakeStyle: {
      fontSize: `${size}px`,
      animationDuration: `${duration * 0.5}s`,
      '--rotation-speed': `${rotationSpeed * 360}deg`,
      opacity: opacity,
      color: item.color,
    },
  }
}

onMounted(() => {
  // Initial burst of flakes
  for (let i = 0; i < 25; i++) {
    flakes.value.push(createFlake())
  }

  // Add new flakes periodically
  intervalId = setInterval(() => {
    if (flakes.value.length < 40) {
      flakes.value.push(createFlake())
    }
    // Remove old flakes to prevent memory leak
    if (flakes.value.length > 50) {
      flakes.value.shift()
    }
  }, 800)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<style scoped>
.crypto-snowfall {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.crypto-flake-container {
  position: absolute;
  top: -10%;
  animation: fall linear infinite;
  will-change: transform;
}

.crypto-flake {
  user-select: none;
  animation: rotate linear infinite;
  will-change: transform;
  display: inline-block;
}

.crypto-symbol {
  font-weight: bold;
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
}

@keyframes fall {
  0% {
    transform: translateY(0) translateX(0);
  }
  50% {
    transform: translateY(50vh) translateX(var(--drift));
  }
  100% {
    transform: translateY(110vh) translateX(0);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(var(--rotation-speed));
  }
}
</style>

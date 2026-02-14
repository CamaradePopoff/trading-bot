const queue = []
let isPlaying = false

function playNext() {
  if (queue.length === 0) {
    isPlaying = false
    return
  }

  isPlaying = true
  const { src, resolve } = queue.shift()
  const audio = new Audio(src)

  audio.addEventListener('ended', () => {
    resolve() // optional: let caller await if needed
    playNext() // continue with the next sound
  })

  audio.play().catch((err) => {
    console.error('Audio playback failed:', err)
    resolve() // prevent hanging if audio fails
    playNext()
  })
}

export function playSound(sound, simulation = false) {
  const src = `/${sound}${simulation ? '-simulation' : ''}.mp3`
  return new Promise((resolve) => {
    queue.push({ src, resolve })
    if (!isPlaying) {
      playNext()
    }
  })
}

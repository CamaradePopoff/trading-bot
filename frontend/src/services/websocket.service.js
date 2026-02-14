class WebSocketService {
  constructor() {
    this.ws = null
    this.url = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.listeners = new Map()
    this.isConnecting = false
    this.shouldReconnect = true
  }

  connect(exchange) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return Promise.resolve()
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token')
      if (!token) {
        reject(new Error('No authentication token found'))
        return
      }

      const apiUrl = import.meta.env.VITE_API_ROOT_URL
      const wsUrl = apiUrl.replace(/^http/, 'ws')
      this.url = `${wsUrl}/${exchange.toLowerCase()}/ws?token=${encodeURIComponent(token)}`

      console.log('Connecting to WebSocket:', this.url)
      this.isConnecting = true

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // console.log('WebSocket message:', data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          this.emit('error', error)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          this.isConnecting = false
          this.emit('disconnected', { code: event.code, reason: event.reason })

          // Attempt to reconnect if not manually closed
          if (this.shouldReconnect && event.code !== 1000) {
            this.attemptReconnect(exchange)
          }
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  attemptReconnect(exchange) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('reconnect_failed')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect(exchange).catch(error => {
          console.error('Reconnection failed:', error)
        })
      }
    }, delay)
  }

  handleMessage(data) {
    const { type, ...payload } = data

    // Emit event for specific message type
    this.emit(type, payload)

    // Also emit a general 'message' event
    this.emit('message', data)
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected')
      return false
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }

  subscribe(channel) {
    return this.send('subscribe', { channel })
  }

  unsubscribe(channel) {
    return this.send('unsubscribe', { channel })
  }

  ping() {
    return this.send('ping')
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return

    const callbacks = this.listeners.get(event)
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return

    const callbacks = this.listeners.get(event)
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in WebSocket event listener for', event, ':', error)
      }
    })
  }

  disconnect() {
    this.shouldReconnect = false
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.listeners.clear()
    this.reconnectAttempts = 0
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}

export default new WebSocketService()

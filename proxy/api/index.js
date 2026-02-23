const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
require('dotenv').config()

const app = express()
const port = 4000
const apiPrefix = process.env.VERCEL_ENV ? '/api/' : '/'

app.disable('x-powered-by')
app.use(cors())
app.use(express.json())
app.use(morgan('dev')) // automatically log incoming requests

app.get(apiPrefix, (req, res) => {
  res.send('Hello!')
})

app.post(`${apiPrefix}kucoin`, async (req, res) => {
  try {
    if (req.headers['x-caller'] !== 'KuBot') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { url, method, headers, params } = req.body
    const response = await fetch(url, {
      method,
      headers,
      body: params ? JSON.stringify(params) : null
    })
    if (!response.ok) {
      const errorData = await response.json()
      console.error(
        `HTTP Error ${response.status}: ${JSON.stringify(errorData)}`
      )
    }
    const result = await response.json()
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
  fetch('https://api64.ipify.org?format=json')
    .then((response) => response.json())
    .then((data) => console.log('Server IP:', data.ip))
})

module.exports = app

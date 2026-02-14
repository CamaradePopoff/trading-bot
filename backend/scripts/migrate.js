const { spawn } = require('child_process')

const command = process.argv[2] || 'up'
const args = process.argv.slice(3)

// Use npx.cmd on Windows, npx on Unix-like systems
const isWindows = process.platform === 'win32'
const npxCommand = isWindows ? 'npx.cmd' : 'npx'

const migrateMongo = spawn(npxCommand, ['migrate-mongo', command, ...args], {
  stdio: 'pipe',
  shell: isWindows
})

let output = ''

migrateMongo.stdout.on('data', (data) => {
  const text = data.toString()
  output += text
  process.stdout.write(text)
})

migrateMongo.stderr.on('data', (data) => {
  process.stderr.write(data)
})

migrateMongo.on('close', (code) => {
  if (code === 0 && command === 'up') {
    // Check if no migrations were run
    if (
      output.includes('MIGRATED UP') === false ||
      output.trim().endsWith('MIGRATED UP')
    ) {
      console.log(
        '\n✅ All migrations are already applied. Database is up to date.'
      )
    }
  }
  process.exit(code)
})

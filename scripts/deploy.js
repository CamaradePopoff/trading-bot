const { spawnSync } = require('node:child_process')
const path = require('node:path')
const dotenv = require('dotenv')
const { Client } = require('ssh2')

const ROOT_DIR = path.resolve(__dirname, '..')
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend')
const IS_WINDOWS = process.platform === 'win32'
const ENV_FILE = path.join(ROOT_DIR, '.env')
const REMOTE_COMMAND = 'sh pull.sh && sh restart.sh'

dotenv.config({ path: ENV_FILE })

const SSH_HOST = process.env.SSH_HOST
const SSH_PASSWORD = process.env.SSH_PASSWORD

if (!SSH_HOST || !SSH_PASSWORD) {
  console.error('[deploy] Missing SSH_HOST or SSH_PASSWORD in .env file at repository root.')
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: ROOT_DIR,
    shell: false,
    ...options
  })

  if (result.error) {
    throw result.error
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }
}

function parseSshTarget(target) {
  const [userPart, hostPart] = target.includes('@') ? target.split('@') : [process.env.SSH_USER || 'root', target]
  const [host, portPart] = hostPart.includes(':') ? hostPart.split(':') : [hostPart, process.env.SSH_PORT]
  const port = Number(portPart || 22)

  if (!host || Number.isNaN(port)) {
    throw new Error('[deploy] Invalid SSH_HOST format. Use user@host or user@host:port')
  }

  return {
    host,
    username: userPart,
    port
  }
}

function runRemoteCommand() {
  const target = parseSshTarget(SSH_HOST)

  return new Promise((resolve, reject) => {
    const client = new Client()

    client
      .on('ready', () => {
        client.exec(REMOTE_COMMAND, (error, stream) => {
          if (error) {
            client.end()
            reject(error)
            return
          }

          stream.on('close', (code) => {
            client.end()
            if (code === 0) {
              resolve()
              return
            }

            reject(new Error(`[deploy] Remote command exited with code ${code}`))
          })

          stream.on('data', (data) => {
            process.stdout.write(data)
          })

          stream.stderr.on('data', (data) => {
            process.stderr.write(data)
          })
        })
      })
      .on('error', (error) => {
        reject(error)
      })
      .connect({
        host: target.host,
        port: target.port,
        username: target.username,
        password: SSH_PASSWORD,
        readyTimeout: 20000
      })
  })
}

async function main() {
  if (IS_WINDOWS) {
    run('cmd.exe', ['/d', '/s', '/c', 'npm run deploy'], { cwd: FRONTEND_DIR })
  } else {
    run('npm', ['run', 'deploy'], { cwd: FRONTEND_DIR })
  }

  await runRemoteCommand()
}

main().catch((error) => {
  console.error('[deploy] Deployment failed:', error.message)
  process.exit(1)
})

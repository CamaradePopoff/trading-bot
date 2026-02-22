const { spawnSync } = require('node:child_process')
const path = require('node:path')
const dotenv = require('dotenv')

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

function commandExists(command) {
  const check = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: false
  })
  return !check.error
}

if (IS_WINDOWS) {
  run('cmd.exe', ['/d', '/s', '/c', 'npm run deploy'], { cwd: FRONTEND_DIR })
} else {
  run('npm', ['run', 'deploy'], { cwd: FRONTEND_DIR })
}

if (commandExists('sshpass')) {
  run('sshpass', [
    '-p',
    SSH_PASSWORD,
    'ssh',
    '-o',
    'StrictHostKeyChecking=accept-new',
    SSH_HOST,
    REMOTE_COMMAND
  ])
} else {
  console.warn('[deploy] sshpass not found, falling back to interactive ssh password prompt.')
  run('ssh', [
    '-o',
    'StrictHostKeyChecking=accept-new',
    SSH_HOST,
    REMOTE_COMMAND
  ])
}

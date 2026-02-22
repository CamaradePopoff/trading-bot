import fs from 'fs'
import { Table } from 'console-table-printer'
import https from 'https'

const TMP_DIR = './../../tmp'

const stats = fs
  .readdirSync(TMP_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((file) => {
    const { total, ...counts } =
      JSON.parse(fs.readFileSync(`${TMP_DIR}/${file}`, 'utf8'))?.metadata
        ?.vulnerabilities || {}
    return total !== undefined && counts !== undefined
      ? {
          item: file
            .replace('-npm-audit-all.json', '')
            .replace('-npm-audit-prod.json', ''),
          scope: file.includes('-prod.json') ? 'prod' : 'all',
          ...counts
        }
      : null
  })
  .filter(Boolean)

const success = !stats.some((s) => s.high > 0 || s.critical > 0)

const tableToMarkdown = (table, scope = null) => {
  if (!table || table.length === 0) return ''
  const _table = table.filter((x) => !scope || x.scope === scope)
  const processHeader = (header) => {
    if (header === 'item') return 'Service'
    return header.charAt(0).toUpperCase() + header.slice(1)
  }
  const processValue = (value) => {
    if (isNaN(parseInt(value))) return value
    return ` ${value}` // align numbers to the right of the cell
  }
  const headers = Object.keys(_table[0])
  const separator = headers.map(() => '---')
  const headerRow = `| ${headers.map((h) => processHeader(h)).join(' | ')} |`
  const separatorRow = `| ${separator.join(' | ')} |`
  const bodyRows = _table.map(
    (row) => `| ${headers.map((h) => processValue(row[h])).join(' | ')} |`
  )
  return [headerRow, separatorRow, ...bodyRows].join('\n')
}

const tableDef = {
  columns: [
    { name: 'item', alignment: 'left', color: 'white' },
    { name: 'scope', alignment: 'center', color: 'white' },
    { name: 'critical', alignment: 'right', color: 'magenta' },
    { name: 'high', alignment: 'right', color: 'red' },
    { name: 'moderate', alignment: 'right', color: 'yellow' },
    { name: 'low', alignment: 'right', color: 'cyan' },
    { name: 'info', alignment: 'right', color: 'blue' }
  ]
}

const showTable = (scope) => {
  const table = new Table(tableDef)
  stats.filter((x) => x.scope === scope).forEach((x) => table.addRow(x))
  table.printTable()
}

console.log('┌───────────────────┐')
console.log('│ ALL dependencies  │')
showTable('all')

console.log('┌───────────────────┐')
console.log('│ PROD dependencies │')
showTable('prod')

const prodReport = tableToMarkdown(stats, 'prod')
const allReport = tableToMarkdown(stats, 'all')
const prodReportFile = `${TMP_DIR}/npm-audit-table-prod.md`
const allReportFile = `${TMP_DIR}/npm-audit-table-all.md`
fs.writeFileSync(allReportFile, allReport)
fs.writeFileSync(prodReportFile, prodReport)

const getSimpleTableAsString = (scope) => {
  const filteredData = stats.filter((x) => x.scope === scope)
  if (filteredData.length === 0) return 'No data'

  const headers = [
    'Item',
    'Scope',
    'Critical',
    'High',
    'Moderate',
    'Low',
    'Info'
  ]
  const rows = filteredData.map((row) => [
    row.item,
    row.scope,
    row.critical,
    row.high,
    row.moderate,
    row.low,
    row.info
  ])

  // Calculate column widths
  const colWidths = headers.map((header, idx) => {
    const maxRowWidth = Math.max(...rows.map((row) => String(row[idx]).length))
    return Math.max(header.length, maxRowWidth)
  })

  // Build table
  const lines = []

  // Top border
  lines.push('┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐')

  // Header row
  lines.push(
    '│ ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ') + ' │'
  )

  // Header separator
  lines.push('├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤')

  // Data rows
  rows.forEach((row) => {
    lines.push(
      '│ ' +
        row.map((val, i) => String(val).padEnd(colWidths[i])).join(' │ ') +
        ' │'
    )
  })

  // Bottom border
  lines.push('└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘')

  return lines.join('\n')
}

const sendSlackMessage = () => {
  if (!process.env.PUBLISH_TO_SLACK) return

  const allTableText = getSimpleTableAsString('all')
  const prodTableText = getSimpleTableAsString('prod')

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'NPM Audit Report',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: success
            ? ':white_check_mark: No critical or high vulnerabilities found!'
            : ':warning: Critical or high vulnerabilities detected!'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*ALL Dependencies*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\n' + allTableText + '\n```'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*PROD Dependencies*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\n' + prodTableText + '\n```'
        }
      }
    ]
  }

  const postData = JSON.stringify(payload)
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = https.request(process.env.SLACK_WEBHOOK, options, (res) => {
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('\n✓ Slack message sent successfully')
      } else {
        console.error(`✗ Failed to send Slack message: ${res.statusCode}`)
      }
    })
  })

  req.on('error', (error) => {
    console.error('Error sending Slack message:', error)
  })

  req.write(postData)
  req.end()
}

if (!success) {
  console.log(
    '\x1b[31m\nAt least one HIGH or CRITICAL vulnerability has been found!\n\x1b[37m'
  )
}

if (process.env.PUBLISH_TO_SLACK === 'true') sendSlackMessage()

if (!success) process.exit(1)

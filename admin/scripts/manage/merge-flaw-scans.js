import fs from 'fs'
import path from 'path'
import https from 'https'

if (process.argv.length < 5) {
  console.error('Usage: node script.js <folder> <version> <label>')
  process.exit(1)
}

const folder = process.argv[2]
const version = process.argv[3]
const label = process.argv[4]
const folderPath = path.resolve(folder)

const summaryTableId = 'flaw_summary_table'
const detailsSectionId = 'flaw_details_section'
const docTitle = () => `SAST report for ${label} version ${version}`
const sevOrder = ['Very High', 'High', 'Medium', 'Low']

function safeAnchor(id) {
  return id.replace(/[^\w-]/g, '_')
}

function parseSemgrepFlaws(json) {
  const flaws = []
  const results = json.results || []

  for (const result of results) {
    let cweId = 'N/A',
      cweTitle = 'N/A'
    const cweRaw = result.extra?.metadata?.cwe && result.extra.metadata.cwe[0]
    if (cweRaw) {
      const match = cweRaw.match(/^CWE-(\d+):\s*(.*)$/)
      if (match) {
        cweId = match[1]
        cweTitle = match[2]
      } else if (/^CWE-\d+$/.test(cweRaw)) {
        cweId = cweRaw.replace('CWE-', '')
        cweTitle = 'N/A'
      } else {
        cweTitle = cweRaw
      }
    }
    const description =
      result.extra?.message || result.check_id || 'No description'
    const file = result.path || 'Unknown'
    const line = result.start?.line ? result.start.line.toString() : '0'
    // Map Semgrep severity to Veracode/Excel style
    let severity = 'Medium'
    if (result.extra?.severity === 'ERROR') severity = 'High'
    else if (result.extra?.severity === 'WARNING') severity = 'Medium'
    else if (result.extra?.severity === 'INFO') severity = 'Low'

    flaws.push({
      cweId,
      cweTitle,
      description,
      file,
      line,
      severity,
      scanner: 'Semgrep'
    })
  }
  return flaws
}

function parseSonarFlaws(json) {
  // To be implemented when you provide SonarQube format
  return []
}

function formatSectionTitle(filename) {
  const base = filename.replace(/^.+-scan-/, '').replace(/\.json$/i, '')
  const match = base.match(/^(.*?)-(v?[\d.]+)$/)
  if (match) {
    return `${match[1]}:${match[2]}`
  }
  return base
}

function countSeverity(flaws) {
  const counts = {}
  for (const flaw of flaws) {
    const sev = flaw.severity || 'Unknown'
    counts[sev] = (counts[sev] || 0) + 1
  }
  return counts
}

function sendSummaryToSlack(summarySections, label) {
  if (!process.env.SLACK_WEBHOOK) return
  const slackWebhookUrl = process.env.SLACK_WEBHOOK
  const severities = ['Very High', 'High', 'Medium', 'Low']

  // Calculate column widths
  const itemWidth = Math.max(4, ...summarySections.map((s) => s.title.length))
  const severityWidths = severities.map((sev) => {
    let maxCount = 0
    summarySections.forEach((sec) => {
      const count = sec.flawCounts.semgrep?.[sev] || 0
      maxCount = Math.max(maxCount, count)
    })
    return Math.max(sev.length, String(maxCount).length)
  })

  let summaryTable = ''
  // Header
  summaryTable += '┌' + '─'.repeat(itemWidth + 2) + '┬'
  severityWidths.forEach((width, i) => {
    summaryTable +=
      '─'.repeat(width + 2) + (i < severities.length - 1 ? '┬' : '')
  })
  summaryTable += '┐\n'
  // Title row
  summaryTable += '│ ' + 'Item'.padEnd(itemWidth) + ' │'
  severities.forEach((sev, i) => {
    summaryTable += ' ' + sev.padStart(severityWidths[i]) + ' │'
  })
  summaryTable += '\n'
  // Separator
  summaryTable += '├' + '─'.repeat(itemWidth + 2) + '┼'
  severityWidths.forEach((width, i) => {
    summaryTable +=
      '─'.repeat(width + 2) + (i < severities.length - 1 ? '┼' : '')
  })
  summaryTable += '┤\n'
  // Data rows
  summarySections.forEach((sec) => {
    summaryTable += '│ ' + sec.title.padEnd(itemWidth) + ' │'
    severities.forEach((sev, i) => {
      const count = sec.flawCounts.semgrep?.[sev] || 0
      summaryTable += ' ' + String(count).padStart(severityWidths[i]) + ' │'
    })
    summaryTable += '\n'
  })
  // Bottom border
  summaryTable += '└' + '─'.repeat(itemWidth + 2) + '┴'
  severityWidths.forEach((width, i) => {
    summaryTable +=
      '─'.repeat(width + 2) + (i < severities.length - 1 ? '┴' : '')
  })
  summaryTable += '┘'

  console.log('Summary table to send to Slack:\n' + summaryTable)

  // Check if there are any Very High or High flaws
  let success = true
  summarySections.forEach((sec) => {
    const counts = sec.flawCounts.semgrep || {}
    if ((counts['Very High'] || 0) > 0 || (counts['High'] || 0) > 0) {
      success = false
    }
  })

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `SAST Flaw Report - ${label}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: success
            ? ':white_check_mark: No very high or high flaws found!'
            : ':warning: Very high or high flaws detected!'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '``' + '\n' + summaryTable + '\n' + '``'
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

  const req = https.request(slackWebhookUrl, options, (res) => {
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✓ Slack message sent successfully')
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

function generateFlawTable(flaws) {
  if (!flaws.length) {
    return '<p>No flaws found.</p>'
  }

  let html =
    '<table class="flaw-table" border="1" cellspacing="0" cellpadding="4">'
  html += '<thead><tr>'
  html +=
    '<th>CWE</th><th>Title</th><th>Description</th><th>File</th><th>Line</th><th>Severity</th><th>Scanner</th>'
  html += '</tr></thead><tbody>'

  for (const flaw of flaws) {
    const severityClass =
      'severity-' + flaw.severity.toLowerCase().replace(' ', '-')
    const scannerClass = 'scanner-' + flaw.scanner.toLowerCase()
    html += `<tr class="${severityClass} ${scannerClass}">`
    html += `<td>${flaw.cweId || 'N/A'}</td>`
    html += `<td>${flaw.cweTitle || 'N/A'}</td>`
    html += `<td style="max-width: 400px;">${flaw.description}</td>`
    html += `<td style="max-width: 300px; word-break: break-all;">${flaw.file}</td>`
    html += `<td>${flaw.line}</td>`
    html += `<td>${flaw.severity}</td>`
    html += `<td>${flaw.scanner}</td>`
    html += '</tr>'
  }

  html += '</tbody></table>'
  return html
}

function generateCombinedSummaryTable(summarySections) {
  const severities = ['Very High', 'High', 'Medium', 'Low']
  let html = '<table border="1" cellspacing="0" cellpadding="4">'
  html += '<thead><tr><th style="vertical-align: middle;">Component</th>'
  for (const sev of severities) {
    html += `<th class="center">${sev}</th>`
  }
  html += '<th>Total</th></tr></thead><tbody>'
  for (const sec of summarySections) {
    html += '<tr>'
    html += `<td><a href="#${sec.detailId}">${sec.title}</a></td>`
    let rowTotal = 0
    for (const sev of severities) {
      const semgrepValue = sec.flawCounts.semgrep?.[sev] || 0
      rowTotal += semgrepValue
      html += `<td class="center">${semgrepValue}</td>`
    }
    html += `<td class="center"><strong>${rowTotal}</strong></td>`
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function generateSimpleTOC(summaryId, detailId, detailSections) {
  let html =
    '<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
  html += '<div><ul>'
  html += `<li><a href="#${summaryId}">Flaw Summary</a></li>`
  html += `<li><a href="#${detailId}">Flaw Details</a><ul>`
  for (const sec of detailSections) {
    html += `<li><a href="#${sec.id}">${sec.title}</a></li>`
  }
  html += '</ul></li></ul></div>'
  html += '<div class="filter-bar">'
  html += '<p><strong>Show flaws:</strong></p>'
  html += '<div style="display: inline-block;">'
  for (const sev of ['Very High', 'High', 'Medium', 'Low']) {
    const val = sev.toLowerCase().replace(' ', '-')
    html += `<label><input type="checkbox" class="sev-filter" value="${val}" checked> ${sev}</label>`
  }
  html += '</div></div></div>'
  return html
}

// MAIN SCRIPT
const semgrepFiles = fs
  .readdirSync(folderPath)
  .filter((f) => f.startsWith('semgrep-scan-') && f.endsWith('.json'))

const summarySections = []
const detailSections = []
const results = {}

// Process Semgrep files
for (const file of semgrepFiles) {
  console.log(`Processing ${file}`)
  const filePath = path.join(folderPath, file)
  const content = fs.readFileSync(filePath, 'utf8')
  const sectionTitle = formatSectionTitle(file)
  const json = JSON.parse(content)

  const flaws = parseSemgrepFlaws(json)

  if (!results[sectionTitle]) {
    results[sectionTitle] = {
      flaws: [],
      flawCounts: { semgrep: {} }
    }
  }

  results[sectionTitle].flaws.push(...flaws)
  results[sectionTitle].flawCounts.semgrep = countSeverity(flaws)
}

// Generate sections
Object.entries(results).forEach(([sectionTitle, data]) => {
  const baseId = safeAnchor(sectionTitle)
  const summaryId = baseId + '_summary'
  const detailId = baseId + '_details'

  summarySections.push({
    id: summaryId,
    detailId,
    title: sectionTitle,
    flawCounts: data.flawCounts
  })

  // Sort flaws by severity
  const sortedFlaws = data.flaws.sort((a, b) => {
    const sevA = sevOrder.indexOf(a.severity)
    const sevB = sevOrder.indexOf(b.severity)
    return sevA - sevB || a.file.localeCompare(b.file)
  })

  let detailsHtml = `<h3 class="nx" id="${detailId}">${sectionTitle} <a href="#${summaryTableId}">[View summary]</a></h3>`
  detailsHtml += generateFlawTable(sortedFlaws)

  detailSections.push({ id: detailId, title: sectionTitle, html: detailsHtml })
})

// Generate final HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle()}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 0.9em; margin: 20px; }
    h1, h2, h3, h4, h5 { margin-top: 1em; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid #0ed8B8; padding: 4px 8px; text-align: left; vertical-align: top; }
    th { background: #0ed8B8; color: white; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { list-style-type: none; padding-left: 1em; }
    ul ul { padding-left: 1em; }
    .nx { color: #0ed8B8; font-weight: bold; }
    .filter-bar { font-size: 0.9em; padding: 0.5em 1em; border: #0ed8B8 1px solid; border-radius: 4px; }
    .filter-bar label { display: block; }
    .filter-bar input[type="checkbox"] { accent-color: #0ed8B8; }
    .center { text-align: center; }
    .severity-very-high { background-color: #ffcccc; }
    .severity-high { background-color: #ffe6cc; }
    .severity-medium { background-color: #ffffcc; }
    .severity-low { background-color: #e6f2ff; }
  </style>
</head>
<body>
  <h1 class="nx">${docTitle()}</h1>
  <h2>Table of Contents</h2>
  ${generateSimpleTOC(summaryTableId, detailsSectionId, detailSections)}
  <hr />
  <h2 id="${summaryTableId}">Flaw Summary</h2>
  ${generateCombinedSummaryTable(summarySections)}
  <h2 id="${detailsSectionId}">Flaw Details</h2>
  ${detailSections.map((d) => d.html).join('\n')}
  <script>
    function updateFilters() {
      const activeSevs = Array.from(document.querySelectorAll('.sev-filter:checked')).map(el => el.value);
      document.querySelectorAll('.flaw-table tbody tr').forEach(row => {
        const classes = Array.from(row.classList);
        const match2 = activeSevs.some(sev => classes.includes('severity-' + sev));
        row.style.display = match2 ? '' : 'none';
      });
    }
    document.querySelectorAll('.sev-filter').forEach(cb => {
      cb.addEventListener('change', updateFilters);
    });
  </script>
</body>
</html>`

const outputFile = `${folderPath}/scan-report-${version}.html`
fs.writeFileSync(outputFile, html, 'utf-8')
console.log(`Scan report generated: ${outputFile}`)

if (process.env.PUBLISH_SCAN_REPORT === 'true') {
  sendSummaryToSlack(summarySections, label)
}

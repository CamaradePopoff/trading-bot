function parseSemgrepFlaws(json) {
  const flaws = []
  const results = json.results || []

  for (const result of results) {
    const cwe = (result.extra?.metadata?.cwe && result.extra.metadata.cwe[0]) || 'N/A'
    const description = result.extra?.message || result.check_id || 'No description'
    const file = result.path || 'Unknown'
    const line = result.start?.line ? result.start.line.toString() : '0'
    // Map Semgrep severity to Veracode/Excel style
    let severity = 'Medium'
    if (result.extra?.severity === 'ERROR') severity = 'High'
    else if (result.extra?.severity === 'WARNING') severity = 'Medium'
    else if (result.extra?.severity === 'INFO') severity = 'Low'

    flaws.push({
      cwe,
      description,
      file,
      line,
      severity,
      scanner: 'Semgrep'
    })
  }
  return flaws
}
import fs from 'fs'
import path from 'path'

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
const docTitle = () => `SAST Flaw Report for ${label} version ${version}`
const sevOrder = ['Very High', 'High', 'Medium', 'Low']

function safeAnchor(id) {
  return id.replace(/[^\w-]/g, '_')
}

function parseVeracodeFlaws(json) {
  const flaws = []
  const findings = json.findings || []

  const severityMap = {
    5: 'Very High',
    4: 'High',
    3: 'Medium',
    2: 'Low',
    1: 'Very Low',
    0: 'Informational'
  }

  for (const finding of findings) {
    const severity = severityMap[finding.severity] || 'Unknown'
    const cwe = finding.cwe_id ? `CWE-${finding.cwe_id}` : 'N/A'
    const description = finding.issue_type || finding.title || 'No description'
    const file =
      finding.files?.source_file?.file || finding.image_path || 'Unknown'
    const line = finding.files?.source_file?.line || 0

    flaws.push({
      cwe,
      description,
      file,
      line: line.toString(),
      severity,
      scanner: 'Veracode'
    })
  }

  return flaws
}

function parseSonarFlaws(json) {
  // To be implemented when you provide SonarQube format
  return []
}

function formatSectionTitle(filename) {
  const base = filename.replace(/^.+-scan-/, '').replace(/\.(txt|json)$/i, '')
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

function generateFlawTable(flaws) {
  if (!flaws.length) {
    return '<p>No flaws found.</p>'
  }

  let html =
    '<table class="flaw-table" border="1" cellspacing="0" cellpadding="4">'
  html += '<thead><tr>'
  html +=
    '<th>CWE</th><th>Description</th><th>File</th><th>Line</th><th>Severity</th><th>Scanner</th>'
  html += '</tr></thead><tbody>'

  for (const flaw of flaws) {
    const severityClass =
      'severity-' + flaw.severity.toLowerCase().replace(' ', '-')
    const scannerClass = 'scanner-' + flaw.scanner.toLowerCase()
    html += `<tr class="${severityClass} ${scannerClass}">`
    html += `<td>${flaw.cwe}</td>`
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

function generateCombinedSummaryTable(summarySections, hideTotals = false) {
  const severities = ['Very High', 'High', 'Medium', 'Low']
  const totals = {
    veracode: { 'Very High': 0, High: 0, Medium: 0, Low: 0 },
    sonar: { 'Very High': 0, High: 0, Medium: 0, Low: 0 }
  }

  let html = '<table border="1" cellspacing="0" cellpadding="4">'

  // Header 1
  html += '<thead><tr><th style="vertical-align: middle;">Component</th>'
  for (const sev of severities) {
    html += `<th class="center" colspan="2">${sev}</th>`
  }
  html += '<th>Total</th></tr></thead>'

  // Header 2
  html += '<thead><tr><th></th>'
  severities.forEach(() => {
    html += '<th class="center">Veracode</th><th class="center">SonarQube</th>'
  })
  html += '<th></th></tr></thead><tbody>'

  // Rows
  for (const sec of summarySections) {
    html += '<tr>'
    html += `<td><a href="#${sec.detailId}">${sec.title}</a></td>`

    let rowTotal = 0
    for (const sev of severities) {
      const veracodeValue = sec.flawCounts.veracode?.[sev] || 0
      const sonarValue = sec.flawCounts.sonar?.[sev] || 0

      if (totals.veracode[sev] !== undefined)
        totals.veracode[sev] += veracodeValue
      if (totals.sonar[sev] !== undefined) totals.sonar[sev] += sonarValue

      rowTotal += veracodeValue + sonarValue

      if (veracodeValue === sonarValue && veracodeValue === 0) {
        html += '<td class="center" colspan="2" style="width: 10%">0</td>'
      } else if (veracodeValue === sonarValue) {
        html += `<td class="center" colspan="2" style="width: 10%">${sonarValue}</td>`
      } else {
        html += `<td class="center" style="width: 5%">${veracodeValue}</td><td class="center" style="width: 5%">${sonarValue}</td>`
      }
    }

    html += `<td class="center"><strong>${rowTotal}</strong></td>`
    html += '</tr>'
  }

  html += '</tbody></table>'

  if (hideTotals) return html

  // Add the summary row ready to paste in the online Excel file Security_Vulnerability_Status
  // https://neoxam.sharepoint.com/:x:/r/_layouts/15/doc2.aspx?sourcedoc=%7B6270EB1E-FD6C-42C5-8E63-314DEB0281AE%7D&file=Security_Vulnerability_Status.xlsx

  html += '<h3>Summary Data for Excel:</h3>'
  html +=
    '<table border="1" cellspacing="0" cellpadding="4" style="font-size: 11pt; font-family: Calibri;">'
  html += '<thead><tr>'
  html +=
    '<th>Team</th><th>Application</th><th>Version</th><th>Analysis Type</th><th>Last scan date</th><th>Scan tool</th>'
  html += '<th colspan="4">Veracode</th><th colspan="4">SonarQube</th>'
  html += '</tr></thead>'
  html += '<thead><tr><th></th><th></th><th></th><th></th><th></th><th></th>'
  html += '<th>Very high</th><th>High</th><th>Medium</th><th>Low</th>'
  html += '<th>Very high</th><th>High</th><th>Medium</th><th>Low</th>'
  html += '</tr></thead><tbody>'
  html += '<tr>'
  html += `<td>Impress</td><td>${label}</td><td>${version}</td><td>SAST</td><td>${new Date().toISOString().split('T')[0]}</td><td>Veracode + SonarQube</td>`
  html += `<td>${totals.veracode['Very High']}</td><td>${totals.veracode.High}</td><td>${totals.veracode.Medium}</td><td>${totals.veracode.Low}</td>`
  html += `<td>${totals.sonar['Very High']}</td><td>${totals.sonar.High}</td><td>${totals.sonar.Medium}</td><td>${totals.sonar.Low}</td>`
  html += '</tr>'
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
  html += '<div style="display: inline-block; margin-right: 2em;">'
  html +=
    '<label><input type="checkbox" class="scanner-filter" value="veracode" checked> Veracode</label>'
  html +=
    '<label><input type="checkbox" class="scanner-filter" value="sonar" checked> SonarQube</label>'
  html += '</div>'
  html += '<div style="display: inline-block;">'
  for (const sev of ['Very High', 'High', 'Medium', 'Low']) {
    const val = sev.toLowerCase().replace(' ', '-')
    html += `<label><input type="checkbox" class="sev-filter" value="${val}" checked> ${sev}</label>`
  }
  html += '</div></div></div>'
  return html
}

// MAIN SCRIPT
const veracodeFiles = fs
  .readdirSync(folderPath)
  .filter((f) => f.startsWith('veracode-scan-') && f.endsWith('.json'))
const sonarFiles = fs
  .readdirSync(folderPath)
  .filter((f) => f.startsWith('sonar-scan-') && f.endsWith('.json'))
const semgrepFiles = fs
  .readdirSync(folderPath)
  .filter((f) => f.startsWith('semgrep-scan-') && f.endsWith('.json'))

const summarySections = []
const detailSections = []
const results = {}

// Process Veracode files
for (const file of veracodeFiles) {
  console.log(`Processing ${file}`)
  const filePath = path.join(folderPath, file)
  const content = fs.readFileSync(filePath, 'utf8')
  const sectionTitle = formatSectionTitle(file)
  const json = JSON.parse(content)

  const flaws = parseVeracodeFlaws(json)

  if (!results[sectionTitle]) {
    results[sectionTitle] = {
      flaws: [],
      flawCounts: { veracode: {}, sonar: {}, semgrep: {} }
    }
  }

  results[sectionTitle].flaws.push(...flaws)
  results[sectionTitle].flawCounts.veracode = countSeverity(flaws)
}

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
      flawCounts: { veracode: {}, sonar: {}, semgrep: {} }
    }
  }

  results[sectionTitle].flaws.push(...flaws)
  results[sectionTitle].flawCounts.semgrep = countSeverity(flaws)
}

// Process SonarQube files (when format provided)
for (const file of sonarFiles) {
  console.log(`Processing ${file}`)
  const filePath = path.join(folderPath, file)
  const content = fs.readFileSync(filePath, 'utf8')
  const sectionTitle = formatSectionTitle(file)
  const json = JSON.parse(content)

  const flaws = parseSonarFlaws(json)

  if (!results[sectionTitle]) {
    results[sectionTitle] = {
      flaws: [],
      flawCounts: { veracode: {}, sonar: {} }
    }
  }

  results[sectionTitle].flaws.push(...flaws)
  results[sectionTitle].flawCounts.sonar = countSeverity(flaws)
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
      const activeScanners = Array.from(document.querySelectorAll('.scanner-filter:checked')).map(el => el.value);
      const activeSevs = Array.from(document.querySelectorAll('.sev-filter:checked')).map(el => el.value);
      document.querySelectorAll('.flaw-table tbody tr').forEach(row => {
        const classes = Array.from(row.classList);
        const match1 = activeScanners.some(scanner => classes.includes('scanner-' + scanner));
        const match2 = activeSevs.some(sev => classes.includes('severity-' + sev));
        row.style.display = match1 && match2 ? '' : 'none';
      });
    }
    document.querySelectorAll('.scanner-filter, .sev-filter').forEach(cb => {
      cb.addEventListener('change', updateFilters);
    });
  </script>
</body>
</html>`

const outputFile = `${folderPath}/scan-report-${version}.html`
fs.writeFileSync(outputFile, html, 'utf-8')
console.log(`Scan report generated: ${outputFile}`)

if (process.env.PUBLISH_SCAN_REPORT === 'true') {
  const outputFileTable = `${folderPath}/scan-summary-${version}.html`
  fs.writeFileSync(
    outputFileTable,
    function generateCombinedSummaryTable(summarySections, hideTotals = false) {
      const severities = ['Very High', 'High', 'Medium', 'Low']
      const totals = {
        veracode: { 'Very High': 0, High: 0, Medium: 0, Low: 0 },
        sonar: { 'Very High': 0, High: 0, Medium: 0, Low: 0 },
        semgrep: { 'Very High': 0, High: 0, Medium: 0, Low: 0 }
      }

      let html = '<table border="1" cellspacing="0" cellpadding="4">'

      // Header 1
      html += '<thead><tr><th style="vertical-align: middle;">Component</th>'
      for (const sev of severities) {
        html += `<th class="center" colspan="3">${sev}</th>`
      }
      html += '<th>Total</th></tr></thead>'

      // Header 2
      html += '<thead><tr><th></th>'
      severities.forEach(() => {
        html += '<th class="center">Veracode</th><th class="center">SonarQube</th><th class="center">Semgrep</th>'
      })
      html += '<th></th></tr></thead><tbody>'

      // Rows
      for (const sec of summarySections) {
        html += '<tr>'
        html += `<td><a href="#${sec.detailId}">${sec.title}</a></td>`

        let rowTotal = 0
        for (const sev of severities) {
          const veracodeValue = sec.flawCounts.veracode?.[sev] || 0
          const sonarValue = sec.flawCounts.sonar?.[sev] || 0
          const semgrepValue = sec.flawCounts.semgrep?.[sev] || 0

          if (totals.veracode[sev] !== undefined)
            totals.veracode[sev] += veracodeValue
          if (totals.sonar[sev] !== undefined) totals.sonar[sev] += sonarValue
          if (totals.semgrep[sev] !== undefined) totals.semgrep[sev] += semgrepValue

          rowTotal += veracodeValue + sonarValue + semgrepValue

          if (veracodeValue === sonarValue && sonarValue === semgrepValue && veracodeValue === 0) {
            html += '<td class="center" colspan="3" style="width: 15%">0</td>'
          } else if (veracodeValue === sonarValue && sonarValue === semgrepValue) {
            html += `<td class="center" colspan="3" style="width: 15%">${semgrepValue}</td>`
          } else {
            html += `<td class="center" style="width: 5%">${veracodeValue}</td><td class="center" style="width: 5%">${sonarValue}</td><td class="center" style="width: 5%">${semgrepValue}</td>`
          }
        }

        html += `<td class="center"><strong>${rowTotal}</strong></td>`
        html += '</tr>'
      }

      html += '</tbody></table>'

      if (hideTotals) return html

      // Add the summary row ready to paste in the online Excel file Security_Vulnerability_Status
      html += '<h3>Summary Data for Excel:</h3>'
      html +=
        '<table border="1" cellspacing="0" cellpadding="4" style="font-size: 11pt; font-family: Calibri;">'
      html += '<thead><tr>'
      html +=
        '<th>Team</th><th>Application</th><th>Version</th><th>Analysis Type</th><th>Last scan date</th><th>Scan tool</th>'
      html += '<th colspan="4">Veracode</th><th colspan="4">SonarQube</th><th colspan="4">Semgrep</th>'
      html += '</tr></thead>'
      html += '<thead><tr><th></th><th></th><th></th><th></th><th></th><th></th>'
      html += '<th>Very high</th><th>High</th><th>Medium</th><th>Low</th>'
      html += '<th>Very high</th><th>High</th><th>Medium</th><th>Low</th>'
      html += '<th>Very high</th><th>High</th><th>Medium</th><th>Low</th>'
      html += '</tr></thead><tbody>'
      html += '<tr>'
      html += `<td>Impress</td><td>${label}</td><td>${version}</td><td>SAST</td><td>${new Date().toISOString().split('T')[0]}</td><td>Veracode + SonarQube + Semgrep</td>`
      html += `<td>${totals.veracode['Very High']}</td><td>${totals.veracode.High}</td><td>${totals.veracode.Medium}</td><td>${totals.veracode.Low}</td>`
      html += `<td>${totals.sonar['Very High']}</td><td>${totals.sonar.High}</td><td>${totals.sonar.Medium}</td><td>${totals.sonar.Low}</td>`
      html += `<td>${totals.semgrep['Very High']}</td><td>${totals.semgrep.High}</td><td>${totals.semgrep.Medium}</td><td>${totals.semgrep.Low}</td>`
      html += '</tr>'
      html += '</tbody></table>'

      return html
    }

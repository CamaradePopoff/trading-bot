import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function pathExists(targetPath) {
  return fs.existsSync(targetPath)
}

const PACKAGE_PATH = path.resolve(process.argv[2] || '.')
const ITEM = process.argv[3] || path.basename(process.cwd())
const VERSION = process.argv[4] || 'latest'
const DEPTH = process.argv[5] || '999'

if (!pathExists(PACKAGE_PATH)) {
  console.error(`Package path not found: ${PACKAGE_PATH}`)
  console.error(
    'Usage: node license-checks.js <path/to/package.json> <item> <version:latest>'
  )
  process.exit(1)
}

const stat = fs.statSync(PACKAGE_PATH)
const START_PATH = stat.isDirectory()
  ? PACKAGE_PATH
  : path.basename(PACKAGE_PATH).toLowerCase() === 'package.json'
    ? path.dirname(PACKAGE_PATH)
    : null

if (!START_PATH) {
  console.error(`Invalid start path: ${PACKAGE_PATH}`)
  console.error(
    'Provide a project folder or a path to package.json as the first argument.'
  )
  process.exit(1)
}

fs.mkdirSync('out', { recursive: true })

const file1 = `out/${ITEM}-licenses-prod.json`
const file2 = `out/${ITEM}-licenses-dev.json`
const cmd1 = `npx license-checker-rseidelsohn --production --json --depth ${DEPTH} --start "${START_PATH}" --out "${file1}"`
const cmd2 = `npx license-checker-rseidelsohn --development --json --depth ${DEPTH} --start "${START_PATH}" --out "${file2}"`

function runLicenseCheck(scope, command, outputFile) {
  try {
    execSync(command, { stdio: 'inherit' })

    if (!pathExists(outputFile)) {
      if (scope === 'development') {
        fs.writeFileSync(outputFile, '{}', 'utf8')
        console.warn(
          `No ${scope} license output generated for ${ITEM}. Generated empty report.`
        )
        return
      }
      throw new Error(
        `License checker did not generate expected file: ${outputFile}`
      )
    }
  } catch (error) {
    const message = String(error?.message || '')
    if (
      message.includes('No packages found in this path') ||
      scope === 'development'
    ) {
      fs.writeFileSync(outputFile, '{}', 'utf8')
      console.warn(
        `Unable to collect ${scope} dependencies for ${ITEM}. Generated empty report.`
      )
      return
    }
    throw error
  }
}

function summarizeLicenses(licenseData) {
  const summary = {}
  for (const pkg in licenseData) {
    const licenseEntry = licenseData[pkg].licenses
    // Handle cases where `licenses` might be an array or string
    const licenses = Array.isArray(licenseEntry)
      ? licenseEntry
      : licenseEntry
          .split(/(?:\s+OR\s+|\s+AND\s+|,\s*)/) // Split composite licenses
          .map((license) => license.trim().replace(/[()]/g, '')) // Remove parentheses

    for (const license of licenses) {
      const trimmed = license.trim()
      summary[trimmed] = (summary[trimmed] || 0) + 1
    }
  }
  return Object.fromEntries(Object.entries(summary).sort((a, b) => b[1] - a[1]))
}

function generateLicenseReport(licenseData, item, scope, version) {
  const title = `${scope} License Report - ${item} - ${version} - ${new Date().toISOString().split('T')[0]}`
  const summary = summarizeLicenses(licenseData)
  let html = `
    <doctype html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          h1 { margin-bottom: 20px; }
        </style>
        <title>${title}</title>
      </head>
      <body>
        <h1>${title}</h1>
        <h2>License Type Summary</h2>
        <table>
          <thead>
            <tr>
              <th>License</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>`
  for (const [license, count] of Object.entries(summary)) {
    html += `
            <tr>
              <td>${license}</td>
              <td>${count}</td>
            </tr>`
  }

  html += `
          </tbody>
        </table>
        <h2>License Type Details</h2>
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>License</th>
              <th>Repository</th>
              <th>Publisher</th>
              <th>Email</th>
              <th>License file</th>
            </tr>
          </thead>
          <tbody>`
  for (const [pkg, info] of Object.entries(licenseData)) {
    html += `
      <tr>
        <td>${pkg}</td>
        <td>${info.licenses || 'N/A'}</td>
        <td>${info.repository ? `<a href="${info.repository}" target="_blank">${info.repository}</a>` : 'N/A'}</td>
        <td>${info.publisher || 'N/A'}</td>
        <td>${info.email || 'N/A'}</td>
        <td>${info.licenseFile || 'N/A'}</td>
      </tr>`
  }
  html += `
          </tbody>
        </table>
      </body>
    </html>`
  return html
}

try {
  runLicenseCheck('production', cmd1, file1)
  runLicenseCheck('development', cmd2, file2)
  ;[file1, file2].forEach((file) => {
    if (!pathExists(file)) {
      throw new Error(
        `File ${file} does not exist after running license-checker command.`
      )
    }
    const licenseData = JSON.parse(fs.readFileSync(file, 'utf8'))
    const htmlReport = generateLicenseReport(
      licenseData,
      ITEM,
      file.endsWith('-prod.json') ? 'Production' : 'Development',
      VERSION
    )
    fs.writeFileSync(file.replace(/\.json$/, '.html'), htmlReport, 'utf8')
    fs.unlinkSync(file)
  })
  console.log(
    `License reports generated successfully for ${ITEM} ${VERSION} in ${path.resolve('out')}`
  )
} catch (error) {
  console.error('Error during license checks:', error.message)
  process.exit(1)
}

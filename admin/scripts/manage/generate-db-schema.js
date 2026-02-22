import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const MODELS_DIR = path.join(__dirname, '../../../backend/models')
const OUTPUT_FILE = path.join(__dirname, '../../../doc/database-schema.puml')

/**
 * Parse a Mongoose schema field to extract type and relationship info
 */
function parseField(fieldName, fieldDef) {
  let normalizedFieldDef = fieldDef

  const field = {
    name: fieldName,
    type: 'String',
    required: false,
    isArray: false,
    isRef: false,
    refModel: null,
    enum: null,
    default: null
  }

  if (!normalizedFieldDef || typeof normalizedFieldDef !== 'object') {
    return field
  }

  // Handle array types
  if (Array.isArray(normalizedFieldDef)) {
    field.isArray = true
    if (
      normalizedFieldDef.length > 0 &&
      typeof normalizedFieldDef[0] === 'object'
    ) {
      normalizedFieldDef = normalizedFieldDef[0]
    } else {
      return field
    }
  }

  // Extract type
  if (normalizedFieldDef.type) {
    const typeStr = normalizedFieldDef.type.toString()

    if (typeStr.includes('ObjectId')) {
      field.type = 'ObjectId'
      field.isRef = !!normalizedFieldDef.ref
      field.refModel = normalizedFieldDef.ref || null
    } else if (typeStr.includes('String')) {
      field.type = 'String'
    } else if (typeStr.includes('Number')) {
      field.type = 'Number'
    } else if (typeStr.includes('Boolean')) {
      field.type = 'Boolean'
    } else if (typeStr.includes('Date')) {
      field.type = 'Date'
    } else if (typeStr.includes('Array')) {
      field.isArray = true
    }
  }

  // Extract metadata
  field.required = !!normalizedFieldDef.required
  field.unique = !!normalizedFieldDef.unique

  if (normalizedFieldDef.enum) {
    field.enum = Array.isArray(normalizedFieldDef.enum)
      ? normalizedFieldDef.enum
      : null
  }

  if (normalizedFieldDef.default !== undefined) {
    field.default = normalizedFieldDef.default
  }

  return field
}

/**
 * Extract schema definition from a Mongoose model file
 */
function extractSchemaFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Extract model name
  const modelMatch = content.match(/mongoose\.model\(['"](\w+)['"]/)
  if (!modelMatch) {
    console.warn(`Could not find model name in ${filePath}`)
    return null
  }

  const modelName = modelMatch[1]
  const fields = []
  const relationships = []

  // Extract collection name
  let collectionName = modelName.toLowerCase() + 's'
  const collectionMatch = content.match(/collection:\s*['"]([^'"]+)['"]/)
  if (collectionMatch) {
    collectionName = collectionMatch[1]
  }

  // Parse schema fields - extract everything between first { and the closing }, before the options
  const schemaMatch = content.match(
    /new Schema\s*\(\s*\{([\s\S]*?)\n\s*\},\s*\{/m
  )
  if (!schemaMatch) {
    console.warn(`Could not find schema definition in ${filePath}`)
    return null
  }

  const schemaContent = schemaMatch[1]

  // Split into lines and process
  const lines = schemaContent.split('\n')
  let currentField = null
  let braceCount = 0
  let fieldLines = []

  for (let line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    // Check if this starts a new field (fieldName: { or fieldName: [)
    const fieldStart = trimmed.match(/^(\w+):\s*[{[]/)

    if (fieldStart && braceCount === 0) {
      // Process previous field if exists
      if (currentField && fieldLines.length > 0) {
        const fieldBuffer = fieldLines.join(' ')
        processFieldBuffer(
          currentField,
          fieldBuffer,
          fields,
          relationships,
          modelName
        )
      }

      // Start new field
      currentField = fieldStart[1]
      fieldLines = [trimmed]

      // Count braces/brackets
      for (let char of trimmed) {
        if (char === '{' || char === '[') braceCount++
        if (char === '}' || char === ']') braceCount--
      }
    } else if (currentField) {
      // Continue current field
      fieldLines.push(trimmed)

      // Count braces/brackets
      for (let char of trimmed) {
        if (char === '{' || char === '[') braceCount++
        if (char === '}' || char === ']') braceCount--
      }
    }

    // If we closed the field
    if (currentField && braceCount === 0 && fieldLines.length > 0) {
      const fieldBuffer = fieldLines.join(' ')
      processFieldBuffer(
        currentField,
        fieldBuffer,
        fields,
        relationships,
        modelName
      )
      currentField = null
      fieldLines = []
    }
  }

  return {
    modelName,
    collectionName,
    fields,
    relationships
  }
}

/**
 * Process accumulated field buffer to extract field information
 */
function processFieldBuffer(
  fieldName,
  buffer,
  fields,
  relationships,
  sourceModel
) {
  const fieldInfo = {
    name: fieldName,
    type: 'String',
    required: false,
    unique: false,
    isArray: false,
    isRef: false,
    refModel: null,
    default: null
  }

  // Check if it's an array
  if (buffer.includes('[{') || buffer.match(/\[\s*\{/)) {
    fieldInfo.isArray = true
  }

  // Extract type
  const typeMatch = buffer.match(/type:\s*(\w+(?:\.\w+)*(?:\.\w+)*)/)
  if (typeMatch) {
    const typeStr = typeMatch[1]
    if (typeStr.includes('ObjectId')) {
      fieldInfo.type = 'ObjectId'
      // Check for ref
      const refMatch = buffer.match(/ref:\s*['"](\w+)['"]/)
      if (refMatch) {
        fieldInfo.isRef = true
        fieldInfo.refModel = refMatch[1]

        // Add relationship
        relationships.push({
          from: sourceModel,
          to: refMatch[1],
          type: fieldInfo.isArray ? 'one-to-many' : 'many-to-one',
          fieldName: fieldName
        })
      }
    } else if (typeStr.includes('String')) {
      fieldInfo.type = 'String'
    } else if (typeStr.includes('Number')) {
      fieldInfo.type = 'Number'
    } else if (typeStr.includes('Boolean')) {
      fieldInfo.type = 'Boolean'
    } else if (typeStr.includes('Date')) {
      fieldInfo.type = 'Date'
    }
  } else if (buffer.match(/\[\s*\{.*type:\s*String/)) {
    // Array of strings
    fieldInfo.type = 'String'
    fieldInfo.isArray = true
  }

  // Check required
  if (buffer.includes('required: true')) {
    fieldInfo.required = true
  }

  // Check unique
  if (buffer.includes('unique: true')) {
    fieldInfo.unique = true
  }

  // Check default
  const defaultMatch = buffer.match(/default:\s*([^,}]+)/)
  if (defaultMatch) {
    fieldInfo.default = defaultMatch[1].trim()
  }

  fields.push(fieldInfo)
}

/**
 * Generate PlantUML ERD from parsed schemas
 */
function generatePlantUML(schemas) {
  let puml = `@startuml database-schema

hide empty members

skinparam class {
  BackgroundColor LightYellow
  BorderColor Black
  ArrowColor Black
}

`

  // Generate classes
  for (const schema of schemas) {
    puml += `class ${schema.modelName} {\n`
    puml += '  _id: ObjectId\n'

    for (const field of schema.fields) {
      // Format field name
      let fieldName = field.name

      // Format type
      let typeStr = field.type
      if (field.isArray) {
        typeStr = `${typeStr}[]`
      }

      puml += `  ${fieldName}: ${typeStr}\n`
    }

    puml += '}\n\n'
  }

  // Generate relationships
  const processedRelationships = new Set()

  for (const schema of schemas) {
    for (const rel of schema.relationships) {
      const relKey = `${rel.from}-${rel.to}-${rel.fieldName}`

      // Avoid duplicate relationships
      if (processedRelationships.has(relKey)) continue
      processedRelationships.add(relKey)

      // Find if there's a reverse relationship
      const reverseSchema = schemas.find((s) => s.modelName === rel.to)
      const hasReverse = reverseSchema?.relationships.some(
        (r) => r.from === rel.to && r.to === rel.from
      )

      if (rel.type === 'many-to-one') {
        puml += `${rel.from} --> ${rel.to} : ${rel.fieldName}\n`
      } else if (rel.type === 'one-to-many') {
        puml += `${rel.from} "1" --> "*" ${rel.to} : ${rel.fieldName}\n`
      }
    }
  }

  puml += '\n@enduml\n'
  return puml
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning Mongoose models...')

  // Read all model files
  const modelFiles = fs
    .readdirSync(MODELS_DIR)
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(MODELS_DIR, file))

  console.log(`📄 Found ${modelFiles.length} model files`)

  // Extract schemas
  const schemas = []
  for (const filePath of modelFiles) {
    console.log(`   Processing: ${path.basename(filePath)}`)
    const schema = extractSchemaFromFile(filePath)
    if (schema) {
      schemas.push(schema)
    }
  }

  console.log(`\n✅ Successfully parsed ${schemas.length} models`)

  // Generate PlantUML
  console.log('🎨 Generating PlantUML diagram...')
  const puml = generatePlantUML(schemas)

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, puml, 'utf8')

  console.log(`\n✅ Database schema diagram generated successfully!`)
  console.log(`📍 Output: ${OUTPUT_FILE}`)
  console.log('\n💡 To visualize the diagram:')
  console.log('   1. Install PlantUML extension in VS Code')
  console.log('   2. Open the generated .puml file')
  console.log('   3. Press Alt+D to preview the diagram')
  console.log('\nOr use online: https://www.plantuml.com/plantuml/uml/')
}

// Run the script
main()

export { extractSchemaFromFile, generatePlantUML }

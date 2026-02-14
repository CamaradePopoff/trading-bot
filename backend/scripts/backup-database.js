const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config()

const BACKUP_DIR = path.join(__dirname, '../backups')
const RETENTION_DAYS = 7

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`)

  try {
    console.log(
      `[BACKUP] Starting database backup at ${new Date().toISOString()}`
    )

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray()
    const backup = {}

    // Export each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      console.log(`[BACKUP] Exporting collection: ${collectionName}`)

      const collection = mongoose.connection.db.collection(collectionName)
      const documents = await collection.find({}).toArray()

      backup[collectionName] = documents
      console.log(
        `[BACKUP] Exported ${documents.length} documents from ${collectionName}`
      )
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    console.log(`[BACKUP] Database backup completed: ${backupFile}`)

    // Clean up old backups
    await cleanupOldBackups()

    return backupFile
  } catch (error) {
    console.error('[BACKUP] Error during backup:', error)
    throw error
  }
}

async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
    const backupFiles = files.filter(
      (file) => file.startsWith('backup-') && file.endsWith('.json')
    )

    const now = Date.now()
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000

    let deletedCount = 0
    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file)
      const stats = fs.statSync(filePath)
      const fileAge = now - stats.mtimeMs

      if (fileAge > retentionMs) {
        fs.unlinkSync(filePath)
        console.log(`[BACKUP] Deleted old backup: ${file}`)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      console.log(`[BACKUP] Cleaned up ${deletedCount} old backup(s)`)
    }
  } catch (error) {
    console.error('[BACKUP] Error during cleanup:', error)
  }
}

async function restoreDatabase(backupFile) {
  try {
    console.log(`[RESTORE] Starting database restoration from ${backupFile}`)

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`)
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))

    for (const [collectionName, documents] of Object.entries(backupData)) {
      console.log(`[RESTORE] Restoring collection: ${collectionName}`)

      const collection = mongoose.connection.db.collection(collectionName)

      // Clear existing data (optional - comment out if you want to merge)
      // await collection.deleteMany({})

      if (documents.length > 0) {
        await collection.insertMany(documents)
        console.log(
          `[RESTORE] Restored ${documents.length} documents to ${collectionName}`
        )
      }
    }

    console.log('[RESTORE] Database restoration completed')
  } catch (error) {
    console.error('[RESTORE] Error during restoration:', error)
    throw error
  }
}

// CLI usage
if (require.main === module) {
  const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/trade-bot'

  mongoose
    .connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    .then(async () => {
      console.log('Database connected.')

      const command = process.argv[2]

      if (command === 'backup') {
        await backupDatabase()
        process.exit(0)
      } else if (command === 'restore' && process.argv[3]) {
        await restoreDatabase(process.argv[3])
        process.exit(0)
      } else {
        console.log('Usage:')
        console.log('  node backup-database.js backup')
        console.log('  node backup-database.js restore <backup-file>')
        process.exit(1)
      }
    })
    .catch((err) => {
      console.error('Database connection error:', err)
      process.exit(1)
    })
}

module.exports = { backupDatabase, restoreDatabase, cleanupOldBackups }

/**
 * Migration Script: Encrypt Existing Exchange API Keys
 *
 * This script encrypts all existing API keys in the database.
 * Run this ONCE after deploying the encryption service.
 *
 * Usage: node backend/scripts/migrate-encrypt-keys.js
 */

const mongoose = require('mongoose')
const { encrypt, isEncrypted } = require('../services/encryption-service')
const Exchange = require('../models/exchange')
require('dotenv').config()

async function migrateKeys() {
  try {
    console.log('Starting API key encryption migration...\n')

    // Check for required environment variables
    if (!process.env.ENCRYPTION_KEY) {
      console.error('ERROR: ENCRYPTION_KEY environment variable is not set!')
      console.error('Please set ENCRYPTION_KEY in your .env file.')
      console.error('\nGenerate a key with:')
      console.error(
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      )
      process.exit(1)
    }

    if (!process.env.MONGODB_URI) {
      console.error('ERROR: MONGODB_URI environment variable is not set!')
      process.exit(1)
    }

    // Connect to database
    console.log(`Connecting to database: ${process.env.MONGODB_URI}`)
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected successfully.\n')

    // Get all exchanges
    const exchanges = await Exchange.find({})
    console.log(`Found ${exchanges.length} exchange(s) in database.\n`)

    if (exchanges.length === 0) {
      console.log('No exchanges found. Migration complete.')
      await mongoose.disconnect()
      return
    }

    let encryptedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each exchange
    for (const ex of exchanges) {
      try {
        let updated = false
        const exchangeInfo = `${ex.name} (User: ${ex.userId})`

        // Check and encrypt API key
        if (ex.apiKey) {
          if (isEncrypted(ex.apiKey)) {
            console.log(
              `⏭️  Skipping ${exchangeInfo} - apiKey already encrypted`
            )
            skippedCount++
            continue
          } else {
            console.log(`🔐 Encrypting ${exchangeInfo}...`)
            ex.apiKey = encrypt(ex.apiKey)
            updated = true
          }
        }

        // Check and encrypt API secret
        if (ex.apiSecret && !isEncrypted(ex.apiSecret)) {
          ex.apiSecret = encrypt(ex.apiSecret)
          updated = true
        }

        // Check and encrypt API passphrase
        if (ex.apiPassphrase && !isEncrypted(ex.apiPassphrase)) {
          ex.apiPassphrase = encrypt(ex.apiPassphrase)
          updated = true
        }

        // Save if updated
        if (updated) {
          await ex.save()
          encryptedCount++
          console.log(`✅ Encrypted ${exchangeInfo}`)
        }
      } catch (error) {
        errorCount++
        console.error(
          `❌ Error encrypting ${ex.name} (User: ${ex.userId}):`,
          error.message
        )
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total exchanges:     ${exchanges.length}`)
    console.log(`✅ Encrypted:        ${encryptedCount}`)
    console.log(`⏭️  Skipped (already): ${skippedCount}`)
    console.log(`❌ Errors:           ${errorCount}`)
    console.log('='.repeat(60))

    if (encryptedCount > 0) {
      console.log('\n✅ Migration completed successfully!')
      console.log('API keys are now encrypted in the database.')
    } else if (skippedCount > 0) {
      console.log('\n⏭️  All keys were already encrypted. No changes made.')
    }

    if (errorCount > 0) {
      console.log('\n⚠️  WARNING: Some exchanges could not be encrypted.')
      console.log(
        'Please review the errors above and re-run the migration if needed.'
      )
    }

    // Disconnect
    await mongoose.disconnect()
    console.log('\nDatabase connection closed.')
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run migration
console.log('='.repeat(60))
console.log('API KEY ENCRYPTION MIGRATION')
console.log('='.repeat(60))
console.log('This will encrypt all exchange API keys in the database.')
console.log('Make sure you have set ENCRYPTION_KEY in your .env file.\n')

migrateKeys().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

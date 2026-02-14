const Selling = require('../models/selling')

/**
 * Database Maintenance Service
 * Handles periodic cleanup and maintenance tasks for the database
 */
module.exports = (io = null, log = console) => {
  return {
    /**
     * Clean up duplicate selling records
     * For each associatedPurchase, keeps only one selling record
     * When duplicates exist, discards records with negative profit
     */
    async cleanupDuplicateSellings() {
      try {
        log.info('🧹 Starting duplicate selling records cleanup...')

        // Find all sellings grouped by associatedPurchase
        const duplicates = await Selling.aggregate([
          {
            $group: {
              _id: '$associatedPurchase',
              count: { $sum: 1 },
              records: { $push: '$$ROOT' }
            }
          },
          {
            $match: {
              count: { $gt: 1 }
            }
          }
        ])

        if (duplicates.length === 0) {
          log.info('✅ No duplicate selling records found.')
          return { cleaned: 0, duplicatesFound: 0 }
        }

        log.info(
          `⚠️  Found ${duplicates.length} purchases with duplicate selling records`
        )

        let totalCleaned = 0

        // Process each duplicate group
        for (const group of duplicates) {
          const { _id: associatedPurchaseId, records } = group

          log.info(
            `  Processing purchase ${associatedPurchaseId} with ${records.length} selling records`
          )

          // Sort records by profit (highest first) to determine which to keep
          const sorted = records.sort((a, b) => {
            // Prefer records with non-negative profit
            const aIsNegative = a.profit < 0
            const bIsNegative = b.profit < 0

            if (aIsNegative && !bIsNegative) return 1 // b is better
            if (!aIsNegative && bIsNegative) return -1 // a is better

            // Both negative or both positive, keep the one with higher profit
            return b.profit - a.profit
          })

          // Keep the first (best) record, delete the rest
          const recordToKeep = sorted[0]
          const recordsToDelete = sorted.slice(1)

          log.info(
            `    Keeping record: ${recordToKeep._id} (profit: ${recordToKeep.profit})`
          )

          for (const recordToRemove of recordsToDelete) {
            log.info(
              `    Deleting record: ${recordToRemove._id} (profit: ${recordToRemove.profit})`
            )
            await Selling.deleteOne({ _id: recordToRemove._id })
            totalCleaned++
          }
        }

        log.info(
          `✅ Cleanup complete. Deleted ${totalCleaned} duplicate selling records.`
        )
        return { cleaned: totalCleaned, duplicatesFound: duplicates.length }
      } catch (error) {
        log.error(`❌ Error during duplicate selling cleanup: ${error.message}`)
        log.error(`📝 Stack: ${error.stack}`)
        throw error
      }
    },

    /**
     * Run all maintenance tasks
     */
    async runMaintenanceTasks() {
      try {
        log.info('🔧 Running database maintenance tasks...')

        const results = {
          duplicateSellings: await this.cleanupDuplicateSellings()
        }

        log.info('🔧 Database maintenance complete.')
        return results
      } catch (error) {
        log.error(`❌ Error during maintenance tasks: ${error.message}`)
        throw error
      }
    }
  }
}

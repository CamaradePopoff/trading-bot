module.exports = {
  async up(db, client) {
    // Get all bots
    const bots = await db.collection('bots').find({}).toArray()
    
    console.log(`Migrating ${bots.length} bots...`)
    
    // For each bot, set the two new fields based on the old stopBuying field
    for (const bot of bots) {
      const stopBuyingValue = bot.stopBuying || false
      
      await db.collection('bots').updateOne(
        { _id: bot._id },
        {
          $set: {
            stopBuyingOnDrop: stopBuyingValue,
            stopBuyingOnRebuy: stopBuyingValue
          },
          $unset: {
            stopBuying: ''
          }
        }
      )
    }
    
    console.log('Migration complete: Split stopBuying into stopBuyingOnDrop and stopBuyingOnRebuy')
  },

  async down(db, client) {
    // Get all bots
    const bots = await db.collection('bots').find({}).toArray()
    
    console.log(`Rolling back ${bots.length} bots...`)
    
    // For each bot, restore the old stopBuying field
    // Set it to true if either of the new fields is true
    for (const bot of bots) {
      const stopBuyingValue = bot.stopBuyingOnDrop || bot.stopBuyingOnRebuy || false
      
      await db.collection('bots').updateOne(
        { _id: bot._id },
        {
          $set: {
            stopBuying: stopBuyingValue
          },
          $unset: {
            stopBuyingOnDrop: '',
            stopBuyingOnRebuy: ''
          }
        }
      )
    }
    
    console.log('Rollback complete: Restored stopBuying field')
  }
}

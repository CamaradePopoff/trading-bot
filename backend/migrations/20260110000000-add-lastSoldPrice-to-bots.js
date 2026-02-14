module.exports = {
  async up(db, client) {
    // Add lastSoldPrice field to all existing bots (set to 0 by default)
    await db.collection('bots').updateMany(
      { lastSoldPrice: { $exists: false } },
      { $set: { lastSoldPrice: 0 } }
    )
    
    console.log('Added lastSoldPrice field to existing bots')
  },

  async down(db, client) {
    // Remove lastSoldPrice field from all bots
    await db.collection('bots').updateMany(
      {},
      { $unset: { lastSoldPrice: '' } }
    )
    
    console.log('Removed lastSoldPrice field from bots')
  }
}

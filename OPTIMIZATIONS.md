# Trading Bot Optimizations

## Database Query Optimizations

### 1. Add Database Indexes
**Impact: HIGH** - Currently missing critical indexes for frequently queried fields.

Add to `backend/models/purchase.js`:
```javascript
// Add after the schema definition, before module.exports
schema.index({ botId: 1, isSold: 1, isPaused: 1 }); // Compound index for getBotPurchases
schema.index({ botId: 1, isSold: 1, isPaused: 1, targetPrice: 1 }); // For getBotPurchasesAboveTargetPrice
schema.index({ userId: 1, isSold: 1 }); // For getTotalInvestment
schema.index({ botId: 1, createdAt: -1 }); // For transaction lists
```

**Why**: These indexes will dramatically speed up the queries that run every bot cycle:
- `getBotPurchasesAboveTargetPrice` - runs EVERY cycle to check for sells
- `getBotPurchases` - called for high price area checks
- Reduces query time from O(n) to O(log n)

### 2. Cache Bot Purchases in Memory
**Impact: HIGH** - Eliminate repeated DB queries every cycle.

Currently, bot queries DB every cycle even when nothing changes. Instead:
- Load purchases once when bot starts
- Update cache only when purchases/sales happen
- Reduces DB load from N queries/second to only when needed

Implementation: Add to bot.js constructor:
```javascript
this.purchasesCache = null
this.cacheLastUpdate = null
```

### 3. Project Only Required Fields
**Impact: MEDIUM** - Reduce data transfer and parsing.

Change queries to project only needed fields:
```javascript
// Instead of: Purchase.find({ botId }, '-__v').lean()
Purchase.find({ botId }, 'targetPrice amount price paid fee isPaused isSold').lean()
```

### 4. Batch Database Updates
**Impact: MEDIUM** - Reduce DB calls during bot cycle.

Currently updates state 2-3 times per cycle. Instead:
- Collect all state changes during cycle
- Single update at cycle end
- Reduces DB writes by 50-70%

## Bot Cycle Logic Optimizations

### 1. Skip Unnecessary Calculations When Paused
**Impact: MEDIUM** - Save CPU when bot is paused.

Move calculations inside `if (!this.paused)` block:
- `getCurrentThreshold()`
- High price area checks
- Emergency position calculations

### 2. Avoid Redundant Query for Sells
**Impact: MEDIUM** - Skip query when no positions exist.

Add check before querying:
```javascript
if (!this.paused && this.totalTransactions > 0) {
  const purchasesToSell = await this.transactionService.getBotPurchasesAboveTargetPrice(...)
  // ... sell logic
}
```

### 3. Remove Redundant `soldEmergency` Resets
**Impact: LOW** - Cleaner code, marginal performance gain.

The code sets `this.soldEmergency = false` three times in else blocks - consolidate to one location.

### 4. Lazy Load Transaction Service Methods
**Impact: LOW** - Faster bot initialization.

Only require services when actually used, not in constructor.

### 5. Optimize Price Fetching
**Impact: MEDIUM** - Reduce exchange API calls.

Current: Fetches price even when bot hasn't started or is paused.
Better: Share price fetching across all bots (already done in `all-prices.js` but could be better coordinated).

## Implementation Priority

1. **Add Database Indexes** (5 min) - Immediate 50-80% query speedup
2. **Cache Purchases in Memory** (30 min) - Eliminate 90% of DB queries
3. **Batch DB Updates** (20 min) - Reduce DB writes significantly  
4. **Skip Calculations When Paused** (10 min) - CPU savings
5. **Project Only Required Fields** (15 min) - Reduce data transfer
6. **Avoid Redundant Queries** (5 min) - Skip unnecessary work

## Expected Performance Gains

- **DB Query Time**: 50-80% reduction with indexes
- **DB Queries per Cycle**: 90% reduction with caching (from ~3-5 to ~0-1)
- **CPU Usage**: 20-30% reduction when bots are paused
- **Memory Usage**: Small increase (~1-2MB per bot for cache)
- **Bot Cycle Time**: 40-60% reduction overall

## Monitoring

Add metrics to track:
- Query execution times
- Cache hit/miss rates  
- Cycles per second
- DB connection pool usage

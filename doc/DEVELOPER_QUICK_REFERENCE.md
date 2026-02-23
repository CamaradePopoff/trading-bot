# Trading Bot - Developer Quick Reference

A condensed guide for developers working with the trading bot codebase.

---

## 🚀 Quick Start for New Developers

### Understanding the System in 5 Minutes

**What does the bot do?**  
Automatically buys crypto at lower prices, sells when reaching profit targets, and manages multiple positions simultaneously.

**How does it work?**  
1. **In Memory**: Fast bot instances run trading logic every N seconds (configurable)
2. **In Database**: State persisted to MongoDB for recovery and audit
3. **Via Exchange**: Place real orders (or simulate) on KuCoin/Binance/MEXC

**Key Files to Know**
```
backend/
├── bot/
│   ├── bot.js                    ← MemoryBot class (main logic)
│   ├── all-bots.js               ← In-memory bot list
│   ├── all-prices.js             ← Price caching layer
│   ├── utils.js                  ← Exchange abstraction
│   └── exchanges/
│       ├── binance/utils.js
│       ├── kucoin/utils.js
│       └── mexc/utils.js
├── services/
│   ├── bot-service.js            ← Bot orchestration
│   ├── transaction-service.js    ← Buy/sell records
│   └── user-service.js           ← Profit tracking
├── models/
│   ├── bot.js                    ← Bot schema
│   ├── purchase.js               ← Purchase schema
│   └── selling.js                ← Selling schema
└── routes/
    └── bot-routes.js             ← API endpoints
```

---

## 📊 Mental Models

### Memory vs Database

| Layer | Role | When Synced |
|-------|------|-------------|
| **Memory** | Fast trading decisions, state holder | Every cycle, on pause/resume |
| **Database** | Persistent record, recovery source | End of cycle, event changes |

**Key Principle**: Memory is always fresh; database catches up.

### Dual Concepts

Understanding these pairs helps navigate the codebase:

```
MemoryBot ←→ Bot Document
  (Running)    (MongoDB)
  
- Owns main loop       - Owns config history
- Makes trading calls  - Holds state snapshots
- Updates memory fast  - Persists to DB
- Lost on crash        - Survives crashes
```

```
Free Positions ←→ Purchases
  (Bot state)     (Transaction records)
  
- Count of buys      - Individual buy records
- Decrements on buy  - One doc per buy
- Increments on sell - Linked to sell record
- Affects next cycle - Historical audit trail
```

---

## 🔄 Trading Cycle (Per `botInterval` seconds)

```
1. Fetch current price (cached)
2. Bot paused? Skip to step 6
3. Check profitable positions → SELL if found
4. Check buy conditions → BUY if met
5. Batch state changes
6. Persist to database (if changed)
7. Sleep botInterval seconds
8. Repeat
```

**State Changes Batched:**
- `cycles`, `freePositions`, `totalProfit`, `lastHighestPrice`, `totalTransactions`, etc.

**Single DB Update At:**
- End of cycle via `botService.updateBotData(botId, stateChanges)`

---

## 📝 Common Tasks

### Add a Feature to Bot Logic

**Location**: `backend/bot/bot.js` in `MemoryBot` class

Example: Adding a "sell all" command

```javascript
async sellAllPositions() {
  const allPurchases = await this.transactionService.getBotPurchases(this.id, true)
  
  for (const purchase of allPurchases) {
    if (!purchase.isSold) {
      await this.sellNow(purchase, false, true) // force sell
    }
  }
  
  // Update DB
  await this.botService.updateBotData(this.id, {
    freePositions: this.freePositions,
    totalProfit: this.totalProfit,
    totalTransactions: this.totalTransactions
  })
}
```

### Add a New Configuration Parameter

1. **Update schema**: `backend/models/bot.js`
   ```javascript
   config: {
     // ... existing fields
     myNewParam: { type: Number, default: 10 }
   }
   ```

2. **Use in bot**: `backend/bot/bot.js`
   ```javascript
   if (this.currentPrice < this.config.myNewParam) {
     // Some logic
   }
   ```

3. **Update validation**: `backend/middleware/validation.js` (if needed)

4. **Accept via API**: `backend/routes/bot-routes.js` (already generic)

### Add Support for a New Exchange

1. Create: `backend/bot/exchanges/newex/utils.js`

2. Implement 4 functions:
   ```javascript
   module.exports = {
     async getCurrentPrice(user, symbol) { /* ... */ },
     async getTradingPairs(user) { /* ... */ },
     async placeOrder(user, symbol, side, type, price, qty, funds) { /* ... */ },
     async getCryptoBalance(user, asset) { /* ... */ }
   }
   ```

3. Update: `backend/bot/utils.js`
   ```javascript
   const newex = require('./exchanges/newex/utils')
   module.exports = { binance, kucoin, mexc, newex }[process.env.BOT_EXCHANGE]
   ```

4. Set env: `BOT_EXCHANGE=newex npm start`

---

## 🐛 Debugging Tips

### Bot Not Trading

1. **Check if running**: `GET /api/bots/:id` → `hasStarted: true`?
2. **Check paused**: `isPaused: false`?
3. **Check free positions**: `freePositions > 0`?
4. **Check price range**: Is price between `minWorkingPrice` and `maxWorkingPrice`?
5. **Check logs**: `tail -f backend/logs/{botId}/debug_*.log`

### Price Not Updating

1. **Check cache**: In `all-prices.js`, prices cached with 3s TTL
2. **Check exchange API**: Can you fetch manually?
3. **Check API keys**: Are they valid for this user?

### Transaction Not Saving

1. **Check MongoDB**: `db.purchases.find({botId: ...})`
2. **Check balance**: Was there sufficient balance at order time?
3. **Check simulation flag**: If true, orders are fake but should still record

### State Out of Sync

1. **Memory**: Check MemoryBot instance in running process
2. **Database**: Check latest bot document
3. **Solution**: Restart bot (DB has authoritative state)

### Performance Issues

1. **Check prices cache TTL**: 3 seconds is fast, reasonable trade-off
2. **Check purchases query**: `getBotPurchases()` queries all purchases
3. **Check batch size**: Are state changes being batched properly?
4. **Monitor DB latency**: Slow MongoDB = slow trading cycles

---

## 🔍 Key Code Patterns

### Pattern 1: Async Operation Queuing

```javascript
// Ensures operations happen sequentially
async queueOperation(operation) {
  return new Promise((resolve, reject) => {
    this.operationQueue = this.operationQueue.then(
      async () => {
        const result = await operation()
        resolve(result)
      }
    )
  })
}

// Usage: this.pause() uses queueOperation internally
```

### Pattern 2: State Update with DB Persistence

```javascript
// Local state change
this.paused = true

// Persist to DB
await this.botService.updateBotData(this.id, { isPaused: true })

// If error, DB update fails but memory is changed
// → On next restart, DB state is loaded (authoritative)
```

### Pattern 3: Exchange-Agnostic Code

```javascript
// This works for ANY exchange selected
const { placeOrder } = require('./utils')
const order = await placeOrder(user, symbol, 'buy', 'market', null, qty)

// Internally, utils.js delegates to the right exchange module
```

### Pattern 4: Cache Invalidation

```javascript
// After buying, invalidate cache
await this.buyNow(...)
this.purchasesCache = null

// Next query rebuilds from DB
const purchases = await this.transactionService.getBotPurchases(this.id)
```

### Pattern 5: Batch Updates

```javascript
// Accumulate changes
const stateChanges = {}
if (soldOne) {
  stateChanges.freePositions = this.freePositions
  stateChanges.totalProfit = this.totalProfit
  // ... more fields
}

// Single DB update
await this.botService.updateBotData(this.id, stateChanges)
```

---

## 📚 Data Models at a Glance

### Bot Document (MongoDB)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  config: { exchange, symbol, fee, profitMargin, ... },
  cycles: 15432,
  freePositions: 3,
  currentPrice: 42567.89,
  totalProfit: 2340.75,
  hasStarted: true,
  isPaused: false,
  // ... more fields
}
```

### Purchase Document
```javascript
{
  _id: ObjectId,
  botId: ObjectId,
  currency: "BTC-USDT",
  amount: 0.025,           // How much crypto
  price: 42000,           // Buy price
  targetPrice: 42840,     // Sell trigger price
  isSold: false,
  isPaused: false,
  // ... timestamp, user, etc
}
```

### Selling Document
```javascript
{
  _id: ObjectId,
  botId: ObjectId,
  currency: "BTC-USDT",
  amount: 0.025,           // How much sold
  price: 42850,           // Sell price
  profit: 10.97,          // Net profit
  associatedPurchase: ObjectId,  // Links to Purchase
  // ... etc
}
```

---

## 🎯 Common Workflows

### Workflow: Start a Bot

```
Frontend                Backend             Memory              Database
  │                       │                   │                    │
  ├─POST /bots/:id/start─→│                   │                    │
  │                       ├─getBot()──────────────────────────────→│
  │                       │←──────────── dbBot document ────────────┤
  │                       │                   │                    │
  │                       ├─new MemoryBot()───→│                    │
  │                       │    MemoryBot                           │
  │                       ├─bot.start()───────→│                    │
  │                       │   (begins loop)    ├─init check────────→│
  │                       │                    ├─updateBotData────→│
  │                       │                    │ (hasStarted:true)  │
  │                       │                    ├─main loop starts   │
  │                       │                    │ (fetch, trade, ...)│
  │                       │                    ├─every cycle: batch update──→│
  │                       │                    │                    │
  │←──200 OK──────────────┤                    │                    │
  │     (bot started)      │                    │                    │
```

### Workflow: Buy Position

```
Memory Bot Main Loop
  │
  ├─ Fetch price ✓
  ├─ Check buy conditions ✓ (price dropped, free pos, etc)
  │
  ├─buyNow()
  │  ├─ placeOrder() → Exchange → order placed
  │  │
  │  ├─ Memory updates:
  │  │  ├─ freePositions--
  │  │  ├─ totalTransactions++
  │  │  └─ purchasesCache = null
  │  │
  │  └─ SavePurchase to DB
  │     (immediate, don't wait)
  │
  ├─ End of cycle: batch DB update with state changes
  │  {freePositions, totalTransactions, cycles, ...}
  │
  └─ Sleep botInterval seconds
```

### Workflow: Configuration Change by User

```
Frontend                Backend             Memory              Database
  │                       │                   │                    │
  ├─PUT /bots/:id────────→│                   │                    │
  │ {config changes}      │                   │                    │
  │                       ├─validate()        │                    │
  │                       │ (middleware)      │                    │
  │                       ├─updateBotData() ─────────────────────→│
  │                       │                   │                    │
  │                       │ (In next cycle or on manual action:)   │
  │                       │ ├─getBot()────────────────────────────→│
  │                       │ │←─── Updated config from DB ──────────│
  │                       │ └─Notify MemoryBot OR reload from DB
  │                       │   (if critical change)
  │                       │                   │
  │←──200 OK──────────────┤                   │
  │ {updated bot}         │                   │
```

---

## 🚨 Important Gotchas

### ⚠️ Memory Bots Don't Survive Restarts

```javascript
// If server crashes:
// Memory bots are LOST
// Database bot documents PRESERVED

// Startup recovery:
botService.restoreMemoryBots()
  // Finds all bots in DB with hasStarted: true
  // Recreates MemoryBot instances
  // Restores state from last DB snapshot
  // Resumes trading from that point
```

### ⚠️ Transaction Records Are Separate from State

```javascript
// When buying:
await this.buyNow()
  ├─ transactionService.savePurchase() → NEW document
  │  (This is IMMEDIATE, separate action)
  │
  └─ Later, batch state update with:
     {freePositions: X, totalTransactions: Y}

// Key: Purchase is recorded FIRST, state is updated SECOND
// This ensures transaction integrity
```

### ⚠️ Cache Invalidation is Manual

```javascript
// After buy/sell, YOU must invalidate:
this.purchasesCache = null

// Forgetting this means:
// - Old purchases kept in memory
// - Position checks return stale data
// - Wrong buy/sell decisions
```

### ⚠️ Database Updates Are Not Awaited Everywhere

```javascript
// Some operations don't await:
this.transactionService.saveCryptoProfit({ ... })  // Fire and forget

// Reason: Don't block the cycle waiting for I/O
// Risk: If server crashes between operation and save, record lost
// Mitigation: Transactions are the critical path, profit tracking is secondary
```

### ⚠️ Simulation Mode Uses Fake Orders

```javascript
// When config.simulation = true:
// Orders aren't placed, they're faked:
order = {
  dealFunds: `${calculatedAmount}`,
  fee: `${calculatedAmount * feeRate}`,
  dealSize: `${quantity}`
}

// Looks real to the bot logic
// But no actual trades happen
// Useful for testing strategy without risking money
```

---

## 🔗 Service Dependencies

```
MemoryBot
├─ BotService
│  └─ Bot model (MongoDB queries)
├─ TransactionService
│  ├─ Purchase model
│  └─ Selling model
├─ UserService
│  └─ User model
└─ ExchangeUtils
   └─ Exchange SDK (API calls)

BotRoute
├─ BotService
├─ MemoryBot (from AllBots)
└─ Middleware (auth, validation)

AppRoute
└─ AppService
   └─ File system (logs)
```

---

## 📡 API Quick Reference

### Bot Endpoints

```
POST   /api/bots                  Create bot
GET    /api/bots                  List user's bots
GET    /api/bots/:id              Get bot details
PUT    /api/bots/:id              Update bot config
DELETE /api/bots/:id              Delete bot

POST   /api/bots/:id/start        Start bot (begin trading)
POST   /api/bots/:id/pause        Pause bot (stop trading)
POST   /api/bots/:id/resume       Resume bot (resume trading)

GET    /api/bots/:id/transactions Get bot's buy/sell history
POST   /api/bots/:id/sell-all     Manually sell all positions

POST   /api/bots/export/:exchange Export bot configs
POST   /api/bots/import/:exchange Import bot configs
```

### User Endpoints

```
GET    /api/user/profile          Get user details
GET    /api/user/profit           Get user's profit stats
GET    /api/user/daily-profit     Get daily profit breakdown
```

### Currency Endpoints

```
GET    /api/currency/pairs        Get available trading pairs
GET    /api/currency/balance      Get user's crypto balance
```

---

## 🧪 Testing Approach

### Manual Testing

1. **Simulation Mode**: Set `simulation: true` in config
2. **Small Investment**: Start with miniscule amounts ($10-50)
3. **Check Logs**: Read `backend/logs/{botId}/` for detailed flow
4. **Monitor Database**: Use `mongosh` to inspect documents in real-time

### What to Check

```javascript
// 1. Bot creates successfully
db.bots.find({})

// 2. Purchases record on buy
db.purchases.find({botId: ...})

// 3. Sellings record on sell
db.sellings.find({botId: ...})

// 4. User profit updates
db.users.findOne({_id: userId})
  .totalProfit  // Should increase

// 5. Daily profit tracking
db.dailyProfits.find({userId: ..., date: "2026-02-23"})
```

---

## 📖 File Reading Order for Understanding

1. **Start here**: `backend/bot/bot.js` (MemoryBot class, main logic)
2. **Then**: `backend/bot/all-bots.js` (memory management)
3. **Then**: `backend/services/bot-service.js` (DB interaction)
4. **Then**: `backend/routes/bot-routes.js` (API handlers)
5. **Then**: `backend/bot/exchanges/kucoin/utils.js` (one example)
6. **Reference**: `backend/models/*.js` (schemas)

---

## 🆘 Getting Help

### Debugging Checklist

- [ ] Is bot running (`hasStarted: true`)?
- [ ] Is bot paused (`isPaused: false`)?
- [ ] Are there free positions (`freePositions > 0`)?
- [ ] Is price in range (`minWorkingPrice` to `maxWorkingPrice`)?
- [ ] Is wallet funded (check with `GET /api/currency/balance`)?
- [ ] Are API keys valid (test exchange separately)?
- [ ] Check bot logs: `tail -f backend/logs/{botId}/*.log`
- [ ] Check browser console for frontend errors
- [ ] Check server logs: `npm start` output

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Bot is already running" | Already started | Pause/stop first |
| "Insufficient balance" | Wallet empty | Fund wallet on exchange |
| "Trading pair not found" | Symbol typo or delisted | Check symbol format |
| "Invalid API keys" | Keys don't match exchange | Re-verify in exchange account |
| "Position already sold" | Tried to sell twice | Check state in DB |

---

## 📝 Code Review Checklist

When reviewing PRs, check for:

- [ ] Memory updates BEFORE DB updates (eventual consistency)
- [ ] Cache invalidation on buy/sell
- [ ] Batch state changes instead of individual updates
- [ ] Await for critical operations (transactions)
- [ ] Fire-and-forget for non-critical (profit tracking)
- [ ] Error handling in try-catch for API calls
- [ ] Proper logging (bot.log() or logger.error())
- [ ] No mutation of shared state without queueing
- [ ] Exchange abstraction not violated (no exchange-specific code in bot.js)
- [ ] No database queries in tight loops

---

## Conclusion

The trading bot is a well-architected system with clear separation between:
- **Memory layer** (fast, temporary)
- **Database layer** (persistent, authoritative)
- **Exchange layer** (abstracted, pluggable)

Focus on understanding the cycle, service dependencies, and data flow. The rest follows naturally!

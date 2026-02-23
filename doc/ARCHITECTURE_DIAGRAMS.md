# Trading Bot - Architecture Diagrams (Extended)

This document contains additional architecture diagrams and visual explanations for the Trading Bot system.

---

## 1. System Component Diagram

```
┌───────────────────────────────────────────────────────────┐
│                     Frontend (Vue.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Bot List  │  │Config    │  │Profile   │   │
│  │          │  │Management│  │Editor    │  │Settings  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────┬──────────────────────────────────────────────────┬───┘
     │                  HTTP + WebSockets               │
     └─────────────────────────┬────────────────────────┘
                               │
                ┌──────────────▼───────────────┐
                │   HyperExpress Server        │
                │   (Node.js HTTP Server)      │
                │   Port: 3000                 │
                └──────────────┬───────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
        ┌─────────┐        ┌─────────┐      ┌──────────┐
        │Routes   │        │Services │      │Utilities │
        │├─Auth   │        │├─Bot    │      │├─Logger  │
        │├─Bot    │        │├─User   │      │├─Encrypt │
        │├─User   │        │├─TXN    │      │└─Validate│
        │├─Curr   │        │└─App    │      │          │
        │└─TXN    │        │         │      │          │
        └────┬────┘        └────┬────┘      └────┬─────┘
             │                  │                │
             └──────────────────┬────────────────┘
                                │
             ┌──────────────────▼───────────────┐
             │    Memory-Based Bot Layer        │
             │                                  │
             │  ┌──────────────────────────┐    │
             │  │ All Bots (Array)         │    │
             │  │ ├─ Bot #1 (Running)      │    │
             │  │ ├─ Bot #2 (Paused)       │    │
             │  │ └─ Bot #N ...            │    │
             │  │                          │    │
             │  │ Each MemoryBot:          │    │
             │  │ ├─ ID, Config            │    │
             │  │ ├─ State (Prices, etc)   │    │
             │  │ ├─ Transaction Cache     │    │
             │  │ └─ Main Loop (Running)   │    │
             │  └──────────────────────────┘    │
             └──────────────────┬───────────────┘
                                │ (Periodic sync)
                                │ (Event-driven sync)
                                ▼
                  ┌──────────────────────────┐
                  │   MongoDB Database       │
                  │                          │
                  │  Collections:            │
                  │  ├─ bots                 │
                  │  ├─ purchases            │
                  │  ├─ sellings             │
                  │  ├─ users                │
                  │  ├─ dailyProfits         │
                  │  ├─ totalProfits         │
                  │  └─ cryptoProfits        │
                  └──────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                ▼                                ▼
            ┌─────────────────────────┐   ┌──────────────────┐
            │  Exchange APIs          │   │  Local Logging   │
            │  (Abstract Interface)   │   │                  │
            │                         │   │  /logs/{botId}/  │
            │  ├─ placeOrder()        │   │  ├─ cycle_*.log  │
            │  ├─ getCurrentPrice()   │   │  └─ errors_*.log │
            │  ├─ getTradingPairs()   │   │                  │
            │  └─ getCryptoBalance()  │   │                  │
            │                         │   │                  │
            └──────────┬──────────────┘   └──────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Binance  │  │ KuCoin   │  │  MEXC    │
    │  SDK     │  │  SDK     │  │  SDK     │
    │ (ccxt)   │  │ (ccxt)   │  │ (ccxt)   │
    └──────────┘  └──────────┘  └──────────┘
```

---

## 2. Trading Cycle State Machine

```
                           ┌─────────────────┐
                           │  Bot Running    │
                           │  (Main Loop)    │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Initialize  │ │ Fetch Price  │ │ Check Status │
            │ (First Run) │ │ from Cache   │ │ (Paused?)    │
            └──────┬──────┘ └──────┬───────┘ └───────┬──────┘
                   │               │                 │
                   └───────────────┬─────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │ Paused = True?      │
                        └──────┬──────┬───────┘
                         No    │      │  Yes
                               │      └──────────────────────┐
                               ▼                             │
                      ┌────────────────────┐                 │
                      │ Evaluate Selling   │                 │
                      │ (Check profitables)│                 │
                      └────────┬───────────┘                 │
                               │                             │
                      ┌────────▼─────────┐                   │
                      │ Found Positions  │                   │
                      │ to Sell?         │                   │
                      └─────┬──────┬─────┘                   │
                        Yes │      │ No                      │
                            ▼      └──────┐                  │
                    ┌─────────────────┐   │                  │
                    │ Execute SELL    │   │                  │
                    │ ├─ Place order  │   │                  │
                    │ ├─ Record sale  │   │                  │
                    │ ├─ Free position│   │                  │
                    │ └─ Update profit│   │                  │
                    └────────┬────────┘   │                  │
                             │            │                  │
                    ┌────────▼────────┐   │                  │
                    │ Set soldOne=true│   │                  │
                    └────────┬────────┘   │                  │
                             │            │                  │
                             └─────┬──────┘                  │
                                   │                         │
                          ┌────────▼─────────────┐           │
                          │ Evaluate Buying      │           │
                          │ Check:               │           │
                          │ ├─ Price range OK?   │           │
                          │ ├─ Price dropped?    │           │
                          │ ├─ Has free pos?     │           │
                          │ ├─ Not in cluster?   │           │
                          │ └─ Flags OK?         │           │
                          └────┬──────────┬──────┘           │
                          Yes  │          │ No               │
                               ▼          └───────┬──────────┘
                      ┌───────────────────┐       │
                      │ Execute BUY       │       │
                      │ ├─ Place order    │       │
                      │ ├─ Record purchase│       │
                      │ ├─ Use position   │       │
                      │ └─ Set target     │       │
                      └──────┬────────────┘       │
                             │                    │
                             └──────┬─────────────┘
                                    │
                      ┌─────────────▼────────────┐
                      │ Batch State Changes      │
                      │ stateChanges {           │
                      │   cycles: N+1            │
                      │   freePositions: M       │
                      │   totalProfit: P         │
                      │   ...                    │
                      │ }                        │
                      └──────────┬───────────────┘
                                 │
                    ┌────────────▼──────────┐
                    │ Update Database       │
                    │ botService.updateBotData(
                    │   botId, stateChanges
                    │ )                     │
                    └────────────┬──────────┘
                                 │
                    ┌────────────▼──────────┐
                    │ Sleep botInterval     │
                    │ (e.g., 15 seconds)    │
                    └────────────┬──────────┘
                                 │
                                 │
                            (Loop back)
```

---

## 3. Bot Instance Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    BOT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────┘

                      CREATION
                         │
┌────────────────────────▼───────────────────────┐
│ User calls: POST /api/bots (provides config)   │
│                                                │
│ BotRoute:                                      │
│ ├─ botService.createBot(user, config)          │
│ │  └─ Insert into MongoDB                      │
│ │     return dbBot                             │
│ ├─ new MemoryBot(dbBot._id, user, config)      │
│ │  └─ Initialize all memory state              │
│ └─ allBots.addBot(memoryBot)                   │
│    └─ In-memory list updated                   │
└───────────────────┬────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    INACTIVE                                  │
│ (Bot exists in DB and in memory, but not running)            │
│                                                              │
│ hasStarted: false                                            │
│ isPaused: false                                              │
│ No main loop running                                         │
│ Available for configuration changes                          │
└───────────────────┬───────────────────────────────────────┬──┘
                    │                                       │
                    │                                 (Or resume)
         (Start)    │                                       │
                    ▼                                       │
┌──────────────────────────────────────────────────────────────┐
│ User calls: POST /api/bots/:id/start                         │
│                                                              │
│ BotRoute:                                                    │
│ ├─ getBot(id)  → Get from memory                             │
│ ├─ await bot.start()                                         │
│ │  ├─ setMinimumSize()                                       │
│ │  ├─ checkConfig()                                          │
│ │  ├─ await updateBotData({hasStarted: true})                │
│ │  └─ while(true) main loop                                  │
│ └─ return Updated DB bot                                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    ACTIVE/RUNNING                            │
│ (Main loop executing, trading happening)                     │
│                                                              │
│ hasStarted: true                                             │
│ isPaused: false (unless paused)                              │
│                                                              │
│ Every botInterval:                                           │
│ ├─ Fetch latest price                                        │
│ ├─ Evaluate buy/sell                                         │
│ ├─ Execute trades (if any)                                   │
│ ├─ Persist state to DB                                       │
│ └─ Loop back                                                 │
│                                                              │
│ [Can be paused while loop is running]                        │
└────────────────────┬──────────────────────┬──────────────────┘
          (Pause)    │                      │  (Resume)
                     ▼                      │
         ┌──────────────────────┐           │    
         │   ACTIVE/PAUSED      │           │
         │                      │           │
         │ Main loop still      │           │
         │ running, but:        │           │
         │                      │           │
         │ ├─ Price updates: ✓  │           │
         │ ├─ Trading: ✗        │           │
         │ ├─ DB updates: ✓     │           │
         │ └─ Can resume        │           │
         │                      │───────────┘
         │ isPaused: true       │
         └──────────────────────┘
                    │
            (Stop or Crash)
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    STOPPED/CRASHED                           │
│ (Main loop exited, bot removed from active list)             │
│                                                              │
│ Reasons:                                                     │
│ ├─ Unhandled exception in loop                               │
│ ├─ User stopped bot                                          │
│ ├─ Server shutdown/crash                                     │
│ └─ Network failures (retry exhausted)                        │
│                                                              │
│ State in DB:                                                 │
│ ├─ hasStarted: false                                         │
│ ├─ All transaction records preserved                         │
│ ├─ State snapshot at time of stop                            │
│ └─ Recoverable on next server start                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
             (Server restarts)
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ Server Startup → restoreMemoryBots()                         │
│                                                              │
│ For each DB bot with hasStarted=true:                        │
│ ├─ Create new MemoryBot instance                             │
│ ├─ Populate state from DB snapshot                           │
│ ├─ addBot() to in-memory list                                │
│ ├─ Call bot.start(isFreshStart=false)                        │
│ │  └─ Skips init, enters main loop                           │
│ └─ Resume trading from last known state                      │
│                                                              │
│ For each DB bot with hasStarted=false:                       │
│ └─ Load to memory but don't start main loop                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
            (Continue trading)
                    or
                (Deletion)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User calls: DELETE /api/bots/:id                            │
│                                                             │
│ BotRoute:                                                   │
│ ├─ bot.pause() (if running)                                 │
│ ├─ bot.purgeLogs() (cleanup logs)                           │
│ ├─ botService.deleteBot(id)                                 │
│ │  ├─ Remove from in-memory list                            │
│ │  ├─ Delete all transactions (Purchases, Sellings)         │
│ │  └─ Delete from MongoDB                                   │
│ └─ Return success                                           │
│                                                             │
│ Result: Completely removed, unrecoverable                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow: Buy → Sell → Profit Tracking

```
┌──────────────────────────────────────────────────────────────┐
│                      BUY FLOW                                │
└──────────────────────────────────────────────────────────────┘

Memory Bot evaluates conditions:
  ├─ Price dropped from lastHighestPrice by threshold?
  ├─ Have freePositions available?
  ├─ Not in position cluster zone?
  └─ Not stopped by flags?
           │
           ▼ YES
  ┌─────────────────────┐
  │ buyNow() called     │
  └─────────────────┬───┘
                    │
        1. Calculate quantity
        2. Check balance (abort if insufficient)
        3. Place order on exchange
        4. On success:
           │
           ├─ Memory updates:
           │  ├─ freePositions--
           │  ├─ totalTransactions++
           │  ├─ lastHighestPrice = currentPrice
           │  ├─ currentThresholdIndex++
           │  └─ purchasesCache = null (invalidate)
           │
           └─ Database operations:
              │
              ├─ transactionService.savePurchase({
              │    userId, botId, currency, amount,
              │    price, paid, fee, targetPrice, ...
              │  })
              │  └─ New document in 'purchases' collection
              │     with isSold: false, isPaused: false
              │
              └─ Batch for end-of-cycle update:
                 stateChanges.freePositions = this.freePositions
                 stateChanges.totalTransactions = ...
                 (persisted at cycle end)

┌──────────────────────────────────────────────────────────────┐
│                    HOLDING PERIOD                            │
│ (Purchase sits in MongoDB, watched each cycle)               │
│                                                              │
│ Each cycle checks:                                           │
│ ├─ currentPrice >= purchase.targetPrice?                     │
│ ├─ purchase.isSold == false?                                 │
│ └─ purchase.isPaused == false?                               │
│                                                              │
│ User can manually:                                           │
│ ├─ Pause the purchase (stops auto-sell)                      │
│ └─ Force sell now                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      SELL FLOW                               │
└──────────────────────────────────────────────────────────────┘

Profit target reached: currentPrice >= purchase.targetPrice
           │
           ▼
Memory Bot sellNow(purchase) called
           │
        1. Calculate cryptoToSell quantity
        2. Check crypto balance (abort if insufficient)
        3. Place SELL order on exchange
        4. On success:
           │
           ├─ Memory updates:
           │  ├─ freePositions++
           │  ├─ totalProfit += usdProfit (new field!)
           │  ├─ totalProfitCrypto += (if convertProfitToCrypto)
           │  ├─ totalTransactions++
           │  ├─ currentThresholdIndex-- (go to lower threshold)
           │  ├─ lastHighestPrice = currentPrice (for next drop calc)
           │  ├─ lastSoldPrice = sellPrice (for rebuy zone check)
           │  ├─ purchasesCache = null (invalidate)
           │  └─ User profit tracking updated
           │
           └─ Database operations:
              │
              ├─ transactionService.saveSelling({
              │    userId, botId, currency, amount,
              │    price, fee, profit, buyPrice, ...
              │    associatedPurchase: purchase._id
              │  })
              │  └─ New document in 'sellings' collection
              │     Links back to original purchase
              │
              ├─ Purchase document updated:
              │  └─ db.purchases.updateOne(
              │      {_id: purchase._id},
              │      {isSold: true}  ← Mark as sold
              │    )
              │
              ├─ transactionService.saveCryptoProfit({
              │    userId, exchange, symbol,
              │    amount: usdProfit (or crypto amount),
              │    simulation: bot.config.simulation
              │  })
              │  └─ For user dashboard charts
              │
              ├─ userService.updateDailyProfit(
              │    userId, exchange, symbol,
              │    usdProfit, simulation
              │  )
              │  └─ Aggregate by day for user
              │
              └─ userService.updateTotalProfit(
                  userId, usdProfit, simulation
                )
                └─ Cumulative user profit
                   (across ALL bots/exchanges)

                   │
                   ▼
           ┌──────────────────────┐
           │  At End of Cycle:    │
           │  botService.updateBotData(
           │    botId, {
           │      freePositions,
           │      totalProfit,      ← key metric
           │      totalTransactions,
           │      lastHighestPrice,
           │      lastSoldPrice,
           │      ...
           │    }
           │  )                   │
           │                      │
           │  MongoDB bot doc     │
           │  updated             │
           └──────────────────────┘
```

---

## 5. Exchange Abstraction Detailed

```
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION CODE                            │
│            (backend/bot/bot.js - MemoryBot)                 │
│                                                             │
│  const { placeOrder, getCurrentPrice } = require('./utils') │
│                                                             │
│  // Doesn't know or care which exchange!                    │
│  let order = await placeOrder(user, symbol, 'buy', ...)     │
│  let price = await getCurrentPrice(user, symbol)            │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │ ABSTRACTION LAYER                 │
                    │ (backend/bot/utils.js)            │
                    │                                   │
                    │ module.exports = {                │
                    │   binance,                        │
                    │   kucoin,                         │
                    │   mexc                            │
                    │ }[process.env.BOT_EXCHANGE]       │
                    │                                   │
                    │ Dynamically selects ONE at        │
                    │ runtime based on ENV variable     │
                    └─────────────────┬─────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────┐
            │                         │                     │
       (env=kucoin)            (env=binance)           (env=mexc)
            │                         │                     │
            ▼                         ▼                     ▼
 ┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐
 │ KuCoin Utils     │    │ Binance Utils    │   │ MEXC Utils       │
 │                  │    │                  │   │                  │
 │ Implementation:  │    │ Implementation:  │   │ Implementation:  │
 │                  │    │                  │   │                  │
 │ placeOrder() {   │    │ placeOrder() {   │   │ placeOrder() {   │
 │  ├─ KuCoin SDK   │    │ ├─ Binance SDK   │   │ ├─ MEXC SDK      │
 │  ├─ API key      │    │ ├─ API key       │   │ ├─ API key       │
 │  ├─ Parse order  │    │ ├─ Parse order   │   │ ├─ Parse order   │
 │  │ response:     │    │ │ response:      │   │ │ response:      │
 │  │ dealFunds     │    │ │ cummulativeQty │   │ │ quoteAmount    │
 │  │ dealSize      │    │ │ status         │   │ │ executedQty    │
 │  │ fee           │    │ │ fills[]        │   │ │ commission     │
 │  └─ Return std   │    │ └─ Return std    │   │ └─ Return std    │
 │    format        │    │   format         │   │   format         │
 │ }                │    │ }                │   │ }                │
 │                  │    │                  │   │                  │
 │ getCurrentPrice()│    │ getCurrentPrice()│   │ getCurrentPrice()│
 │ { ... }          │    │ { ... }          │   │ { ... }          │
 │                  │    │                  │   │                  │
 │ And more...      │    │ And more...      │   │ And more...      │
 └────────┬─────────┘    └────────┬─────────┘   └─────────┬────────┘
          │                       │                       │
          │  (Different APIs)     │  (Different APIs)     │
          │  (Different response) │  (Different response) │
          │  (Different quirks)   │  (Different quirks)   │
          │                       │                       │
          ▼                       ▼                       ▼
     ┌──────────┐            ┌──────────┐            ┌──────────┐
     │ KuCoin   │            │ Binance  │            │  MEXC    │
     │ Live API │            │ Live API │            │ Live API │
     │          │            │          │            │          │
     │ Orders   │            │ Orders   │            │ Orders   │
     │ Prices   │            │ Prices   │            │ Prices   │
     │ Balances │            │ Balances │            │ Balances │
     └──────────┘            └──────────┘            └──────────┘
```

### How to Add a New Exchange

```
1. Create directory:
   backend/bot/exchanges/newexchange/

2. Create file:
   backend/bot/exchanges/newexchange/utils.js

3. Implement interface:
   
   module.exports = {
     async getCurrentPrice(user, symbol) {
       // Exchange SDK call
       // Return: number (price)
     },
     
     async getTradingPairs(user) {
       // Return: [{symbol, minSize, increment, fee}, ...]
     },
     
     async placeOrder(user, symbol, side, type, price, quantity, funds) {
       // Return: {dealFunds, fee, dealSize}
     },
     
     async getCryptoBalance(user, asset) {
       // Return: number (balance)
     }
   }

4. Update backend/bot/utils.js:
   
   const newexchange = require('./exchanges/newexchange/utils')
   
   module.exports = {
     binance,
     kucoin,
     mexc,
     newexchange  // ← Add here
   }[process.env.BOT_EXCHANGE]

5. Config:
   BOT_EXCHANGE=newexchange npm start

6. All existing bot.js code works transparently!
```

---

## 6. Caching Strategy

```
┌──────────────────────────────────────────────────────────┐
│ PRICE CACHE (all-prices.js)                              │
│                                                          │
│ prices = {                                               │
│   "BTC-USDT": {                                          │
│     price: 42567.89,                                     │
│     lastUpdate: 1708667732000  (timestamp)               │
│   },                                                     │
│   "ETH-USDT": {                                          │
│     price: 2401.23,                                      │
│     lastUpdate: 1708667732000                            │
│   },                                                     │
│   ...                                                    │
│ }                                                        │
│                                                          │
│ Strategy:                                                │
│ ├─ updateDelay = 3000ms (3 seconds)                      │
│ ├─ On getPrices() call:                                  │
│ │  ├─ If price not in cache: Fetch from exchange         │
│ │  ├─ If price stale (> 3s old): Fetch from exchange     │
│ │  └─ Else: Return cached value                          │
│ └─ Drastically reduces API calls                         │
│                                                          │
│ Result: ~1 fetch per 3 seconds per symbol                │
│         vs. potentially 10+ per cycle                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ PURCHASES CACHE (in MemoryBot)                           │
│                                                          │
│ this.purchasesCache = [                                  │
│   {                                                      │
│     _id: ObjectId,                                       │
│     amount: 0.025,                                       │
│     price: 42000,                                        │
│     targetPrice: 42840,                                  │
│     isSold: false,                                       │
│     ... (all purchase fields)                            │
│   },                                                     │
│   ...                                                    │
│ ]                                                        │
│                                                          │
│ Strategy:                                                │
│ ├─ Cached after each getBotPurchases() call              │
│ ├─ Invalidated (set to null) after:                      │
│ │  ├─ buyNow() → new purchase added                      │
│ │  ├─ sellNow() → purchase removed from unsold           │
│ │  └─ Pause purchase (isPaused flag change)              │
│ ├─ Next call rebuilds cache from DB                      │
│ └─ Single query/cycle instead of every check             │
│                                                          │
│ Result: Reduced DB queries for transaction checks        │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Error Handling Flow

```
┌─────────────────────────────────────────────┐
│ Bitcoin Bot Main Loop                       │
│                                             │
│ while (true) {                              │
│   try {                                     │
│     // All trading logic                    │
│   } catch (error) {                         │
│     ???                                     │
│   }                                         │
│ }                                           │
└─────────────────────────────────────────────┘

                   │
                   │ Error occurs at any point...
                   │
        ┌──────────▼──────────┐
        │ Catch Block         │
        │                     │
        │ Log error:          │
        │ this.log(error)     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────┐
        │ Was trading in progress?        │
        │                                 │
        │ ├─ Exchange network error       │
        │ │  └─ Retry logic in utils      │
        │ │     (up to N times)           │
        │ │                               │
        │ ├─ Invalid price data           │
        │ │  └─ Retry with fallback       │
        │ │                               │
        │ ├─ Insufficient balance         │
        │ │  └─ Pause bot gracefully      │
        │ │     Log & notify              │
        │ │                               │
        │ └─ Other exceptions             │
        │    └─ Stop bot on crash         │
        └──────────┬──────────────────────┘
                   │
     ┌─────────────▼─────────────┐
     │ graceful shutdown:        │
     │                           │
     │ this.started = false      │
     │ await updateBotData({     │
     │   hasStarted: false       │
     │ })                        │
     │                           │
     │ return (exit loop)        │
     └─────────────┬─────────────┘
                   │
     ┌─────────────▼──────────────────┐
     │ Database reflects bot stop     │
     │                                │
     │ hasStarted: false              │
     │ isPaused: false                │
     │ (All state preserved)          │
     │ lastError: "..."               │
     └──────────────┬─────────────────┘
                    │
     ┌──────────────▼───────────────┐
     │ User observes in dashboard:  │
     │                              │
     │ Bot status: Stopped          │
     │ Reason: Check logs           │
     │                              │
     │ Options:                     │
     │ ├─ Restart bot               │
     │ ├─ Check logs                │
     │ ├─ Config & try again        │
     │ └─ Contact support           │
     └──────────────────────────────┘
```

---

## 8. State Synchronization Timing

```
SCENARIO: Bot selling a position during a cycle

BEFORE SELL:
┌────────────────────┬────────────────────┐
│ MEMORY             │ DATABASE           │
├────────────────────┼────────────────────┤
│ freePositions: 1   │ freePositions: 1   │ (in sync)
│ totalProfit: 100   │ totalProfit: 100   │ (in sync)
└────────────────────┴────────────────────┘


DURING SELL (Memory updated immediately):
┌────────────────────┬────────────────────┐
│ MEMORY             │ DATABASE           │
├────────────────────┼────────────────────┤
│ freePositions: 2 ← │ freePositions: 1   │ × OUT OF SYNC
│ totalProfit: 110 ← │ totalProfit: 100   │ × OUT OF SYNC
│                    │                    │
│ (Queued for DB     │                    │
│  update at cycle   │                    │
│  end)              │                    │
└────────────────────┴────────────────────┘

       ↓ (Continue cycle, other checks)

       ↓ (Reached end of cycle)


END OF CYCLE (Batch update):
┌────────────────────┬────────────────────┐
│ MEMORY             │ DATABASE           │
├────────────────────┼────────────────────┤
│ stateChanges = {   │                    │
│   freePositions:2, │                    │
│   totalProfit:110, │                    │
│   ...              │                    │
│ }                  │                    │
│                    │                    │
│ updateBotData()    │                    │
│ (async, in flight) │                    │
└────────────────────┴────────────────────┘

       ↓ (mongoose.findByIdAndUpdate)

       ↓ (DB I/O ~10-50ms)


SYNCHRONIZED (DB catch-up):
┌────────────────────┬────────────────────┐
│ MEMORY             │ DATABASE           │
├────────────────────┼────────────────────┤
│ freePositions: 2   │ freePositions: 2   │ ✓ in sync
│ totalProfit: 110   │ totalProfit: 110   │ ✓ in sync
└────────────────────┴────────────────────┘

Meanwhile: Next cycle begins, memory continues
with updated values. DB write completing in
background.

KEY INSIGHT: Memory is always fresh and ready
for decisions. Database catches up, maintaining
eventual consistency.
```

---

## Summary

This document provides detailed visual representations of:

1. **Component Architecture** - How all pieces fit together
2. **Trading State Machine** - Decision logic flow per cycle
3. **Instance Lifecycle** - Complete bot creation → deletion journey
4. **Data Flow** - Buy → Hold → Sell → Profit tracking chain
5. **Exchange Abstraction** - How different exchanges are handled uniformly
6. **Caching Strategies** - Performance optimizations
7. **Error Handling** - What happens when things go wrong
8. **Synchronization Timing** - Memory vs Database consistency model

For implementation details, refer to the main **SOFTWARE_DESIGN_DOSSIER.md**.

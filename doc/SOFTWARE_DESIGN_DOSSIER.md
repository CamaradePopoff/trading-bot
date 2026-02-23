# Trading Bot - Software Design Dossier

**Version:** 1.0  
**Date:** February 2026  
**Target Audience:** New developers joining the project

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Concepts](#core-concepts)
4. [Memory Bots vs Database Bots](#memory-bots-vs-database-bots)
5. [Synchronization Mechanism](#synchronization-mechanism)
6. [API Service Layer](#api-service-layer)
7. [Exchange Abstraction Layer](#exchange-abstraction-layer)
8. [Trading Logic](#trading-logic)
9. [Data Models](#data-models)
10. [Key Flows](#key-flows)

---

## Overview

**Kubot** is an automated cryptocurrency trading bot platform that manages multiple trading strategies simultaneously across different exchanges. Each "bot" represents an autonomous trading instance configured for a specific cryptocurrency pair with specific trading parameters.

### Key Responsibilities

- **Multi-exchange support**: Binance, KuCoin, MEXC (configurable via `BOT_EXCHANGE` env variable)
- **Dual-layer architecture**: Memory bots handle real-time trading logic; database bots persist state
- **Position management**: Buy low, sell high with configurable profit margins and position limits
- **Advanced features**: Profit reuse, emergency positions, threshold-based buying, position clustering avoidance
- **Simulation mode**: Test strategies without real transactions

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue.js)                        │
│                   (User Management Interface)                   │
└────────────────┬────────────────────────────────┬───────────────┘
                 │                                │
                 ▼                                ▼
        ┌────────────────────┐        ┌────────────────────┐
        │   REST API Routes  │        │ WebSocket Routes   │
        │  (HyperExpress)    │        │   (Real-time)      │
        └────────┬───────────┘        └────────┬───────────┘
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                  ┌──────────────────────────────┐
                  │    Service Layer             │
                  │ ├─ BotService                │
                  │ ├─ TransactionService        │
                  │ ├─ UserService               │
                  │ └─ AppService                │
                  └──────────────┬───────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
    ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
    │  Memory Bots     │  │  MongoDB     │  │  Bot Utilities   │
    │   (Running)      │  │  (Persistent)│  │  ├─ Exchanges    │
    │                  │  │              │  │  ├─ Pricing      │
    │ ├─ MemoryBot     │  │ ├─ Bot Docs  │  │  └─ Trading      │
    │ └─ AllBots List  │  │ ├─ Purchase  │  │                  │
    │                  │  │ ├─ Selling   │  │ Exchange-Specific│
    │                  │  │ ├─ User      │  │ ├─ KuCoin Utils  │
    │                  │  │ └─ Profit    │  │ ├─ Binance Utils │
    └──────────────────┘  └──────────────┘  │  └─ MEXC Utils   │
                                            └──────────────────┘
```

---

## Core Concepts

### Memory Bot (`MemoryBot` class)

The **memory bot** is the active, running instance that executes trading logic every cycle (configurable interval). It lives in RAM and continuously:

1. Fetches current market prices
2. Evaluates buy/sell conditions
3. Places orders (real or simulated)
4. Tracks state changes in memory
5. Periodically persists state to the database

**Key Properties:**

```javascript
this.id                          // MongoDB ObjectId string
this.config                      // Trading parameters (symbol, fees, limits, etc)
this.user                        // User object with exchange credentials
this.cycles                      // Total cycles executed
this.freePositions              // Available positions to buy
this.currentPrice               // Latest market price
this.totalProfit                // Accumulated profit in USDT
this.totalProfitCrypto          // Accumulated profit in cryptocurrency
this.totalTransactions          // Total buy+sell operations
this.lastHighestPrice           // Highest price since last sell (for drop detection)
this.lastSoldPrice              // Price at which last position was sold
this.started                    // Bot running state
this.paused                     // Trading paused state
this.operationQueue             // Ensures sequential operations (prevents race conditions)
```

### Database Bot

The **database bot** is the persistent representation of a memory bot's configuration and state, stored in MongoDB. It serves as:

1. Historical record of bot state
2. Recovery mechanism for server restart
3. Source of truth for configuration
4. Audit trail of all state changes

---

## Memory Bots vs Database Bots

### The Dual-Layer Approach

```
┌────────────────────────────────────────────────────────────────┐
│                        MEMORY LAYER                            │
│  Fast, Real-time, Volatile (Lost on Server Restart)            │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MemoryBot Instance (Running)                             │  │
│  │ ├─ cycles: 15432                                         │  │
│  │ ├─ currentPrice: 42500.50                                │  │
│  │ ├─ freePositions: 3                                      │  │
│  │ ├─ totalProfit: 2340.75                                  │  │
│  │ └─ Started 2 hours ago                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Synchronizes state to DB every cycle or on state change       │
└────────────────────┬───────────────────────────────────────────┘
                     │ updateBotData() every cycle
                     │ or on: pause/resume/config change/buy/sell
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                            │
│  Persistent, Historical, Single Source of Truth                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Bot Document (MongoDB)                                   │  │
│  │ ├─ config: {symbol, maxInvestment, profitMargin, ...}    │  │
│  │ ├─ cycles: 15432                                         │  │
│  │ ├─ currentPrice: 42500.50 (last synced)                  │  │
│  │ ├─ freePositions: 3                                      │  │
│  │ ├─ totalProfit: 2340.75                                  │  │
│  │ ├─ hasStarted: true                                      │  │
│  │ ├─ isPaused: false                                       │  │
│  │ └─ updatedAt: 2026-02-23T10:15:32Z                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Restored to Memory on Server Startup                          │
└────────────────────────────────────────────────────────────────┘
```

### Why Dual-Layer?

| Aspect | Memory | Database |
|--------|--------|----------|
| **Speed** | ⚡ Instant reads/writes | 🔄 Network latency |
| **Volatility** | ❌ Lost on restart | ✅ Persistent |
| **Freshness** | ✅ Real-time state | ⏱️ Eventual consistency |
| **Purpose** | Fast trading decisions | Audit trail & recovery |

**Trade-off:** The memory bot operates at high frequency (every 5-60 seconds depending on config), so keeping it entirely in memory provides fast decision-making. Database updates are batched to avoid excessive I/O.

---

## Synchronization Mechanism

### When Does Synchronization Happen?

State is synced from memory to database in these scenarios:

#### 1. **Every Trading Cycle** (Periodic)
```javascript
// In bot.js start() method - main loop
while (true) {
  // Fetch price, evaluate trades...
  
  // After each cycle, batch state changes
  const stateChanges = {}
  if (soldOne) {
    stateChanges.freePositions = this.freePositions
    stateChanges.lastHighestPrice = this.lastHighestPrice
    stateChanges.totalProfit = this.totalProfit
    stateChanges.totalTransactions = this.totalTransactions
    // ... etc
    await this.botService.updateBotData(this.id, stateChanges)
  }
  
  // Wait for next cycle
  await sleep(this.config.botInterval * 1000)
}
```

#### 2. **On Critical State Changes** (Event-Driven)
- **Buy/Sell transactions**: Immediately persisted
- **Pause/Resume**: Immediately synced
- **Configuration changes**: Users can update config, synced immediately
- **Emergency positions**: Tracked in real-time

```javascript
// Example: When pausing bot
async pause() {
  this.paused = true
  await this.botService.updateBotData(this.id, { isPaused: true })
}

// Example: When buying
await this.buyNow(isForced, soldOne, usd, isEmergency)
// This calls transactionService.savePurchase() internally
// Plus updates stats: cycles, totalTransactions, freePositions
```

#### 3. **Purchase/Selling Records**
Transactions create separate database documents (not just state updates):
```javascript
await this.transactionService.savePurchase({
  createdAt, userId, botId, currency, amount, price, paid, fee, ...
})

await this.transactionService.saveSelling(purchase, {
  createdAt, userId, botId, currency, amount, price, profit, ...
})
```

### Synchronization Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Memory Bot Main Loop (Every botInterval seconds)            │
└─────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Fetch    │  │ Evaluate │  │ Execute  │
         │ Prices   │  │ Conditions│ │ Trades   │
         └──────────┘  └──────────┘  └──────────┘
                │           │            │
                └───────────┼────────────┘
                            ▼
                    ┌─────────────────┐
                    │ State Changed?  │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
           ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
           │Sold?    │  │Bought?  │  │Config  │
           │         │  │         │  │Changed?│
           └────┬────┘  └────┬────┘  └───┬────┘
                │            │           │
        ┌───────▼────────────▼───────────▼────────┐
        │ Batch relevant fields into stateChanges │
        └───────────────────┬─────────────────────┘
                            ▼
         ┌──────────────────────────────────────┐
         │ botService.updateBotData(id, changes)│
         │   (MongoDB update)                   │
         └──────────────────────────────────────┘
                            │
                    ┌───────▴────────┐
                    ▼                ▼
            ┌──────────────┐  ┌──────────────┐
            │ If Buy/Sell: │  │ Update user  │
            │ Save Txn Doc │  │ profit stats │
            └──────────────┘  └──────────────┘
                            │
                ┌───────────▴───────────┐
                ▼                       ▼
        Wait botInterval seconds   Poll price cache
            (then loop)
```

### Data Consistency Strategy

The system implements **Eventual Consistency**:

1. **Memory is always fresh** - Every decision uses in-memory values
2. **Database catches up** - Within one cycle, state is persisted
3. **Crash recovery** - On restart, bots are restored from database to last known good state

**Important:** Transactions (purchases/sellings) are saved immediately and separately from state updates, ensuring transaction integrity even if state sync is delayed.

---

## API Service Layer

### Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│ HTTP Routes / WebSocket Handlers                           │
│ (HyperExpress Router)                                      │
└────────────┬───────────────────────────────────────────────┘
             │
             ├─ POST /api/bots            → botRouter
             ├─ GET  /api/bots/:id
             ├─ POST /api/bots/:id/start
             ├─ POST /api/bots/:id/pause
             │
             ├─ POST /api/auth/login      → authRouter
             │
             ├─ GET  /api/user/profile   → userRouter
             │
             └─ GET  /api/currency/prices → currencyRouter
                     
                            ▼
             ┌──────────────────────────────────────┐
             │ Middleware Layer                     │
             │ ├─ JWT Authentication                │
             │ ├─ Rate Limiting                     │
             │ ├─ CORS                              │
             │ ├─ Body Parser                       │
             │ ├─ MongoDB Sanitization              │
             │ └─ Express Compatibility Adapter     │
             └──────────────┬───────────────────────┘
                            │
             ┌──────────────▼───────────────────────┐
             │ Service Layer                        │
             │ ├─ BotService                        │
             │ ├─ UserService                       │
             │ ├─ TransactionService                │
             │ ├─ AppService                        │
             │ └─ EncryptionService                 │
             └──────────────┬───────────────────────┘
                            │
             ┌──────────────▼───────────────────────┐
             │ Data Access Layer (MongoDB)          │
             │ ├─ Bot Model                         │
             │ ├─ User Model                        │
             │ ├─ Purchase Model                    │
             │ ├─ Selling Model                     │
             │ └─ ...                               │
             └──────────────────────────────────────┘
```

### Core Services

#### **BotService** (`services/bot-service.js`)

Main orchestrator for bot-related operations:

```javascript
// Bot Lifecycle
createBot(user, config)                    // Create & add to memory
getBotById(id)                             // Fetch from DB
getAllUserBots(userId)                     // Fetch all user's bots
deleteBots(botId)                          // Remove from memory & DB
restoreMemoryBots()                        // Startup recovery

// Bot State Management
updateBotData(botId, update)               // Sync state to DB
getBotTransactions(botId, currentPrice)    // Fetch buy/sell history

// Bot Configuration
importBotConfigs(user, exchange, configs)  // Bulk import
exportBotConfigs(userId, exchange, botIds) // Bulk export
```

**Key Pattern:** BotService bridges memory and database layers
- Creates MemoryBot instance and adds to `getAllBots()` list
- Calls botService.updateBotData() to persist state
- Loads from DB on startup via `restoreMemoryBots()`

#### **TransactionService** (`services/transaction-service.js`)

Manages buy/sell transactions:

```javascript
savePurchase(purchase)                     // Create purchase record
saveSelling(purchase, selling)             // Create selling record
getBotPurchases(botId, unsoldOnly, bot)   // Fetch positions (with cache)
getBotPurchasesAboveTargetPrice(...)       // Positions ready to sell
getPurchaseById(id)                        // Single purchase lookup
```

**Caching Strategy:** Purchases are cached in memory (`this.purchasesCache`) and invalidated after buy/sell operations.

#### **UserService** (`services/user-service.js`)

Manages user-level profit tracking:

```javascript
updateDailyProfit(userId, exchange, symbol, profit, isSimulation)
updateTotalProfit(userId, profit, isSimulation)
updateCryptoProfit(exchanges, symbols)     // Cross-exchange aggregation
```

#### **AppService** (`services/app-service.js`)

Utility functions:

```javascript
getLogs(path)                              // Return bot logs
getServerIp()                              // Server IP for monitoring
```

---

## Exchange Abstraction Layer

### Strategy Pattern Implementation

Different exchanges have different APIs. The system uses **dynamic module loading**:

```javascript
// backend/bot/utils.js (exchanges abstraction point)

require('dotenv').config()
const binance = require('./exchanges/binance/utils')
const kucoin = require('./exchanges/kucoin/utils')
const mexc = require('./exchanges/mexc/utils')

module.exports = {
  binance,
  kucoin,
  mexc
}[process.env.BOT_EXCHANGE]
```

**At Runtime:** Only the configured exchange module is loaded.

### Exchange-Specific Implementation

Each exchange directory contains:

```
backend/bot/exchanges/
├── binance/
│   └── utils.js        # Binance API interface
├── kucoin/
│   └── utils.js        # KuCoin API interface
└── mexc/
    └── utils.js        # MEXC API interface
```

### Common Interface Implemented by All Exchanges

All exchange modules export the same interface:

```javascript
// exchanges/*/utils.js exports:
{
  // Price & Market Data
  getCurrentPrice(user, symbol) → Promise<number>
  getTradingPairs(user) → Promise<{symbol, minSize, increment, fee}>
  getMinimumSize(user, symbol) → Promise<number>
  getCryptoBalance(user, asset) → Promise<number>
  
  // Trading Operations
  placeOrder(user, symbol, side, type, price, quantity, funds) 
    → Promise<{dealFunds, fee, dealSize}>
}
```

### Common Code vs Exchange-Specific

```
┌─────────────────────────────────────────────────────┐
│ Trading Logic (COMMON - all exchanges)              │
│                                                     │
│ • Buy/Sell Decision Making                          │
│ • Position Management (freePositions, maxPositions) │
│ • Profit Calculation & Tracking                     │
│ • Price Drop Detection                              │
│ • Emergency Position Unlocking                      │
│ • Profit Reuse & Boost Logic                        │
│                                                     │
│ Location: backend/bot/bot.js (MemoryBot class)      │
└─────────────────────────────────────────────────────┘
                        ▲
                        │ Uses abstracted methods
                        │
┌─────────────────────────────────────────────────────┐
│ Exchange Abstraction Layer (INTERFACE)              │
│                                                     │
│ • getCurrentPrice()                                 │
│ • getTradingPairs()                                 │
│ • placeOrder()                                      │
│ • getCryptoBalance()                                │
│                                                     │
│ Location: backend/bot/utils.js (delegates to impl)  │
└─────────────────────────────────────────────────────┘
                        ▲
                        │
        ┌───────────────┼─────────────┐
        │               │             │
        ▼               ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Binance  │  │ KuCoin   │  │ MEXC     │
  │ Specific │  │ Specific │  │ Specific │
  │ (SDK)    │  │ (SDK)    │  │ (SDK)    │
  └──────────┘  └──────────┘  └──────────┘
  
Exchange-Specific Implementation Details:
  • API Key Usage
  • Order Response Format Translation
  • Fee Calculation Differences
  • Minimum Size/Precision Rules
  • Quote Currency (USDT, BUSD, etc)
```

### Example: Extending for New Exchange

To add support for exchange "NewEx":

1. Create: `backend/bot/exchanges/newex/utils.js`
2. Implement the interface (all required functions)
3. Handle API-specific quirks (adjust response parsing, fee calculation, etc)
4. Update config: `BOT_EXCHANGE=newex`

---

## Trading Logic

### Core Trading Strategy

The bot implements a **DCA-like strategy** (Dollar Cost Averaging) with profit-taking:

```
Price Chart:
                    ▲ Peak (lastHighestPrice)
                    │    \
                    │     \  Price drops 3% (configured threshold)
     Current Price  │────────\─────────────► BUY TRIGGER
                    │          \
                    │           ▼
                    │        Buy at lower price
                    │        ↓
                    │        Set Target Price = Buy Price × (1 + profitMargin%)
                    │        ↓
                    │        Price rises to Target → SELL TRIGGER
                    │        ↓
                    │        Profit = Sell - Buy (minus fees)
                    │
                    └─────────────────────────────► Time
```

### Key Concepts Explained

#### **Free Positions**

```javascript
// Example: maxPositions = 5
freePositions = 5              // Start: Can make 5 buys

// After buying twice:
freePositions = 3              // 3 positions left to buy

// After selling once:
freePositions = 4              // 1 position reused/freed
```

#### **Price Drop Thresholds (Multi-tiered)**

```javascript
priceDropThresholds: [3, 5, 8, 12]  // 4 thresholds

// Behavior:
currentThresholdIndex = 0  // Start at 3% threshold
  ↓
If price drops 3%: BUY (move to next threshold)
currentThresholdIndex = 1  // Now at 5% threshold
  ↓
If price drops 5% more: BUY
currentThresholdIndex = 2  // Now at 8% threshold
  ↓
// When selling:
currentThresholdIndex--    // Go back one level
```

This creates **escalating buys on deeper drops** and **escalating sells** as market reverses.

#### **Emergency Positions**

When `freePositions ≤ 0` and price drops by `emergencyUnlockThreshold`:

```javascript
// Normal state: freePositions = 0, can't buy more
// Sudden crash: price drops 20% (emergencyUnlockThreshold)
// → Emergency BUY allowed even with freePositions = 0
// → activeEmergencyPositions incremented
// → These positions tracked separately
```

#### **Position Boost** (Profit Reuse)

When profits accumulate, reinvest to create more positions:

```javascript
// Config: reuseProfitToMaxPositions = 10
// Initial: maxPositions = 5 (can buy 5 times)

// After profit > 1 position cost:
// → Boost position created
// → Can now buy 6 times (5 original + 1 from profit)

// Max boost until reuseProfitToMaxPositions reached
if (boost > maxPositions - reuseProfitToMaxPositions) 
  boost = maxPositions - reuseProfitToMaxPositions  // Cap it
```

#### **Position Clustering Avoidance**

Buy concentration check prevents over-buying at similar prices:

```javascript
// Have: Positions at $100, $102, $104 (3 positions, profit margin 2%)
// Current price: $101 + 2% buffer = $103 (within cluster zone)
// → shouldAvoid = true
// → Don't buy (even if conditions trigger)
// → Maintains better price distribution
```

### Decision Tree Each Cycle

```
┌──────────────────────────────────┐
│ Start of Cycle                   │
│ Fetch current price              │
└──────────────────┬───────────────┘
                   ▼
           ┌─────────────────┐
           │ Bot Paused?     │
           └────┬────────┬───┘
            No  │        │  Yes
                ▼        └──→ Skip to cycle end
                             (update time, continue)
           ┌─────────────────┐
           │ Total Txs = 0?  │ (First cycle)
           │ (No positions)  │
           └────┬─────────┬──┘
            No  │         │  Yes
                ▼         ▼
        Check for    BUY now
        profitable   (first position)
        positions
        to SELL
           │         │
           └─────┬───┘
                 ▼
    ┌──────────────────────┐
    │ Has SOLD any?        │
    └────┬──────────────┬──┘
    No   │              │  Yes
         ▼              ▼
    Check price   Check if should
    drops ≥       rebuy at sold
    threshold     price
         │              │
         └────────┬─────┘
                  ▼
         ┌──────────────────────┐
         │ Should BUY?          │
         │ ├─ Has freePos?      │
         │ ├─ Not in cluster?   │
         │ ├─ Price in range?   │
         │ └─ Stop flags OK?    │
         └────┬──────────────┬──┘
         Yes  │              │  No
              ▼              │
           BUY now      Check emergency
                        unlock conditions
                             │
                             ▼
                        ┌──────────────────┐
                        │ Emergency unlock?│
                        └────┬────────┬────┘
                        Yes  │        │  No
                             ▼        ▼
                          BUY        Cycle end
                         (emergency)
                             │
                             ▼
                        ┌──────────────────┐
                        │ Update cycles,   │
                        │ persist to DB    │
                        │ Wait interval    │
                        └──────────────────┘
```

---

## Data Models

### Bot Document (MongoDB)

```javascript
// Collection: bots
{
  _id: ObjectId,
  userId: ObjectId,           // Reference to User
  createdAt: String (ISO),
  
  // Configuration
  config: {
    exchange: "kucoin",       // Or: binance, mexc
    exchangeAsset: "USDT",    // Quote currency
    symbol: "BTC-USDT",       // Trading pair
    botInterval: 15,          // Seconds between cycles
    symbolMinSize: 0.01,      // Minimum buy size
    symbolIncrement: 0.001,   // Price precision
    fee: 0.1,                 // Trading fee %
    
    // Strategy parameters
    priceDropThreshold: 3,              // Single threshold (legacy)
    priceDropThresholds: [3, 5, 8],     // Multi-tiered (preferred)
    emergencyUnlockThreshold: 20,
    emergencyUnlockPositions: 1,
    profitMargin: 2,          // Sell at +2%
    maxPositions: 5,
    maxInvestment: 500,       // USDT total
    
    // Advanced features
    convertProfitToCrypto: false,       // Keep profits as crypto
    reuseProfitToMaxPositions: 10,      // Max positions via profit
    reuseProfit: true,                  // Reinvest to higher buys
    
    simulation: false,        // Paper trading
    minWorkingPrice: null,    // Don't buy below this
    maxWorkingPrice: null     // Don't buy above this
  },
  
  // Bot State (synced from memory)
  cycles: 15432,
  currentPrice: 42567.89,
  freePositions: 3,
  lastHighestPrice: 43200.00,
  lastSoldPrice: 42100.00,
  totalProfit: 2340.75,
  totalProfitCrypto: 0.025,
  totalTransactions: 42,
  
  // Flags
  hasStarted: true,
  isPaused: false,
  stopBuyingOnDrop: false,
  stopBuyingOnRebuy: false,
  
  // Tracking
  currentThresholdIndex: 1,
  activeEmergencyPositions: 0,
  positionBoost: 2,
  usdtBoost: 15.50
}
```

### Purchase Document (Transaction)

```javascript
// Collection: purchases
{
  _id: ObjectId,
  createdAt: String (ISO),
  userId: ObjectId,
  botId: ObjectId,
  
  // Order details
  currency: "BTC-USDT",
  amount: 0.025,              // 0.025 BTC
  price: 42000,               // Bought at this price
  paid: 1050,                 // USDT spent (before fee)
  fee: 1.05,                  // Exchange fee
  
  // Target for selling
  targetPrice: 42840,         // Calculated for profit margin
  profitMargin: 0.02,         // 2% margin
  
  // Status
  isSold: false,              // Still holding
  isPaused: false,            // Can't auto-sell child
  
  // Metadata
  isForced: false,            // Manual buy
  isEmergency: false          // Emergency unlock buy
}
```

### Selling Document (Transaction)

```javascript
// Collection: sellings
{
  _id: ObjectId,
  createdAt: String (ISO),
  userId: ObjectId,
  botId: ObjectId,
  
  // Order details
  currency: "BTC-USDT",
  amount: 0.025,              // Same as purchase
  price: 42850,               // Sold at this price
  fee: 4.28,                  // Selling fee (larger due to higher price)
  
  // Profit calculation
  buyPrice: 42000,            // Original buy price
  profit: 10.97,              // Selling revenue - (cost + fees)
  profitMargin: 0.02,
  profitAsCrypto: 0,          // If convertProfitToCrypto mode
  
  // Metadata
  isForced: false,            // Manual sell
  isEmergency: false,         // Emergency position sell
  associatedPurchase: ObjectId // Links to purchase document
}
```

### User Document

```javascript
// Collection: users
{
  _id: ObjectId,
  username: String,
  email: String,
  passwordHash: String,
  
  // Exchange credentials (encrypted)
  exchanges: {
    binance: { apiKey: "...", apiSecret: "...", updated: Date },
    kucoin: { apiKey: "...", apiSecret: "...", updated: Date },
    mexc: { apiKey: "...", apiSecret: "...", updated: Date }
  },
  
  // Profit tracking
  totalProfit: 2340.75,       // Cumulative across all bots
  simulationProfit: 500,      // Testing profits
  
  dailyProfits: [             // For charts
    { date: "2026-02-23", exchange: "kucoin", profit: 45.50, ... }
  ],
  
  // Metadata
  createdAt: Date,
  lastLogin: Date
}
```

---

## Key Flows

### Flow 1: Bot Startup & Recovery

```
User Creates/Starts Bot via Frontend
              │
              ▼
POST /api/bots/:id/start
              │
              ▼
BotRoute handler calls:
  ├─ botService.getBotById(id)  → Load DB bot
  └─ new MemoryBot(dbBot)        → Create in-memory instance
              │
              ▼
MemoryBot.start() called
  ├─ await setMinimumSize()     → Fetch exchange min size
  ├─ await checkConfig()         → Validate trading pair exists
  ├─ while(true) loop starts     → Main trading loop
  │   ├─ Fetch current price
  │   ├─ Evaluate buy/sell conditions
  │   ├─ Execute trades (if any)
  │   ├─ Batch state changes
  │   └─ await botService.updateBotData()  → Persist to DB
  │   └─ Sleep botInterval seconds
  └─ (runs indefinitely)

On Server Crash/Restart:
  ├─ Server starts
  ├─ Calls botService.restoreMemoryBots()
  ├─ Finds all bots in DB with hasStarted=true
  └─ For each: Recreates MemoryBot, calls start(isFreshStart=false)
     └─ Skips initialization, enters main loop at last known state
```

### Flow 2: Buying & Selling Cycle

```
┌─────────────────────────────────┐
│ Each Trading Cycle              │
│ (every botInterval seconds)     │
└──────────┬──────────────────────┘
           │
    ┌──────▼──────┐
    │ Fetch Price │
    │ from Cache  │
    └──────┬──────┘
           │
    ┌──────▼────────────┐
    │ Price Qualified?  │
    │ (in price range)  │
    └──────┬─────────┬──┘
      Yes  │         │ No
           ▼         └───→ Skip buying
                            ▼
    ┌────────────────────────────────────┐
    │ Evaluate Sell Opportunities        │
    │ Find purchases:                    │
    │ ├─ isSold = false                  │
    │ ├─ currentPrice ≥ targetPrice      │
    │ └─ isPaused = false                │
    └────────┬───────────────────────────┘
             │
      ┌──────▼──────┐
      │ Found any?  │
      └──────┬──┬───┘
        Yes  │  │ No
             ▼  └─→ Go to buy check
    ┌────────────────────────────┐
    │ Sell matching positions    │
    │ (potentially multiple)     │
    │                            │
    │ For each purchase:         │
    │ ├─ placeOrder("sell")      │
    │ ├─ Save Selling doc        │
    │ ├─ Update profit tracking  │
    │ ├─ Increment freePositions │
    │ └─ Invalidate cache        │
    └────────┬───────────────────┘
             │
      ┌──────▼──────────────────┐
      │ Mark soldOne = true     │
      │ Update state changes:   │
      │ {                       │
      │   freePositions,        │
      │   totalProfit,          │
      │   totalTransactions,    │
      │   ...                   │
      │ }                       │
      └──────┬──────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ Evaluate Buy Triggers   │
    │                         │
    │ Check conditions:       │
    │ ├─ freePositions > 0 ?  │
    │ ├─ !stopBuyingOnDrop ?  │
    │ └─ !stopBuyingOnRebuy ? │
    │                         │
    │ + One of:               │
    │ ├─ cycles == 0          │
    │    (first position)     │
    │ ├─ Price dropped ≥ %    │
    │    (from lastHighest)   │
    │ └─ Just sold, rebuy ok? │
    └──────┬─────────┬────────┘
       Yes │         │ No
           ▼         └─→ Sleep
    ┌────────────────────────────┐
    │ Execute buyNow()           │
    │ ├─ Fetch crypto balance    │
    │ ├─ Calculate quantity      │
    │ ├─ placeOrder("buy")       │
    │ ├─ Save Purchase doc       │
    │ ├─ Decrement freePositions │
    │ ├─ Update lastHighestPrice │
    │ └─ Invalidate cache        │
    └────────┬───────────────────┘
             │
      ┌──────▼───────────────────┐
      │ Update state changes:    │
      │ {                        │
      │   freePositions,         │
      │   totalTransactions,     │
      │   cycles,                │
      │   ...                    │
      │ }                        │
      └──────┬───────────────────┘
             │
      ┌──────▼────────────────────────┐
      │ Batch update to Database      │
      │ botService.updateBotData(     │
      │   botId,                      │
      │   stateChanges                │
      │ )                             │
      └──────┬────────────────────────┘
             │
      ┌──────▼───────────────────────────┐
      │ Sleep botInterval seconds        │
      │ Loop back to start (fetch price) │
      └──────────────────────────────────┘
```

### Flow 3: Configuration Changes

```
User modifies bot config via Frontend
              │
              ▼
PUT /api/bots/:id
              │
              ▼
BotRoute validates & updates:
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
  Config  Update   Notify
  Validation  DB   Memory
      │       │      │
      ├───────┤      ▼
      │   botService.updateBotData({
      │     config: newConfig
      │   })
      │       │
      └───────┼──────┐
              │      ▼
        Returns  Memory bot continues
        updated  using new config
        config   in next cycle
```

Affected config changes:
- `maxPositions` → Adjusts `freePositions` accordingly
- `profitMargin` → New purchases calculate new targetPrice
- `maxInvestment` → Controls position size going forward
- `stopBuyingOnDrop`/`stopBuyingOnRebuy` → Affects next cycle
- `priceDropThresholds` → Used on next evaluation

---

## Architecture Patterns

### 1. Queue Pattern for Operations

Ensures sequential operations on bot state (prevents race conditions):

```javascript
// In MemoryBot
async queueOperation(operation) {
  return new Promise((resolve, reject) => {
    this.operationQueue = this.operationQueue.then(
      async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

// Usage:
this.pause()     // Internally calls: queueOperation(async () => { ... })
this.resume()    // Gets queued until pause completes
```

### 2. Dependency Injection

Services accept `(io, logger)` to reduce coupling:

```javascript
const botService = require('../services/bot-service')(io, logger)
const transactionService = require('../services/transaction-service')(io, logger)

// Inside bot.js:
this.botService = require('../services/bot-service')(io, logger)
this.transactionService = require('../services/transaction-service')(io, logger)
await this.botService.updateBotData(...)
```

### 3. Module Abstraction for Exchanges

Factory pattern for exchange selection:

```javascript
// backend/bot/utils.js
module.exports = {
  binance,
  kucoin,
  mexc,
  kraken
}[process.env.BOT_EXCHANGE]  // Dynamic selection

// Used throughout codebase:
const { placeOrder, getCurrentPrice } = require('./utils')
// Transparent - calls the right exchange implementation
```

### 4. Caching Strategy

```javascript
// Purchases cache (in-memory)
this.purchasesCache = null
this.cacheLastUpdate = null

// Invalidated after buy/sell:
await this.sellNow(...)           // Invalidates cache
this.purchasesCache = null        // Reset

// Next call rebuilds from DB
const purchases = await this.transactionService.getBotPurchases(this.id)
```

### 5. Batch Updates

Instead of updating DB on every state change:

```javascript
// Accumulate changes in one cycle
const stateChanges = {}
if (soldOne) {
  stateChanges.freePositions = this.freePositions
  stateChanges.totalProfit = this.totalProfit
  // ... etc
}

// Single DB update at cycle end
await this.botService.updateBotData(this.id, stateChanges)
```

This reduces database I/O from potentially 10+ calls/cycle to 1 call/cycle.

---

## Performance Considerations

### Memory Usage

- **Per bot**: ~100-200 KB (state + cache)
- **Scalability**: Hundreds of bots sustainable per server
- **Transaction records**: Infinitely growing (consider purging workflow)

### Database I/O

- **Updates per cycle**: 1 (batched)
- **Transactions writes**: 1 per buy/sell (immediate)
- **Query burden**: Low (mostly sequential reads from AllBots list)

### CPU Usage

- **Cycles per second**: Configurable (typically 0.5 - 0.2 Hz, i.e., 2-5 second intervals)
- **Price fetching**: Cached with 3-second TTL
- **Heavy operations**: Sell evaluation (might check 50+ positions)

### Network

- **Exchange API calls**: 
  - Price fetch: ~1 per 3 seconds per bot
  - Order placement: 1 per buy/sell (infrequent)
- **Database calls**: ~1 per cycle per bot

---

## Error Handling & Recovery

### Bot Crashes

When an exception occurs in the main loop:

```javascript
while (true) {
  try {
    // ... trading logic ...
  } catch (error) {
    this.log(`❌ [ERROR] ${error.message}`)
    this.started = false
    await this.botService.updateBotData(this.id, { hasStarted: false })
    return  // Exit the loop
  }
}
```

The bot stops gracefully and database is notified.

On restart:
- `hasStarted: false` → Bot won't auto-restart
- User must manually restart via UI
- Last known state is preserved in DB

### Network Failures

Exchange API errors are caught:

```javascript
try {
  order = await placeOrder(this.user, symbol, 'buy', 'market', null, qty)
} catch (error) {
  this.log(`❌ [ERROR] ${error.message}`)
  return { errorMessage: error.message }
}
// Continue with next cycle instead of crashing
```

Price fetch failures trigger retry logic:

```javascript
if (!this.currentPrice) {
  this.log('⚠️  [ERROR] Unable to fetch price. Retrying...')
  await sleep(botInterval * 1000)
  this.currentPrice = (await getPrices(...))[symbol].price
}

if (!this.currentPrice) {
  this.log('❌ [ERROR] Still unable to fetch price. Stopping bot.')
  // Graceful shutdown
}
```

---

## Testing the Bot

### Simulation Mode

Set `simulation: true` in bot config:

```javascript
// No real orders placed: uses fake orders with configured fee
order = {
  dealFunds: `${calculatedUSD}`,
  fee: `${calculatedUSD * fee}`,   // Simulated
  dealSize: `${cryptoQuantity}`
}

// Profit tracking still happens normally
// Useful for testing strategy logic
```

### Manual Testing

1. Create a bot with small maxInvestment (e.g., $50)
2. Set high profitMargin (e.g., 5%) for quick testing
3. Check logs in `/backend/logs/{botId}/` for detailed cycle info
4. Use database to inspect Purchase/Selling documents

### Integration Points to Monitor

- Bot cycle duration (check in logs)
- API rate limits from exchange
- Database query times (slow queries)
- Memory growth over time

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot won't start | Invalid API keys | Check exchange credentials |
| No trades happening | Price outside range | Check minWorkingPrice/maxWorkingPrice |
| Frequent sells, no buys | High profitMargin + low drop threshold | Rebalance parameters |
| Bot paused unexpectedly | Insufficient balance | Verify wallet has funds |
| State out of sync | Network disconnection during write | Restart bot (DB has correct state) |
| Memory leak over time | Transaction records unbounded | Use purgeOldTransactions() |

---

## Future Enhancement Opportunities

1. **Leverage & Margin Trading** - Use borrowed capital
2. **Multi-pair Coordination** - Share budget across symbols
3. **Machine Learning** - Predict optimal thresholds
4. **Websocket Price Feed** - Replace polling for real-time data
5. **Advanced Risk Management** - Stop-loss, trailing stops
6. **Analytics Dashboard** - Historical P&L analysis
7. **Clone Bots** - Share configurations between users
8. **Backtesting Engine** - Simulate historical data

---

## Conclusion

The Trading Bot uses a **dual-layer architecture** (memory + database) to balance real-time trading performance with data persistence. The **exchange abstraction layer** keeps trading logic agnostic to exchange APIs, while **service-oriented design** provides clean separation of concerns.

New developers should focus on:
1. Understanding the **MemoryBot lifecycle** (initialization → main loop → shutdown)
2. How **memory and database stay in sync** (every cycle + on state changes)
3. Where **bot logic lives** (bot.js) vs **where persistence happens** (services)
4. How **exchanges are abstracted** (common interface pattern)

For deep dives, start with:
- `backend/bot/bot.js` - Main trading logic
- `backend/services/bot-service.js` - State management
- `backend/routes/bot-routes.js` - API endpoints
- Exchange implementations: `backend/bot/exchanges/{exchange}/utils.js`

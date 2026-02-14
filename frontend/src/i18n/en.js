export default {
  common: {
    ':': ':',
    all: 'All',
    amount: 'Amount',
    anyPrice: 'Any price',
    at: 'at',
    areYouSure: 'Are you sure?',
    bought: 'Bought',
    buying: 'Buying',
    class: 'Class',
    confirmation: 'Confirmation',
    created: 'Created:',
    date: 'Date',
    exchange: 'Exchange',
    fee: 'Fee',
    from: 'from',
    help: 'Help',
    margin: 'Margin:',
    minIncrement: 'Minimim increment',
    minSize: 'Minimum buy',
    noData: 'No data',
    noDate: 'No date selected',
    noName: 'No name',
    pair: 'Pair',
    price: 'Price',
    profit: 'Profit',
    purchase: 'Purchase | Purchases',
    selling: 'Selling | Sellings',
    simulated: 'Simul.',
    simulation: 'Simulation',
    sold: 'Sold',
    status: 'Status',
    success: 'Success',
    to: 'to',
    today: 'Today',
    total: 'Total',
    totalProfit: 'Total profit',
    transactions: 'Transactions',
    unsold: 'Unsold',
    welcomeTo: 'Welcome to',
    welcomeToSubtitle: 'My Crypto Trading Bot'
  },
  menus: {
    home: 'Home',
    balances: 'Balances',
    bots: 'Bots',
    cryptos: 'Cryptos',
    trading: 'Market',
    favorites: 'Favorites',
    news: 'News',
    logs: 'Logs',
    account: 'Account',
    logout: 'Logout',
    admin: {
      users: 'Users',
      bots: 'Bots',
      userCard: {
        username: 'Username',
        lastConnection: 'Last connection',
        neverConnected: 'Never connected',
        permissions: 'Permissions',
        exchanges: 'Exchanges',
        noExchanges: 'No exchanges configured',
        normalBots: 'bot | bots',
        simulationBots: 'simul. | simul.',
        realBots: 'Real bots',
        simulationBotsShort: 'Simulated bots',
        totalRealProfit: 'Total real profit',
        totalSimulatedProfit: 'Total simulated profit'
      }
    }
  },
  buttons: {
    add: 'Add',
    all: 'All',
    buy: 'Buy',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    logs: 'Logs',
    next: 'Next',
    pause: 'Pause',
    previous: 'Previous',
    refresh: 'Refresh',
    register: 'Register',
    resume: 'Resume',
    save: 'Save',
    sell: 'Sell',
    start: 'Start',
    submit: 'Submit',
    transaction:
      'No transactions | View {count} transaction | View {count} transactions'
  },
  components: {
    bot: {
      configuration: 'Configuration',
      currency: 'Currency:',
      marketFee: 'Market fee:',
      openingPrice: 'Opening price:',
      investment: 'Investment:',
      positions: 'Positions:',
      positionPrice: 'Position price:',
      buy: 'Buy',
      sell: 'Sell',
      buyingRange: 'Buying range:',
      notStarted: 'Not started',
      paused: 'Paused',
      running: 'Running',
      freePositions: 'Free positions:',
      cycles: 'Cycles:',
      nextPurchase: 'Next purchase',
      nextSelling: 'Next selling',
      transactions: 'Transactions',
      order: 'order | orders',
      usdUnsold: '{asset} invested:',
      cryptoBought: 'Crypto bought:',
      unrealized: 'Unrealized:',
      deletionConfirmation: 'Are you sure you want to delete this bot?',
      editConfigTitle: 'Edit bot configuration',
      viewConfigTitle: 'View bot configuration',
      convertProfitToCrypto: 'Convert profit to crypto',
      stopBuying: 'Stop buying',
      enableBuying: 'Enable buying',
      stopBuyingOnDrop: 'Stop buying on drop',
      enableBuyingOnDrop: 'Enable buying on drop',
      stopBuyingOnRebuy: 'Stop buying on rebuy',
      enableBuyingOnRebuy: 'Enable buying on rebuy',
      reuseProfit: 'Reuse profit',
      showChart: 'Show chart',
      hideChart: 'Hide chart',
      noNextSelling: 'No next selling',
      noNextSellingShort: 'None',
      sellNow: 'Sell now',
      sellAllPositive: 'Sell all positive positions now',
      buyNow: 'Buy now',
      buyCustomAmount: 'Buy custom amount',
      configSaved: 'Configuration saved',
      saveFailed: 'Failed to save configuration',
      sellFailed: 'Sell failed',
      buyFailed: 'Buy failed'
    },
    botCard: {
      currentPrice: 'Current price',
      investment: 'Investment:'
    },
    botConfig: {
      botLabel: 'Label (optional)',
      botInterval: 'Interval (s)',
      currencySettingsLabel: 'Currency settings',
      marketFee: 'Market fee (%)',
      maxInvestment: 'Maximum investment ({asset})',
      maxPositions: 'Maximum positions',
      positionPrice: 'Position price ({asset})',
      positionsToRebuy: 'High positions',
      minDecrease: 'Min. decrease (%)',
      priceDropThreshold: 'Price drop threshold (%)',
      singleThreshold: 'Constant threshold',
      thresholdArray: 'Threshold profile',
      priceDropThresholds: 'Price drop thresholds (%)',
      thresholdsHint: 'E.g.: 1.0, 1.0, 1.5, 1.5, 2.0 (comma-separated)',
      profitMargin: 'Profit margin (%)',
      maxIncrease: 'Max. increase (%)',
      minWorkingPrice: 'Minimum buy price',
      maxWorkingPrice: 'Maximum buy price',
      profitAsCrypto: 'Profit as crypto',
      dropBehaviorLabel: 'Price drop behavior',
      riseBehaviorLabel: 'Price rise behavior',
      workingRangeLabel: 'Working range (optional)',
      reinvestLabel: 'Profit reinvestment (optional)',
      previewLabel: 'Preview',
      reinvestProfitToMaxPositions: 'New maximum positions',
      reinvestProfit: 'Raise position price',
      unlockEmergencyPositions: 'Emergency positions (optional)',
      emergencyUnlockThreshold: 'Price drop threshold (%)',
      emergencyUnlockPositions: 'Number of positions',
      cryptoAlert1:
        'Current settings and current crypto price ({price}) do not allow for ctypto profit.',
      cryptoAlert2:
        'Current crypto profit would be {profit}, while minimum feasible profit is {min}.'
    },
    botPositionSlider: {
      showDropPercentage: 'Show drop percentage',
      hideDropPercentage: 'Hide drop percentage'
    },
    register: {
      newUser: 'New user'
    },
    tradingBalances: {
      title: 'Balances',
      loading: 'Loading trading balances...'
    },
    transactionList: {
      currentProfitMargin: 'Current profit margin (%)',
      currentSellingPrice: 'Current selling price',
      newProfitMargin: 'New profit margin (%)',
      newSellingPrice: 'New selling price',
      targetPrice: 'Target price',
      crypto: 'Crypto',
      actions: 'Actions',
      profitMargin: 'Profit margin:',
      targetPriceColon: 'Target price:',
      profit: 'Profit:',
      cryptoProfit: 'Crypto profit:',
      confirmNegativeSelling:
        'Are you sure you want to sell with a negative profit?',
      setNewMargin: 'Set new profit margin'
    },
    userInfo: {
      username: 'Username',
      password: 'Password',
      confirmPassword: 'Confirm password'
    },
    exchange: {
      apiKey: 'API key',
      apiSecret: 'API secret',
      apiPassphrase: 'API passphrase (optional)'
    },
    botConfigManager: {
      title: 'Config. manager',
      export: 'Export',
      import: 'Import',
      downloadJson: 'Download JSON',
      uploadJson: 'Upload JSON',
      selectAll: 'All',
      deselectAll: 'None',
      noBotsSelected: 'Please select at least one bot configuration to export',
      noImportSelected: 'Please select at least one configuration to import',
      importSelected: 'Import Selected'
    }
  },
  pages: {
    app: {
      deleteSimulationsTitle:
        'You are about to delete the whole past simulated history.',
      deleteSimulationsHistory: 'Delete simulation profit history',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      filterType: 'Filter by type',
      filterSimulation: 'Filter simulation'
    },
    account: {
      personalInfo: 'Personal information',
      exchanges: 'Exchange platforms',
      ipWhitelistInfo: 'Important: Please add the following IP address to the API security whitelist in your exchange settings: {ip}',
      botManagement: 'Bot Management',
      importExportDescription: 'Import and export bot configurations'
    },
    home: {
      noBots: 'you have no bots!',
      botsTitle: 'Current bots',
      botsTitleSimulation: 'Current simulation bots',
      profitsTitle: 'Daily {asset} profits',
      profitsTitleSimulation: 'Simulated daily {asset} profits',
      breakdownByCurrency: 'Breakdown by currency'
    },
    balances: {
      avaiable: 'Available:',
      minBuy: 'Minimum buy:',
      increment: 'Increment:',
      buy: 'Buy:',
      sell: 'Sell:',
      totalValue: 'Total value:'
    },
    bots: {
      runningOnly: 'Active',
      compact: 'Compact',
      table: 'Table',
      grid: 'Grid',
      search: 'Search bots',
      toggleCharts: 'Show/hide all charts',
      pauseAllBots: 'Pause all visible bots',
      resumeAllBots: 'Resume all visible bots',
      stopBuyingAllBots: 'Stop buying on all visible bots',
      resumeBuyingAllBots: 'Resume buying on all visible bots',
      addBot: 'Add a bot',
      viewBtcChart: 'View BTC/USDT chart',
      filterAll: 'All bots',
      filterRealOnly: 'Real bots only',
      filterSimulatedOnly: 'Simulated bots only',
      filterShortAll: 'All',
      filterShortReal: 'Real',
      filterShortSimulated: 'Sim',
      hiddenSimulatedProfits: 'Hidden simulated bots have profitable positions',
      hiddenRealProfits: 'Hidden real bots have profitable positions'
    },
    admin: {
      bots: {
        selectUser: 'Select a user',
        selectExchange: 'Select an exchange',
        bots: 'bot | bots',
        symbol: 'Symbol',
        status: 'Status',
        investment: 'Investment',
        profit: 'Profit',
        simulation: 'Simulation',
        notStarted: 'Not started',
        paused: 'Paused',
        running: 'Running',
        noBots: 'No bots found for this user and exchange',
        selectUserFirst: 'Please select a user to view their bots'
      },
      logs: {
        botLogs: 'Bot logs: {botId}'
      }
    },
    cryptos: {
      deleteHistoryTitle:
        'You are about to delete the whole crypto history for {crypto}.',
      deleteProfitHistory: 'Delete profit history'
    },
    trading: {
      filterTransactions: 'Filter by currency...'
    },
    topPairs: {
      volume: 'Volume:'
    },
    news: {
      caseSensitive: 'Case sensitive',
      entireWord: 'Entire word',
      search: 'Search in the news'
    }
  }
}

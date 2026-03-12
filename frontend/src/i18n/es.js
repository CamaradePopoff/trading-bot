export default {
  common: {
    ':': ':',
    all: 'Todo',
    amount: 'Cantidad',
    anyPrice: 'Cualquier precio',
    at: 'a',
    areYouSure: '¿Está seguro?',
    bought: 'Comprado',
    buying: 'Compra',
    class: 'Clase',
    confirmation: 'Confirmación',
    created: 'Creado:',
    date: 'Fecha',
    exchange: 'Plataforma',
    fee: 'Comisión',
    from: 'de',
    help: 'Ayuda',
    loading: 'Cargando',
    margin: 'Margen:',
    minIncrement: 'Incremento mínimo',
    minSize: 'Compra mínima',
    noData: 'Sin datos',
    noDate: 'Ninguna fecha seleccionada',
    noNewsAvailable: 'No hay noticias disponibles',
    pair: 'Par',
    price: 'Precio',
    profit: 'Ganancia',
    purchase: 'Compra | Compras',
    selling: 'Venta | Ventas',
    simulated: 'Simul.',
    simulation: 'Simulación',
    sold: 'Vendido',
    status: 'Estado',
    success: 'Éxito',
    to: 'a',
    today: 'Hoy',
    total: 'Total',
    totalProfit: 'Ganancia total',
    transactions: 'Transacciones',
    unsold: 'No vendido',
    welcomeTo: 'Bienvenido a',
    welcomeToSubtitle: 'Mi Crypto Trading Bot'
  },
  menus: {
    home: 'Inicio',
    balances: 'Saldos',
    bots: 'Bots',
    cryptos: 'Criptos',
    trading: 'Mercado',
    favorites: 'Favoritos',
    news: 'Noticias',
    logs: 'Registros',
    account: 'Cuenta',
    logout: 'Cerrar sesión',
    admin: {
      users: 'Usuarios',
      bots: 'Bots',
      userCard: {
        username: 'Usuario',
        lastConnection: 'Última conexión',
        neverConnected: 'Nunca conectado',
        permissions: 'Permisos',
        exchanges: 'Plataformas',
        noExchanges: 'No hay plataformas configuradas',
        normalBots: 'bot | bots',
        simulationBots: 'simul. | simul.',
        realBots: 'Bots reales',
        simulationBotsShort: 'Bots simulados',
        totalRealProfit: 'Ganancia real total',
        totalSimulatedProfit: 'Ganancia simulada total'
      }
    }
  },
  buttons: {    add: 'Agregar',    all: 'Todo',
    buy: 'Comprar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    copyToClipboard: 'Copiar al portapapeles',
    delete: 'Eliminar',
    edit: 'Editar',
    logs: 'Registros',
    next: 'Siguiente',
    pause: 'Pausa',
    previous: 'Anterior',
    refresh: 'Actualizar',
    register: 'Registrarse',
    resume: 'Reanudar',
    save: 'Salvar',
    sell: 'Vender',
    start: 'Iniciar',
    submit: 'Enviar',
    transaction:
      'Sin transacciones | Ver {count} transacción | Ver {count} transacciones'
  },
  components: {
    bot: {
      configuration: 'Configuración',
      currency: 'Moneda:',
      marketFee: 'Comisión:',
      openingPrice: 'Precio de apertura:',
      investment: 'Inversión:',
      positions: 'Posiciones:',
      positionPrice: 'Precio de posición:',
      buy: 'Comprar',
      sell: 'Vender',
      buyingRange: 'Rango de compra:',
      notStarted: 'No iniciado',
      paused: 'Pausado',
      running: 'En ejecución',
      freePositions: 'Posiciones libres:',
      cycles: 'Ciclos:',
      nextPurchase: 'Próxima compra',
      nextSelling: 'Próxima venta',
      transactions: 'Transacciones',
      order: 'orden | órdenes',
      usdUnsold: '{asset} invertidos:',
      cryptoBought: 'Cripto comprado:',
      unrealized: 'No real.:',
      deletionConfirmation: '¿Está seguro de que deseas eliminar este bot?',
      editConfigTitle: 'Editar configuración del bot',
      viewConfigTitle: 'Ver configuración del bot',
      convertProfitToCrypto: 'Convertir ganancia a crypto',
      stopBuying: 'Detener compras',
      enableBuying: 'Habilitar compras',      stopBuyingOnDrop: 'Detener compras en caída',
      enableBuyingOnDrop: 'Habilitar compras en caída',
      stopBuyingOnRebuy: 'Detener compras en recompra',
      enableBuyingOnRebuy: 'Habilitar compras en recompra',      reuseProfit: 'Reutilizar ganancia',
      showChart: 'Mostrar gráfico',
      hideChart: 'Ocultar gráfico',
      noNextSelling: 'Sin próxima venta',
      noNextSellingShort: 'Ninguna',
      sellNow: 'Vender ahora',
      sellAllPositive: 'Vender todas las posiciones positivas ahora',
      buyNow: 'Comprar ahora',
      buyCustomAmount: 'Comprar cantidad personalizada',
      configSaved: 'Configuración guardada',
      saveFailed: 'Error al guardar la configuración',
      sellFailed: 'Error al vender',
      buyFailed: 'Error al comprar'
    },
    botCard: {
      currentPrice: 'Precio actual',
      investment: 'Inversión:'
    },
    botConfig: {
      botLabel: 'Nombre (opcional)',
      botInterval: 'Intervalo (s)',
      currencySettingsLabel: 'Configuración de moneda',
      marketFee: 'Comisión (%)',
      maxInvestment: 'Inversión máxima ({asset})',
      maxPositions: 'Máximo de posiciones',
      positionPrice: 'Precio de posición ({asset})',
      positionsToRebuy: 'Posiciones altas',
      minDecrease: 'Disminución mínima (%)',
      priceDropThreshold: 'Umbral de caída de precio (%)',
      singleThreshold: 'Umbral constante',
      thresholdArray: 'Perfil de umbrales',
      priceDropThresholds: 'Umbrales de caída de precio (%)',
      thresholdsHint: 'Ej: 1.0, 1.0, 1.5, 1.5, 2.0 (separados por comas)',
      profitMargin: 'Margen de ganancia (%)',
      maxIncrease: 'Aumento máximo (%)',
      minWorkingPrice: 'Precio mínimo de compra',
      maxWorkingPrice: 'Precio máximo de compra',
      profitAsCrypto: 'Ganancia en cripto',
      dropBehaviorLabel: 'Comportamiento a la baja',
      riseBehaviorLabel: 'Comportamiento al alza',
      workingRangeLabel: 'Rango de trabajo (opcional)',
      reinvestLabel: 'Reinversión (opcional)',
      previewLabel: 'Vista previa',
      reinvestProfitToMaxPositions: 'Nuevo máximo de posiciones',
      reinvestProfit: 'Aumentar precio de posición',
      unlockEmergencyPosition: 'Posiciones de emergencia (opcional)',
      emergencyUnlockThreshold: 'Umbral de caída (%)',
      emergencyUnlockPositions: 'Máximo de posiciones',
      cryptoAlert1:
        'La configuración actual y el precio de la criptomoneda ({price}) no permiten obtener ganancias en cripto.',
      cryptoAlert2:
        'La ganancia actual en cripto sería {profit}, mientras que la ganancia mínima viable es {min}.'
    },
    botPositionSlider: {
      showDropPercentage: 'Mostrar el porcentaje de caída',
      hideDropPercentage: 'Ocultar el porcentaje de caída'
    },
    register: {
      newUser: 'Nuevo usuario'
    },
    tradingBalances: {
      title: 'Saldos',
      loading: 'Cargando saldos de trading...'
    },
    transactionList: {
      currentProfitMargin: 'Margen de ganancia actual (%)',
      currentSellingPrice: 'Precio de venta actual',
      newProfitMargin: 'Nuevo margen de ganancia (%)',
      newSellingPrice: 'Nuevo precio de venta',
      targetPrice: 'Precio objetivo',
      crypto: 'Cripto',
      actions: 'Acciones',
      profitMargin: 'Margen de ganancia:',
      targetPriceColon: 'Precio objetivo:',
      profit: 'Ganancia:',
      cryptoProfit: 'Ganancia en cripto:',
      confirmNegativeSelling:
        '¿Está seguro de querer vender con una ganancia negativa?',
      setNewMargin: 'Establecer nuevo margen de ganancia'
    },
    userInfo: {
      username: 'Nombre de usuario',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña'
    },
    exchange: {
      apiKey: 'Clave API',
      apiSecret: 'Secreto API',
      apiPassphrase: 'Frase secreta de API (opcional)'
    },
    botConfigManager: {
      title: 'Gestor de config.',
      export: 'Exportar',
      import: 'Importar',
      downloadJson: 'Descargar JSON',
      uploadJson: 'Cargar JSON',
      selectAll: 'Todas',
      deselectAll: 'Ninguna',
      noBotsSelected: 'Por favor seleccione al menos una configuración de bot para exportar',
      noImportSelected: 'Por favor seleccione al menos una configuración para importar',
      importSelected: 'Importar Seleccionadas'
    }
  },
  pages: {
    app: {
      deleteSimulationsTitle:
        'Estás a punto de eliminar todo el historial de simulaciones.',
      deleteSimulationsHistory: 'Eliminar historial de ganancias de simulación',
      soundOn: 'Sonido activado',
      soundOff: 'Sonido desactivado',
      filterType: 'Filtrar por tipo',
      filterSimulation: 'Filtrar simulación',
      switchExchange: 'Cambiar la plataforma'
    },
    account: {
      personalInfo: 'Información personal',
      exchanges: 'Plataformas de trading',
      ipWhitelistInfo: 'Importante: Agregue la siguiente dirección IP a la lista blanca de seguridad de API en la configuración de su plataforma de trading: {ip}',
      botManagement: 'Gestión de bots',
      importExportDescription: 'Importar y exportar configuraciones de bots'
    },
    home: {
      noBots: '¡No tienes ningún bot!',
      botsTitle: 'Bots actuales',
      botsTitleSimulation: 'Bots de simulación actuales',
      profitsTitle: 'Ganancias diarias en {asset}',
      profitsTitleSimulation: 'Ganancias simuladas diarias en {asset}',
      breakdownByCurrency: 'Desglose por moneda'
    },
    balances: {
      avaiable: 'Disponible:',
      minBuy: 'Compra mínima:',
      increment: 'Incremento:',
      buy: 'Comprar:',
      sell: 'Vender:',
      totalValue: 'Valor total:'
    },
    bots: {
      runningOnly: 'Activo',
      compact: 'Compacto',
      table: 'Tabla',
      grid: 'Cuadricula',
      search: 'Buscar bots',
      toggleCharts: 'Mostrar/ocultar todos los gráficos',
      pauseAllBots: 'Pausar todos los bots seleccionados',
      resumeAllBots: 'Reanudar todos los bots seleccionados',
      stopBuyingAllBots: 'Detener compra en todos los bots seleccionados',
      resumeBuyingAllBots: 'Reanudar compra en todos los bots seleccionados',      stopBuyingOnDropAllBots: 'Detener compra en caída (todos los bots seleccionados)',
      resumeBuyingOnDropAllBots: 'Reanudar compra en caída (todos los bots seleccionados)',
      stopBuyingOnRebuyAllBots: 'Detener compra en recompra (todos los bots seleccionados)',
      resumeBuyingOnRebuyAllBots: 'Reanudar compra en recompra (todos los bots seleccionados)',      addBot: 'Añadir un bot',
      viewBtcChart: 'Ver gráfico BTC/USDT',
      filterAll: 'Todos los bots',
      filterRealOnly: 'Solo bots reales',
      filterSimulatedOnly: 'Solo bots simulados',
      filterShortAll: 'Todos',
      filterShortReal: 'Reales',
      filterShortSimulated: 'Sim',
      hiddenSimulatedProfits: 'Los bots simulados ocultos tienen posiciones rentables',
      hiddenRealProfits: 'Los bots reales ocultos tienen posiciones rentables'
    },
    admin: {
      bots: {
        selectUser: 'Seleccionar un usuario',
        selectExchange: 'Seleccionar una plataforma',
        bots: 'bot | bots',
        symbol: 'Símbolo',
        status: 'Estado',
        investment: 'Inversión',
        profit: 'Beneficio',
        simulation: 'Simulación',
        notStarted: 'No iniciado',
        paused: 'Pausado',
        running: 'Ejecutando',
        noBots: 'No se encontraron bots para este usuario y plataforma',
        selectUserFirst: 'Por favor seleccione un usuario para ver sus bots'      },
      logs: {
        botLogs: 'Logs del bot: {botId}'      }
    },
    cryptos: {
      deleteHistoryTitle:
        'Estás a punto de eliminar todo el historial de criptomonedas para {crypto}.',
      deleteProfitHistory: 'Eliminar historial de ganancias'
    },    trading: {
      filterTransactions: 'Filtrar por moneda...'
    },    topPairs: {
      volume: 'Volumen:'
    },
    news: {
      caseSensitive: 'Distinguir mayúsculas',
      entireWord: 'Palabra completa',
      search: 'Buscar en las noticias'
    }
  }
}

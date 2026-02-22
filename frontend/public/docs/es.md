# Bot de Trading - Manual de Usuario

## Introducción

Este bot de trading automatizado está diseñado para ejecutar estrategias sistemáticas de trading de criptomonedas en múltiples exchanges soportados. El bot utiliza una estrategia de promedio de costo en dólares (DCA) combinada con mecanismos de toma de ganancias para operar criptomonedas automáticamente.

### Exchanges Soportados

- **Binance** - Exchange de criptomonedas global
- **KuCoin** - Exchange global con extensa selección de altcoins
- **MEXC** - Plataforma global de trading de activos digitales

> **NOTE:**
> **Nota**: La disponibilidad de exchanges puede variar según la región. Asegúrese de que el exchange elegido sea accesible en su jurisdicción.

### Características Principales

- **Trading Automatizado**: Compra y venta de criptomonedas basadas en parámetros configurados
- **Gestión Multi-Posición**: Gestión simultánea de múltiples posiciones de compra
- **Optimización de Ganancias**: Márgenes de beneficio configurables y estrategias de reinversión
- **Modo Simulación**: Prueba estrategias sin trading real
- **Monitoreo en Tiempo Real**: Rastrea el rendimiento del bot y las transacciones en vivo
- **Soporte Multi-Exchange**: Ejecuta bots en diferentes exchanges simultáneamente

## Primeros Pasos

### 1. Registro e Inicio de Sesión

1. Navega a la URL de la aplicación
1. Selecciona tu exchange preferido del menú desplegable
1. Ingresa tus credenciales (nombre de usuario y contraseña)
1. Haz clic en **Iniciar Sesión** para acceder a la plataforma

> **NOTE:**
> **Nota**: El registro puede estar deshabilitado según la configuración del despliegue. Contacta a tu administrador si necesitas una cuenta.

### 2. Configuración de API del Exchange

Antes de crear bots, debes configurar las claves API para tu exchange elegido:

1. Navega a la página **Cuenta**
1. Encuentra la sección **Exchanges**
1. Para tu exchange seleccionado, ingresa:

- **Clave API**: Tu clave API del exchange
- **Secreto API**: Tu secreto API del exchange
- **Frase Secreta API**: (Opcional, requerido para KuCoin)

1. Haz clic en **Guardar** para almacenar tus credenciales

> **NOTE:**
> **Nota de Seguridad**: Las claves API están cifradas y almacenadas de forma segura. Nunca compartas tus claves API con nadie.

#### Permisos de API del Exchange Requeridos

Tus claves API deben tener los siguientes permisos habilitados:
- **Lectura** - Ver saldos de cuenta y datos del mercado
- **Trading** - Colocar órdenes de compra y venta
- **Sin Permiso de Retiro Requerido** - Por seguridad, los permisos de retiro deben estar deshabilitados

#### Cómo Crear Claves API

##### Binance

1. Inicia sesión en tu [cuenta de Binance](https://www.binance.com)
1. Haz clic en el ícono de tu perfil en la esquina superior derecha
1. Selecciona **Gestión de API** del menú desplegable
1. Haz clic en el botón **Crear API**
1. Elige la opción de clave API **Generada por el Sistema**
1. Ingresa una etiqueta para tu clave API (por ejemplo, "Bot de Trading")
1. Completa la verificación de seguridad (2FA, email, etc.)
1. Una vez creada, **copia y guarda inmediatamente la Clave API y la Clave Secreta**

> **WARNING:**
> ¡La Clave Secreta solo se muestra una vez! Guárdala de forma segura antes de cerrar la ventana.

1. Haz clic en **Editar restricciones** para configurar los permisos:

- Habilita **Habilitar Trading Spot y Margin**
- Deshabilita **Habilitar Retiros** (por seguridad)
- Agrega la dirección IP del bot a la lista blanca si es necesario (IP mostrada en la página Cuenta)
1. Haz clic en **Guardar** para aplicar las restricciones

##### KuCoin

1. Inicia sesión en tu [cuenta de KuCoin](https://www.kucoin.com)
1. Haz clic en el ícono de tu perfil en la esquina superior derecha
1. Selecciona **Gestión de API** del menú desplegable
1. Haz clic en el botón **Crear API**
1. Ingresa la siguiente información:

- **Nombre de API**: Una etiqueta para tu clave API (por ejemplo, "Bot de Trading")
- **Frase Secreta API**: Crea una frase secreta (la necesitarás en la configuración del bot)
- **Permisos**: Selecciona **General** (permite trading)
1. Completa la verificación de seguridad (2FA, email, etc.)
1. Una vez creada, **copia y guarda inmediatamente la Clave API, la Clave Secreta y la Frase Secreta**

> **WARNING:**
> ¡La Clave Secreta y la Frase Secreta solo se muestran una vez! Guárdalas de forma segura antes de cerrar la ventana.

1. Configura las restricciones de IP:

- Agrega la dirección IP del bot a la lista blanca (IP mostrada en la página Cuenta)
- Haz clic en **Confirmar** para guardar
1. El estado de la clave API debería mostrar **Activa**

> **NOTE:**
> KuCoin requiere los tres valores: Clave API, Secreto API y Frase Secreta API.

##### MEXC

1. Inicia sesión en tu [cuenta de MEXC](https://www.mexc.com)
1. Haz clic en el ícono de tu perfil en la esquina superior derecha
1. Selecciona **Gestión de API** o **API** del menú
1. Haz clic en el botón **Crear Clave API**
1. Ingresa la siguiente información:

- **Nota de Clave API**: Una etiqueta para tu clave API (por ejemplo, "Bot de Trading")
- **Lista Blanca de IP** (Opcional): Agrega la dirección IP del bot (IP mostrada en la página Cuenta)
1. Completa la verificación de seguridad (2FA, email, etc.)
1. Una vez creada, **copia y guarda inmediatamente la Clave de Acceso y la Clave Secreta**

> **WARNING:**
> ¡La Clave Secreta solo se muestra una vez! Guárdala de forma segura antes de cerrar la ventana.

1. Configura los permisos de API:

- Habilita el permiso de **Trading Spot**
- Deshabilita el permiso de **Retiros** (por seguridad)
1. Haz clic en **Confirmar** para guardar la clave API

> **IMPORTANT:**
> Para todos los exchanges:
>
> ** **Nunca compartas tus claves API* con nadie
> ** **Nunca habilites permisos de retiro* para bots de trading
> ** **Usa lista blanca de IP* cuando sea posible para mayor seguridad
> ** **Almacena tus claves de forma segura* - considera usar un gestor de contraseñas
> * Si pierdes el acceso a tus claves, elimínalas del exchange y crea nuevas

## Configuración del Bot

### Crear un Nuevo Bot

1. Navega a **Bots** → **Nuevo Bot**
1. Configura todos los parámetros requeridos (detallados a continuación)
1. Haz clic en **Crear Bot** para inicializar
1. El bot se creará en estado pausado

### Parámetros de Configuración Principales

#### Configuración Básica

**Etiqueta del Bot** (Opcional)
- Un nombre personalizado para identificar fácilmente tu bot
- Ejemplo: "BTC Largo Plazo", "ETH Swing Trade"

**Intervalo del Bot** (Requerido, 3-30 segundos)
- La frecuencia con la que el bot verifica precios y ejecuta operaciones
- Por defecto: 5 segundos
- Intervalos más bajos = más receptivo pero mayor uso de API
- Intervalos más altos = menos receptivo pero menor uso de API
- **Recomendación**: Usa 5-10 segundos para la mayoría de estrategias

**Par de Trading** (Requerido)
- El par de criptomonedas a operar
- Formato: `CRYPTO-USDT` (ej: BTC-USDT, ETH-USDT)
- Una vez establecido, **no se puede cambiar** para un bot existente

#### Información del Mercado (Auto-rellenado)

**Comisión del Mercado**
- El porcentaje de comisión de trading cobrado por el exchange
- Se calcula automáticamente según tu nivel VIP (si aplica)
- Se utiliza para calcular márgenes de ganancia precisos

**Clase de Símbolo**
- Clasificación del par de trading (solo en ciertos exchanges)
- Afecta la estructura de comisiones

**Tamaño Mínimo**
- La cantidad mínima de criptomoneda que se puede operar
- Establecida por el exchange para cada par de trading

**Incremento Mínimo**
- El incremento de precio más pequeño para el par de trading
- Determina la precisión de las órdenes de compra/venta

### Parámetros de Inversión

**Inversión Máxima** (Requerido, mínimo: 10 USDT)
- El monto total de USDT que deseas asignar a este bot
- Ejemplo: 1000 USDT significa que el bot usará hasta 1000 USDT para operar
- Este monto se divide entre todas las posiciones

**Posiciones Máximas** (Requerido, mínimo: 1)
- El número máximo de posiciones de compra simultáneas que el bot puede mantener
- Ejemplo: 10 posiciones con 1000 USDT = 100 USDT por posición
- Más posiciones = mejor promedio pero tamaños de posición más pequeños

**Precio por Posición** (Se calcula automáticamente)
- El monto asignado por posición
- Fórmula: `Inversión Máxima / Posiciones Máximas`
- Ejemplo: 1000 USDT / 10 posiciones = 100 USDT por posición

**Umbral de Clúster de Posiciones** (Requerido, predeterminado: 1)
- Número de posiciones que activa la detección de clúster cerca de cualquier nivel de precio
- Al recomprar, el bot verifica si existen tantas posiciones cerca del precio de venta
- Rango: 1 a (Posiciones Máximas - 1)
- El bot crea una zona de amortiguación alrededor del precio de venta usando ±porcentaje de margen de ganancia
- Ejemplo: Con 5% de margen y umbral de 2, si existen 2+ posiciones entre $95-$105 al vender en $100, omitir recompra
- Valores más altos = permite más posiciones al mismo nivel de precio antes de evitar recompra
- **Recomendación**: Usa 1-2 para mantener amplia distribución, 3-4 para más tolerancia a la concentración

**Ganancias como Criptomoneda** (Interruptor)
- Cuando está habilitado, una parte de cada venta mantiene la criptomoneda en lugar de convertir todo a USDT
- Acumula la criptomoneda base con el tiempo
- Ejemplo: Al vender BTC, conservar algo de BTC en lugar de convertir todo a USDT
- **Recomendación**: Habilitar si deseas acumular la criptomoneda a largo plazo
- **Advertencia**: Asegúrate de que el incremento mínimo permita pequeñas cantidades de cripto

> **NOTE:**
> **Importante**: La característica "Ganancias como Criptomoneda" calcula cuánta cripto vender para lograr tu objetivo de ganancia en USDT, luego vende la cantidad restante y mantiene la diferencia en cripto.

**Reinvertir Ganancias hasta Posiciones Máximas** (Opcional)
- Si se establece, el bot agregará posiciones adicionales usando ganancias acumuladas
- Ejemplo: Establecido a 15 con Posiciones Máximas de 10

** El bot comienza con 10 posiciones
** A medida que se acumulan las ganancias, el bot puede crecer hasta 15 posiciones
** Una vez que hay ganancias suficientes, las posiciones libres aumentan más allá de 10

- Dejar vacío para desactivar esta característica

**Reinvertir Ganancias** (Interruptor)
- Cuando está habilitado, las ganancias en USDT se utilizan para aumentar el tamaño de cada posición
- Compone las ganancias haciendo que cada nueva compra sea más grande
- **Recomendación**: Habilitar para estrategias de composición a largo plazo

### Parámetros de Estrategia de Trading

#### Comportamiento de Caída de Precio

El bot ofrece dos modos para configurar cómo reacciona ante caídas de precio:

**1. Modo de Umbral Único** (Umbral constante)
- Un porcentaje fijo se aplica a todas las posiciones
- Configuración más simple
- Ejemplo: 2% significa comprar cuando el precio cae 2% desde el pico más reciente
- **Usar cuando**: Deseas un comportamiento de compra consistente en todas las posiciones
- **Recomendación**: 1-3% para mercados volátiles, 0.5-1% para mercados estables

**2. Modo de Array de Umbrales** (Perfil de umbral)
- Define diferentes umbrales para cada posición
- Permite una estrategia de compra progresiva a medida que el precio cae más
- Formato: Valores separados por comas (ej: `0.2, 0.2, 0.5, 0.5, 1.0`)
- Ejemplo con 5 posiciones:

** Posición 1: Comprar cuando el precio cae 0.2%
** Posición 2: Comprar cuando el precio cae 0.2% adicional (total 0.4%)
** Posición 3: Comprar cuando el precio cae 0.5% adicional (total 0.9%)
** Posición 4: Comprar cuando el precio cae 0.5% adicional (total 1.4%)
** Posición 5: Comprar cuando el precio cae 1.0% adicional (total 2.4%)

- **Usar cuando**: Deseas comprar más agresivamente a medida que el precio cae más
- **Consejo Estratégico**: Comienza con umbrales pequeños e increméntalos para posiciones más profundas
- **Nota**: El número de umbrales debe coincidir o exceder tus posiciones máximas

**Elegir Entre Modos:**
- **Umbral Único**: Mejor para principiantes, comportamiento predecible, promedio uniforme
- **Array de Umbrales**: Estrategia avanzada, puede optimizar puntos de entrada, mejor para DCA en mercados volátiles
- Puedes cambiar entre modos en cualquier momento editando la configuración del bot

#### Posiciones de Emergencia (Opcional)

**Umbral de Posición de Emergencia** (Opcional, 0.1-100%)
- Desbloquea posiciones de emergencia adicionales cuando todas las posiciones regulares están agotadas
- Se activa cuando el precio baja este porcentaje desde el último precio de compra
- Ejemplo: Umbral del 5% con última compra en $50,000 = Compra de emergencia en $47,500

**Número de Posiciones de Emergencia** (Opcional, predeterminado: 1)
- Limita el número máximo de posiciones de emergencia que pueden estar activas simultáneamente
- Cada posición de emergencia opera independientemente con su propio ciclo de venta/recompra
- Ejemplo: Establecer en 3 permite hasta 3 posiciones de emergencia concurrentes

**Cómo funciona**:

** Cuando todas las posiciones están usadas (posiciones libres = 0)
** Y el precio baja el umbral de emergencia desde la última compra
** El bot compra una posición de emergencia (si el saldo lo permite y no se alcanzó el límite)
** La posición de emergencia se vende y recompra automáticamente cuando el precio sube
** Crea un ciclo de trading de emergencia autosostenible
** Si se alcanza el límite, no se comprarán más posiciones de emergencia hasta que una se venda

- **Caso de uso**: Capturar oportunidades durante caídas severas del mercado
- **Riesgo**: Utiliza capital adicional más allá de la inversión máxima (inversión × posiciones de emergencia)
- **Recomendación**: Umbral 3-10%, Posiciones 1-3 según tolerancia al riesgo y capital disponible
- Dejar el umbral vacío para deshabilitar posiciones de emergencia

> **WARNING:**
> **Importante**: Las posiciones de emergencia requieren saldo disponible más allá de tu inversión máxima configurada. Asegúrate de tener fondos suficientes para cubrir posibles compras de emergencia.

**Margen de Ganancia** (Requerido, 0.1-100%)
- El objetivo de porcentaje de ganancia para cada posición antes de vender
- Ejemplo: 1.5% significa vender cuando el precio sube 1.5% por encima del precio de compra (después de comisiones)
- Incluye comisiones de compra y venta en el cálculo
- Valores más bajos = toma de ganancias más rápida, más transacciones
- Valores más altos = toma de ganancias más lenta, ganancias potencialmente mayores
- **Recomendación**: 0.8-2% según la volatilidad del mercado

#### Evitar Recompra en Zona de Precio Alto

El bot incluye lógica inteligente para prevenir recompras prematuras al vender posiciones a precios altos. Esta característica ayuda a preservar capital durante picos de precio y optimiza la estrategia de recompra.

**Cómo Funciona:**

Cuando vendes una posición, el bot normalmente recompra inmediatamente si hay posiciones libres disponibles. Sin embargo, para evitar recomprar a precios inflados, el bot analiza tus posiciones con los precios más altos:

1. Toma tus N mejores posiciones (basado en la configuración "Posiciones Altas")
1. Identifica el rango de precio de estas posiciones más altas
1. Calcula un límite inferior usando el porcentaje de umbral
1. Si el precio de venta cae dentro de esta zona de precio alto, la recompra es **omitida**

**Detalles del Algoritmo:**
```
posicionesAltas = Ordenar todas las compras por precio (más alto primero)
                  Tomar las primeras N posiciones (N = Posiciones Altas)

precioMaxCompra = Precio de compra más alto
precioMin = Precio más bajo entre las N mejores posiciones
límiteInferior = precioMin × (1 - umbral/100)
precioVentaObjetivo = precioMaxCompra × (1 + margen/100)
límiteSuperior = max(precioVentaObjetivo, precioMaxTrabajo)

si (precio de venta está entre límiteInferior y límiteSuperior):
    Omitir recompra para preservar fondos para mejores puntos de entrada
```

**Ejemplo Práctico:**

Configuración:
- Posiciones Máximas: 10
- Posiciones Altas: 3
- Umbral: 2%
- Margen de Ganancia: 1.5%

Posiciones Actuales:
```
Posición 1: $52,000
Posición 2: $51,500
Posición 3: $51,000
Posición 4: $49,000
Posición 5: $48,000
... (otras a precios más bajos)
```

Top 3 posiciones (N=3):
- Precio máx compra: $52,000
- Precio mín: $51,000
- Límite inferior: $51,000 × (1 - 0.02) = $49,980
- Precio objetivo venta: $52,000 × (1 + 0.015) = $52,780
- Precio máx trabajo (si se define): $53,000
- Límite superior: max($52,780, $53,000) = $53,000

Rango de Zona de Precio Alto: $49,980 a $53,000

**Escenarios:**
- Vender a $51,500: **Recompra omitida** (dentro de la zona de precio alto)
- Vender a $52,800: **Recompra omitida** (dentro de la zona de precio alto, entre objetivo de venta y precio máx trabajo)
- Vender a $53,500: **Recompra permitida** (por encima de la zona de precio alto)
- Vender a $49,500: **Recompra permitida** (por debajo de la zona de precio alto)

**Por Qué Importa:**

- **Previene Amplificación de Pérdidas**: Evita recomprar inmediatamente a precios altos solo para verlos caer nuevamente
- **Optimiza Eficiencia del Capital**: Preserva fondos para mejores puntos de entrada a precios más bajos
- **Reduce Costos de Transacción**: Menos ciclos compra-venta innecesarios en picos
- **Mejora Precio de Entrada Promedio**: Espera correcciones de precio antes de recomprar

**Consejos Estratégicos:**

- **"Posiciones Altas" Más Alto** (3-5): Zona de precio alto más amplia, estrategia de recompra más conservadora
- **"Posiciones Altas" Más Bajo** (1-2): Zona de precio alto más estrecha, recompras más agresivas
- **Mercados Volátiles**: Usar valores bajos (1-2) para capturar rebotes rápidamente
- **Mercados Estables/Laterales**: Usar valores altos (3-5) para evitar recompras prematuras

> **NOTE:**
> **Nota**: Esta característica solo aplica cuando tienes al menos tantas posiciones como tu configuración "Posiciones Altas". Con menos posiciones, se aplica la lógica de recompra normal.

### Rango de Precio de Trabajo (Opcional pero Recomendado)

**Precio de Trabajo Mínimo**
- El precio más bajo al que el bot comprará
- Previene compras durante caídas severas
- Dejar vacío para ningún límite mínimo

**Precio de Trabajo Máximo**
- El precio más alto al que el bot comprará
- Previene compras en picos de precio
- Dejar vacío para ningún límite máximo

**Al Crear un Nuevo Bot:**

**% de Disminución Mínima** (Para nuevos bots)
- Porcentaje por debajo del precio actual para establecer el precio de trabajo mínimo
- Ejemplo: 10% con precio actual de $50,000 = Precio de trabajo mínimo de $45,000

**% de Aumento Máximo** (Para nuevos bots)
- Porcentaje por encima del precio actual para establecer el precio de trabajo máximo
- Ejemplo: 10% con precio actual de $50,000 = Precio de trabajo máximo de $55,000

> **NOTE:**
> **Consejo Estratégico**: Establecer un rango de trabajo ayuda a evitar malas decisiones de compra durante condiciones extremas del mercado.

### Modo Simulación

**Simulación** (Interruptor)
- Cuando está habilitado, el bot se ejecuta sin colocar órdenes reales
- Todas las transacciones son simuladas
- Perfecto para:

** Probar nuevas estrategias
** Aprender cómo funciona el bot
** Probar parámetros

- **No se puede cambiar** después de la creación del bot

> **NOTE:**
> **Nota**: Los bots simulados se marcan con un color de advertencia y se etiquetan como "SIMULACIÓN" en toda la interfaz.

## Comportamiento del Bot

### Lógica de Trading

El bot opera con un enfoque sistemático con la siguiente lógica:

#### Condiciones de Compra

El bot ejecutará una COMPRA cuando **TODAS** las siguientes condiciones se cumplan:

1. **Posiciones Libres Disponibles**: Existe al menos una posición libre
1. **No Detenido**: El indicador "Detener Compras" no está establecido
1. **Verificación de Rango de Precio**: El precio actual está dentro del rango de precio de trabajo min/max (si está establecido)
1. **Uno de Estos Disparadores**:

- **Primer Ciclo**: El bot acaba de comenzar (ciclo 0)
- **Caída de Precio**: El precio cayó según el umbral configurado desde el precio más alto más reciente
- **Recompra Después de Venta**: Acaba de vender una posición Y el recuento de posiciones recompradas está por debajo del límite configurado

**Detalles de Orden de Compra:**
- **Tipo de Orden**: Orden de mercado (se ejecuta inmediatamente al precio de mercado actual)
- **Cantidad**: Calculada desde el precio de posición dividido por el precio actual
- **Redondeo**: La cantidad se redondea hacia abajo para cumplir con los requisitos de incremento del exchange

#### Condiciones de Venta

El bot ejecutará una VENTA cuando:

1. **Precio Objetivo Alcanzado**: El precio objetivo de una compra ha sido alcanzado o superado
1. **Cálculo del Precio Objetivo**:

```
Precio Objetivo = ((Pagado + Comisión de Compra) × (1 + Tasa de Comisión de Venta) × (1 + Margen de Ganancia)) / Cantidad
```

Esto asegura que las comisiones y el margen de ganancia se tengan en cuenta.

**Detalles de Orden de Venta:**
- **Tipo de Orden**: Orden de mercado (se ejecuta inmediatamente al precio de mercado actual)
- **Cantidad Vendida**:

*** Si "Ganancias como Criptomoneda" es **DESHABILITADO*: Vende la posición completa
*** Si "Ganancias como Criptomoneda" es **HABILITADO*: Vende solo lo suficiente para lograr el objetivo de ganancia en USDT, mantiene el resto como cripto

#### Gestión de Posiciones

**Contador de Posiciones Libres:**
- Comienza en `Posiciones Máximas` cuando se crea el bot
- Disminuye en 1 con cada compra
- Aumenta en 1 con cada venta
- Puede volverse negativo si se hacen compras manuales forzadas
- Puede exceder `Posiciones Máximas` si la reinversión de ganancias está habilitada

**Seguimiento del Precio Más Alto:**
- El bot rastrea el precio más alto alcanzado desde la última venta
- Este valor se utiliza para calcular cuándo se cumple un umbral de caída de precio
- Se reinicia al precio actual después de cada compra

**Contador de Posiciones Recompradas:**
- Rastrea cuántas posiciones fueron recompradas durante un mercado alcista
- Aumenta cuando se vende y se recompra inmediatamente
- Previene recompra excesiva durante tendencias alcistas sostenidas
- Se reinicia cuando el precio cae y desencadena una compra basada en la caída

### Ciclo de Vida del Bot

#### 1. Creación

- El bot se crea con la configuración
- Estado inicial: **No Iniciado, No Pausado**
- Se registra el precio de apertura

#### 2. Inicio

- El usuario hace clic en el botón "Iniciar"
- El bot entra en estado **Iniciado, No Pausado**
- La configuración se valida
- Se verifican los pares de trading y las claves API
- El bot comienza su bucle de ciclo principal

#### 3. En Ejecución

- **Verificación de Precios**: Obtiene el precio actual en cada intervalo
- **Evaluación de Condiciones**: Verifica las condiciones de compra y venta
- **Ejecución de Órdenes**: Coloca órdenes de compra/venta cuando se cumplen las condiciones
- **Persistencia de Estado**: Guarda el estado en la base de datos después de cada ciclo
- **Registro**: Registra todas las actividades en un archivo de registro específico del bot

#### 4. Pausa

- El usuario hace clic en el botón "Pausa"
- El bot entra en estado **Iniciado, Pausado**
- No se colocan nuevas órdenes
- Las posiciones actuales permanecen abiertas
- Puede reanudarse en cualquier momento

#### 5. Detención

- El usuario detiene el bot (específico de la implementación)
- El bot deja de verificar precios y colocar órdenes
- Las posiciones permanecen abiertas hasta cerrar manualmente

### Comportamientos Especiales

#### Modos Detener Compras

El bot cuenta con dos controles independientes para detener compras en diferentes condiciones de mercado:

**1. Detener Compra en Caída de Precio**
- Activado a través del botón "Detener Compra en Caída"
- El bot deja de comprar cuando los precios caen, pero continúa con el comportamiento normal de recompra cuando los precios suben
- Útil cuando crees que el mercado ha tocado fondo y deseas preservar capital
- Puede invertirse con el botón "Reanudar Compra en Caída"

**2. Detener Compra en Recompra**
- Activado a través del botón "Detener Compra en Recompra"
- El bot deja de recomprar automáticamente después de vender posiciones durante precios en alza
- Continúa comprando en nuevas caídas de precio según se configure
- Útil para asegurar ganancias durante tendencias alcistas sin atrapar cuchillos que caen
- Puede invertirse con el botón "Reanudar Compra en Recompra"

**Ambos Modos:**
- El bot continúa vendiendo posiciones rentables incluso cuando uno de los modos está activo
- Pueden combinarse (ambos habilitados simultáneamente) para pausar toda actividad de compra
- Cada uno puede ser controlado independientemente para escenarios de mercado específicos

#### Acciones Manuales Forzadas

Los usuarios pueden desencadenar manualmente acciones:
- **Venta Manual**: Vende todas las posiciones actualmente rentables
- **Compra Forzada**: Coloca una orden de compra incluso si las condiciones no se cumplen
- **Venta Forzada**: Vende posiciones específicas incluso por debajo del objetivo de ganancia
- **Actualizar Configuración**: Modifica parámetros mientras el bot se ejecuta (campos limitados)

#### Impulso de Posición

- Se calcula automáticamente a partir de la configuración de reinversión de ganancias
- Aumenta las posiciones libres más allá de las `Posiciones Máximas` base
- Fórmula basada en la ganancia acumulada y el precio de posición

#### Impulso de USDT

- Aumenta el monto de USDT por posición cuando "Reinvertir Ganancias" está habilitado
- Compone las ganancias en posiciones más grandes con el tiempo
- Calculado a partir de la ganancia total dividida por las posiciones máximas

## Gestión de Transacciones

### Ver Transacciones

1. Navega a la página **Trading**
1. Selecciona un bot de tu lista
1. Ve el historial de transacciones en la pestaña **Transacciones**

### Tipos de Transacciones

**Transacciones de Compra:**
- **Cantidad**: Cantidad de criptomoneda comprada
- **Precio**: Precio al que se compró
- **Pagado**: Total de USDT gastado
- **Comisión**: Comisión de exchange pagada
- **Precio Objetivo**: Precio de venta calculado para ganancia
- **Estado**: Activo (esperando venta) o Vendido

**Transacciones de Venta:**
- **Cantidad**: Cantidad de criptomoneda vendida
- **Precio**: Precio al que se vendió
- **Precio de Compra**: Precio de compra original
- **Ganancia**: Ganancia en USDT realizada (después de comisiones)
- **Comisión**: Comisión de exchange pagada

### Controles Manuales de Transacciones

**Pausar/Reanudar Compras Específicas:**
- Haz clic en el icono de pausa en cualquier compra activa
- Las compras pausadas no se venderán automáticamente
- Útil para mantener posiciones específicas más tiempo

**Venta Forzada:**
- Haz clic en el icono de venta en cualquier compra activa
- Vende inmediatamente al precio de mercado independientemente de la ganancia
- Úsalo cuando necesites liquidar urgentemente

## Monitoreo y Análisis

### Panel de Control del Bot

El panel principal muestra:

**Indicadores de Estado del Bot:**
- **En Ejecución** (Verde): El bot está operando activamente
- **Pausado** (Amarillo): El bot está pausado
- **Detenido** (Gris): El bot no se está ejecutando

**Métricas de Rendimiento:**
- **Ganancia Total (USDT)**: Ganancia acumulada en USDT
- **Ganancia Total (Cripto)**: Criptomoneda acumulada (si está habilitada)
- **Transacciones Totales**: Número de ciclos de compra/venta completados
- **Precio Actual**: Precio de criptomoneda en vivo
- **Posiciones Libres**: Posiciones disponibles para compra
- **Ciclos**: Número de ciclos de verificación completados

**Visualización de Configuración:**
- Todos los parámetros de configuración clave
- Rango de precio de trabajo actual
- Cursor de precio visual mostrando la posición relativa al rango

### Selección de Bots

El listado de bots proporciona un sistema de selección mediante casillas de verificación para administrar múltiples bots:

**Selección Individual de Bot:**
- Haz clic en la casilla de verificación a la izquierda de cualquier fila de bot para seleccionar/deseleccionar
- Los bots seleccionados se resaltan para fácil identificación
- La selección persiste mientras navegas y los bots se actualizan en tiempo real
- Las selecciones se borran cuando cambias los criterios de filtro

**Casilla Maestra:**
- Ubicada en la fila de encabezado arriba de todos los bots
- **Estado Marcado** (✓): Todos los bots visibles están seleccionados
- **Estado Desmarcado** (☐): Ningún bot está seleccionado
- **Estado Indeterminado** (⊟): Algunos bots están seleccionados
- Haz clic en la casilla maestra para seleccionar/deseleccionar rápidamente todos los bots visibles
- Solo afecta a los bots actualmente visibles (respeta filtros activos)

**Borrado de Selecciones:**
- Las selecciones se borran automáticamente cuando cambias:
** Criterios de filtro (búsqueda, alternancia de simulación, filtro de ejecutándose/pausado)
** Esto asegura que tu selección sea relevante para tu vista actual

**Usando Selecciones:**
- Las operaciones globales (Pausar, Reanudar, controles Detener Compras) solo afectan a los bots seleccionados
- Consulta la sección "Controles Globales de Bot" a continuación para más detalles

### Panel de Control del Bot

El panel principal muestra:

**Indicadores de Estado del Bot:**
- **En Ejecución** (Verde): El bot está operando activamente
- **Pausado** (Amarillo): El bot está pausado
- **Detenido** (Gris): El bot no se está ejecutando

**Métricas de Rendimiento:**
- **Ganancia Total (USDT)**: Ganancia acumulada en USDT
- **Ganancia Total (Cripto)**: Criptomoneda acumulada (si está habilitada)
- **Transacciones Totales**: Número de ciclos de compra/venta completados
- **Precio Actual**: Precio de criptomoneda en vivo
- **Posiciones Libres**: Posiciones disponibles para compra
- **Ciclos**: Número de ciclos de verificación completados

**Visualización de Configuración:**
- Todos los parámetros de configuración clave
- Rango de precio de trabajo actual
- Cursor de precio visual mostrando la posición relativa al rango

### Controles Globales de Bot

El encabezado de la lista de bots proporciona controles que afectan a los bots seleccionados:

**Pausar/Reanudar**
- **Pausar**: Pausa todos los bots seleccionados (si ninguno está seleccionado, se muestra atenuado)
- **Reanudar**: Reanuda todos los bots seleccionados (si ninguno está seleccionado, se muestra atenuado)
- Solo afecta a los bots seleccionados actualmente mediante casillas
- Usa la casilla maestra para pausar/reanudar rápidamente todos los bots visibles

**Controles Detener Compras**
- **Detener Compra en Caída**: Previene compras en caídas de precio para bots seleccionados
- **Detener Compra en Recompra**: Previene recompras automáticas para bots seleccionados
- **Reanudar Compra en Caída**: Reactiva compras en caídas de precio para bots seleccionados
- **Reanudar Compra en Recompra**: Reactiva recompras automáticas para bots seleccionados
- Todos los botones de control de compras solo afectan a bots seleccionados
- Los botones muestran estado habilitado/deshabilitado según la selección

**Requisitos de Selección:**
- Para usar cualquier control global, debes seleccionar al menos un bot
- Los controles están deshabilitados (atenuados) cuando no hay bots seleccionados
- El estado de selección se muestra en el encabezado (por ejemplo, "3 seleccionados")

**Ejemplo de Flujo de Trabajo:**
1. Selecciona los bots que deseas controlar usando casillas
1. Haz clic en **Pausar** para pausar solo esos bots
1. Tus otros bots continúan operando normalmente
1. Haz clic en **Detener Compra en Caída** para prevenir compras por caída de precio solo en bots seleccionados

**Consejo:**
- Usa la casilla maestra para seleccionar/deseleccionar rápidamente todos los bots visibles
- Combina con filtros para dirigirse a grupos específicos de bots (por ejemplo, todos los bots de simulación)

### Visualización de Precios

**Cursor de Precio:**
- Representación visual del precio actual dentro del rango de trabajo
- Las marcas muestran precios de compra y precios de venta objetivo
- Ayuda a visualizar la posición del bot en el mercado

**Rangos de Transacciones:**
- Rango verde: Zona de venta potencial (por encima de precios de compra)
- Rango rojo: Zona de compra potencial (por debajo del precio más alto actual)

### Registros

**Acceder a Registros:**
1. Navega a **Admin** → **Registros** (requiere permisos de administrador)
1. Selecciona usuario y bot
1. Ve el flujo de registro en tiempo real

**Información de Registro:**
- Verificaciones de precio y decisiones
- Colocación de órdenes de compra/venta
- Cambios de configuración
- Errores y advertencias
- Métricas de rendimiento

### Saldos

**Ver Saldos:**
1. Navega a la página **Saldos**
1. Ve holdings actuales en exchanges
1. Ve saldos disponibles y en uso

**Componentes de Saldo:**
- **Disponible**: Fondos disponibles para operar
- **En Órdenes**: Fondos actualmente en órdenes abiertas
- **Total**: Suma de disponible y en órdenes

## Funciones Avanzadas

### Importación/Exportación de Configuración de Bot

**Exportar Configuraciones:**
1. Ve a la página **Cuenta**
1. Haz clic en **Gestionar Configuraciones de Bot**
1. Haz clic en **Descargar JSON**
1. Las configuraciones se guardan en un archivo JSON con marca de tiempo

**Importar Configuraciones:**
1. Ve a la página **Cuenta**
1. Haz clic en **Gestionar Configuraciones de Bot**
1. Haz clic en **Cargar JSON**
1. Selecciona tu archivo JSON previamente exportado
1. El sistema valida y crea bots a partir de las configuraciones

> **NOTE:**
> **Nota**: Las configuraciones importadas deben coincidir con el exchange actualmente seleccionado. Los bots se crean en estado pausado.

### Gestión de Múltiples Bots

**Ejecutar Múltiples Bots:**
- Crea múltiples bots para diferentes pares de trading
- Cada bot opera independientemente
- Gestiona todos los bots desde el panel principal

**Mejores Prácticas:**
- No sobre-asignes fondos entre bots
- Monitorea la inversión total en todos los bots
- Considera la correlación entre pares de trading
- Asegura saldo suficiente para todos los bots activos

### Estrategias de Ganancia

**Estrategia Conservadora:**
- Margen de ganancia más alto (1.5-3%)
- Umbral de caída de precio más bajo (0.5-1%)
- Menos posiciones máximas (5-10)
- Sin reinversión de ganancias
- Resultado: Ganancias más lentas pero más confiables

**Estrategia Agresiva:**
- Margen de ganancia más bajo (0.5-1.2%)
- Umbral de caída de precio más alto (2-5%)
- Más posiciones máximas (15-30)
- Reinversión de ganancias habilitada
- Resultado: Ganancias más rápidas pero más volátiles

**Estrategia de Acumulación:**
- Habilitar "Ganancias como Criptomoneda"
- Margen de ganancia medio (1-2%)
- Posiciones medias (10-20)
- Habilitar reinversión de ganancias
- Resultado: Acumular criptomoneda mientras se realizan ganancias en USDT

### Características Específicas del Exchange

**Descuentos de Comisión VIP (Binance, KuCoin):**
- El bot detecta automáticamente tu nivel VIP
- Las comisiones se ajustan según tu volumen de trading
- Cálculos de ganancia más precisos

**Clases de Pares de Trading (KuCoin):**
- Diferentes estructuras de comisión para diferentes clases de pares
- Se muestra en la configuración del bot

## Solución de Problemas

### Problemas Comunes

#### El Bot No Inicia

**Síntomas:**
- El bot muestra "No Iniciado" después de hacer clic en Iniciar
- Mensajes de error en registros

**Soluciones:**
1. **Verificar Claves API**: Asegúrate de que las claves API estén correctamente configuradas
1. **Verificar Permisos**: Las claves API deben tener permisos de trading
1. **Verificar Saldo**: Asegúrate de que haya saldo suficiente en USDT para al menos una posición
1. **Revisar Par de Trading**: Verifica que el par de trading esté disponible en el exchange
1. **Revisar Registros**: Revisa los registros del bot para mensajes de error específicos

#### Sin Actividad de Compra

**Síntomas:**
- El bot se está ejecutando pero no coloca órdenes de compra

**Causas Posibles:**
1. **Sin Posiciones Libres**: Todas las posiciones están llenas

** Solución: Espera ventas o aumenta las posiciones máximas

1. **Detener Compras Activo**: Verifica si el modo "Detener Compra en Caída" o "Detener Compra en Recompra" está habilitado

** Solución: Haz clic en "Reanudar Compra en Caída" y/o "Reanudar Compra en Recompra" según sea apropiado

1. **Precio Fuera de Rango**: El precio actual está fuera del rango de trabajo

** Solución: Ajusta los precios de trabajo min/max

1. **Saldo Insuficiente**: No hay suficiente USDT para una posición

** Solución: Añade fondos o reduce el tamaño de posición

1. **Precio No Ha Bajado Lo Suficiente**: Esperando el umbral de caída de precio

** Solución: Espera o reduce el umbral de caída de precio

#### Sin Actividad de Venta

**Síntomas:**
- El bot tiene posiciones pero no vende

**Causas Posibles:**
1. **Precio Objetivo No Alcanzado**: El precio no ha subido lo suficiente para ganancia

** Solución: Espera o reduce el margen de ganancia

1. **Compras Pausadas**: Algunas compras pueden estar pausadas manualmente

** Solución: Reanuda compras pausadas

1. **Tendencia Bajista del Mercado**: El precio está por debajo de precios de compra

** Solución: Espera la recuperación del mercado o usa venta forzada

#### Las Órdenes Fallan

**Síntomas:**
- Mensajes de error sobre órdenes fallidas en registros

**Causas Posibles:**
1. **Saldo Insuficiente**: Fondos insuficientes para órdenes de compra
1. **Cantidad Muy Pequeña**: Tamaño de orden por debajo del mínimo del exchange

** Solución: Aumenta el tamaño de posición o la inversión máxima

1. **Cantidad Muy Grande**: La orden excede el saldo disponible
1. **Límites de Tasa de API**: Demasiadas solicitudes al exchange

** Solución: Aumenta el intervalo del bot

1. **Problemas del Exchange**: Problemas temporales del exchange

** Solución: Espera y reintenta

#### Cálculos de Ganancia Incorrectos

**Síntomas:**
- Las ganancias no coinciden con las expectativas

**Explicaciones:**
1. **Comisiones**: Las comisiones de compra y venta reducen la ganancia
1. **Deslizamiento**: Las órdenes de mercado pueden ejecutarse a precios ligeramente diferentes
1. **Ganancias como Criptomoneda**: Parte de la ganancia se mantiene como cripto, reduciendo la ganancia en USDT
1. **Redondeo**: Cantidades pequeñas pueden redondearse diferentemente

### Mensajes de Error

**"Claves API de exchange inválidas"**
- Vuelve a ingresar tus claves API en la configuración de cuenta
- Verifica que las claves estén activas en el exchange

**"Par de trading seleccionado no disponible"**
- Verifica si el par de trading existe en tu exchange
- Verifica el formato del par de trading (ej: BTC-USDT)

**"Tamaño mínimo no cumplido"**
- Aumenta la inversión máxima o reduce las posiciones máximas
- Asegúrate de que el tamaño de posición cumple con el mínimo del exchange

**"No se puede obtener el precio actual"**
- Verifica la conexión a internet
- Verifica que la API del exchange sea accesible
- Espera a que se resuelvan los problemas temporales del exchange

**"Saldo insuficiente"**
- Añade más USDT a tu cuenta del exchange
- Reduce el tamaño de posición o el número de posiciones

### Optimización de Rendimiento

**Respuesta Lenta del Bot:**
- Aumenta el intervalo del bot para reducir llamadas de API
- Verifica la latencia de red al exchange

**Recuento de Transacciones Alto:**
- Aumenta el margen de ganancia (menos ganancias pequeñas)
- Aumenta el umbral de caída de precio (compras menos frecuentes)

**Problemas de Memoria (Avanzado):**
- Contacta al administrador
- Puede requerir reinicio del servicio del bot

### Obtener Ayuda

**Información a Proporcionar:**
1. Nombre del exchange
1. Par de trading
1. Parámetros de configuración del bot
1. Extractos de registros recientes
1. Descripción del comportamiento inesperado
1. Capturas de pantalla si aplica

## Mejores Prácticas

### Gestión de Riesgos

1. **Comienza Pequeño**: Comienza con inversiones pequeñas para aprender el sistema
1. **Usa Modo Simulación**: Prueba estrategias antes de usar fondos reales
1. **Diversifica**: No pongas todos los fondos en un bot o par de trading
1. **Establece Expectativas Realistas**: Los mercados cripto son volátiles
1. **Monitorea Regularmente**: Verifica el rendimiento del bot diariamente
1. **Mantén Reservas**: No asignes 100% de tu saldo del exchange

### Consejos de Configuración

1. **Configuración Conservadora**: Comienza con márgenes de ganancia más altos y menos posiciones
1. **Rango de Trabajo**: Siempre establece precios de trabajo min/max para evitar compras en extremos
1. **Número de Posiciones**: Más posiciones = mejor promedio pero llenado de posición más lento
1. **Margen de Ganancia**: Cubre al menos 2x las comisiones de trading (ej: 0.2% comisión = 0.5% margen mínimo)
1. **Intervalo del Bot**: 5-10 segundos es óptimo para la mayoría de escenarios

### Seguridad

1. **Claves API**: Nunca compartas tus claves API
1. **Permisos de Retiro**: Desactiva los permisos de retiro en las claves API
1. **Restricciones de IP**: Habilita lista blanca de IP en el exchange si está disponible
1. **Auditorías Regulares**: Revisa regularmente las transacciones del bot
1. **Contraseñas Fuertes**: Usa contraseñas fuertes y únicas para la plataforma

### Mantenimiento

1. **Revisiones Regulares**: Verifica el rendimiento del bot semanalmente
1. **Actualizaciones de Configuración**: Ajusta parámetros según condiciones del mercado
1. **Gestión de Saldo**: Asegúrate de saldo suficiente para operaciones del bot
1. **Revisión de Registros**: Revisa registros para errores o advertencias
1. **Actualizaciones de Software**: Mantén la plataforma actualizada (contacta al administrador)

## Glosario

**DCA (Promedio de Costo en Dólares)**: Estrategia de inversión de comprar cantidades fijas en intervalos regulares

**Posición**: Una única orden de compra y su orden de venta correspondiente

**Posiciones Libres**: Número de posiciones disponibles para compra

**Umbral de Caída de Precio**: Porcentaje que el precio debe caer antes de comprar

**Margen de Ganancia**: Porcentaje de ganancia objetivo para cada operación

**Rango de Trabajo**: Límites de precio min/max para actividad del bot

**Precio Objetivo**: Precio de venta calculado para una compra para lograr el margen de ganancia

**Modo Simulación**: Modo de prueba donde no se ejecutan operaciones reales

**Comisión de Exchange**: Comisión cobrada por el exchange para cada operación

**Orden de Mercado**: Orden que se ejecuta inmediatamente al precio de mercado actual

**USDT**: Tether, una stablecoin vinculada al dólar estadounidense

**Recompra**: Comprar nuevamente inmediatamente después de vender durante una subida de precio

**Acción Forzada**: Anulación manual de la automatización del bot

**Deslizamiento**: Diferencia entre el precio de ejecución esperado y el real

## Apéndice

### Plantilla de Configuración

Aquí hay una configuración de inicio recomendada:

```
Etiqueta del Bot: BTC Conservador
Intervalo del Bot: 5 segundos
Par de Trading: BTC-USDT
Inversión Máxima: 1000 USDT
Posiciones Máximas: 10
Posiciones para Recomprar: 1
Umbral de Caída de Precio: 1.5%
Margen de Ganancia: 1.2%
Precio de Trabajo Mínimo: (Precio Actual - 10%)
Precio de Trabajo Máximo: (Precio Actual + 10%)
Reinvertir Ganancias: No
Ganancias como Criptomoneda: No
Simulación: Sí (para pruebas)
```

### Soporte

Para soporte técnico o preguntas:
- Revisa la documentación de la aplicación
- Revisa registros para detalles de error
- Contacta a tu administrador del sistema

---

**Versión del Documento**: 1.0  
**Última Actualización**: 28 de Diciembre de 2025  
**Compatible con**: Bot de Trading v1.x

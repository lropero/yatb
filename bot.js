const beep = require('beepbeep')
const Bottleneck = require('bottleneck')
const chalk = require('chalk')
const clear = require('clear')
const fs = require('fs')
const hash = require('object-hash')
const isOnline = require('is-online')
const logSymbols = require('log-symbols')
const sequential = require('promise-sequential')
const sfx = require('sfx')
const { addMilliseconds, distanceInWordsToNow, format } = require('date-fns')
const { catchError, filter, first, tap } = require('rxjs/operators')
const { interval, throwError, timer } = require('rxjs')

const Advisor = require('./advisor')
const Screen = require('./screen')
const { description, version } = require('./package.json')
const { errorToString, timeframeToMilliseconds, withIndicators } = require('./helpers')

class Bot {
  constructor (config) {
    this.advisors = {}
    this.charts = {}
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 300
    })
    this.init(config)
  }

  addAdvisor (advisorId) {
    return new Promise(async (resolve, reject) => {
      const advisorName = advisorId.charAt(0).toUpperCase() + advisorId.slice(1).toLowerCase()
      try {
        if (!fs.existsSync(`./advisors/${advisorId}.js`)) {
          return reject(new Error(`Advisor ${advisorName} doesn't exist`))
        }
        const configAdvisor = require(`./advisors/${advisorId}.js`)
        if (!(configAdvisor instanceof Object) || Array.isArray(configAdvisor)) {
          return reject(new Error(`Advisor ${advisorName} not properly configured`))
        }
        const margin = parseFloat(configAdvisor.margin || 0)
        const sights = configAdvisor.sights || []
        if ((!(margin > 0) || margin > 100) || !Array.isArray(sights) || !sights.length) {
          return reject(new Error(`Advisor ${advisorName} not properly configured`))
        }
        const configCharts = await Advisor.getConfigCharts(sights)
        const promises = configCharts.map((configChart) => new Promise(async (resolve, reject) => {
          const chartId = hash(configChart)
          if (this.charts[chartId]) {
            return resolve(chartId)
          }
          try {
            await this.addChart(configChart)
            this.logInfo(`Added chart ${this.charts[chartId].name}`)
            return resolve(chartId)
          } catch (error) {
            return reject(error)
          }
        }))
        const chartIdsLoaded = (await Promise.all(promises.map((promise) => promise.catch ? promise.catch((error) => this.logWarning(errorToString(error))) : promise))).filter((chartId) => chartId)
        const chartIds = configCharts.map((configChart) => hash(configChart))
        const advisor = new Advisor(advisorName, chartIds, margin)
        this.advisors[advisorId] = advisor
        this.logSuccess(`Advisor ${advisorName} running${chartIdsLoaded.length < chartIds.length ? ' (' + (chartIds.length - chartIdsLoaded.length) + ' missing chart' + (chartIds.length - chartIdsLoaded.length > 1 ? 's' : '') + ')' : ''}`)
        return resolve()
      } catch (error) {
        return reject(new Error(`Advisor ${advisorName}: ${errorToString(error)}`))
      }
    })
  }

  addChart (configChart) {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      const chartId = hash(configChart)
      if (this.charts[chartId]) {
        delete this.charts[chartId].info
        this.charts[chartId].frozen = false
        if (this.charts[chartId].subscription) {
          this.charts[chartId].subscription.unsubscribe()
        }
      } else {
        this.charts[chartId] = {
          candles: [],
          config: configChart,
          frozen: false,
          id: chartId,
          name: `${configChart.symbol} ${configChart.timeframe} [${chartId.substr(0, 8)}]`
        }
      }
      try {
        const { info, previous, stream } = await this.provider.retrieveChart(configChart, this.exchangeInfo)
        this.charts[chartId].info = info
        previous.subscribe((candles) => {
          this.charts[chartId].candles = candles
          this.show(chartId)
        })
        this.charts[chartId].stream = stream
        this.charts[chartId].subscription = stream.subscribe({
          next: async (candle) => {
            const candles = this.charts[chartId].candles.slice()
            if (candles[candles.length - 1].isFinal) {
              delete candles[candles.length - 1].direction
              candles.push(candle)
              while (candles.length > 500) {
                candles.shift()
              }
            } else {
              if (candle.close === candle.open) {
                candle.direction = 'o'
              } else if (candle.close < candles[candles.length - 1].close) {
                candle.direction = 'd'
              } else if (candle.close > candles[candles.length - 1].close) {
                candle.direction = 'u'
              } else {
                candle.direction = candles[candles.length - 1].direction
              }
              candles[candles.length - 1] = candle
              this.charts[chartId].frozen = false
            }
            const candlesWithIndicators = await withIndicators(candles, configChart.indicators || {})
            this.charts[chartId].candles = candlesWithIndicators
            if (candle.isFinal && configChart.strategies) {
              const candlesForAdvisors = candlesWithIndicators.slice().reverse()
              Object.keys(this.advisors).map(async (advisorId) => {
                const advisor = this.advisors[advisorId]
                if (advisor.chartIds.includes(chartId)) {
                  const advices = await Promise.all(advisor.analyze(candlesForAdvisors, configChart.strategies))
                  advices.filter((advice) => advice).map((advice) => {
                    this.digestAdvice({
                      advisorId,
                      chartId,
                      ...advice
                    })
                  })
                }
              })
            }
            this.show(chartId)
          },
          error: (error) => {
            this.logWarning(`${errorToString(error)}, resetting ${this.charts[chartId].name}`)
            this.resetChart(chartId)
          }
        })
        Object.keys(this.advisors).map((advisorId) => {
          const advisor = this.advisors[advisorId]
          Object.keys(advisor.trades).map((orderId) => {
            const trade = advisor.trades[orderId]
            if (trade.chartId === chartId) {
              this.setStop(trade, advisorId, orderId)
              this.setTarget(trade, advisorId, orderId)
            }
          })
        })
        delete this.charts[chartId].retries
        return resolve()
      } catch (error) {
        if (this.charts[chartId].info) {
          delete this.charts[chartId].info
        }
        if (!this.charts[chartId].retries) {
          this.charts[chartId].retries = 0
        }
        this.charts[chartId].retries++
        const retryTime = 1000 * 60 * this.charts[chartId].retries
        timer(retryTime).subscribe(() => this.resetChart(chartId))
        return reject(new Error(`Chart ${this.charts[chartId].name}: ${errorToString(error)}, retrying in ${distanceInWordsToNow(addMilliseconds(new Date(), retryTime))}`))
      }
    }))
  }

  addProvider (providerId) {
    return new Promise(async (resolve, reject) => {
      const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1).toLowerCase()
      try {
        if (!fs.existsSync(`./providers/${providerId}/index.js`)) {
          return reject(new Error(`Provider ${providerName} doesn't exist`))
        }
        const Provider = require(`./providers/${providerId}`)
        this.provider = new Provider()
        await this.updateExchangeInfo()
        await this.updateFunds(true)
        this.logSuccess(`Provider ${providerName} connected`)
        return resolve()
      } catch (error) {
        return reject(new Error(`Provider ${providerName}: ${errorToString(error)}`))
      }
    })
  }

  async digestAdvice (advice) {
    const { advisorId, chartId, signal, strategyConfig, strategyName } = advice
    const advisor = this.advisors[advisorId]
    const chart = this.charts[chartId]
    const who = `${advisor.name}->${chart.name}->${strategyName}`
    if (chart.info) {
      try {
        switch (signal) {
          case 'CLOSE': {
            this.logInfo(`CLOSE ${who}`)
            break
          }
          case 'LONG': {
            if (advisor.canTrade(chartId)) {
              const amount = ((this.funds[chart.info.quoteAsset] && this.funds[chart.info.quoteAsset].available) || 0) * (advisor.margin / 100)
              if (amount > 0) {
                const { orderId, fills } = await this.placeOrder('BUY', chart.info.symbol, amount)
                if (orderId && fills.length) {
                  this.lastTradedChart = {
                    advisorId,
                    chartId
                  }
                  const commission = Math.round(fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * this.funds[fill.commissionAsset].dollarPrice, 0) * 1000) / 1000
                  const price = fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / fills.length
                  const profitTarget = parseFloat(strategyConfig.profitTarget || 0) / 100
                  const quantity = fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
                  const spent = fills.reduce((spent, fill) => spent + parseFloat(fill.qty) * parseFloat(fill.price), 0)
                  const stopLoss = parseFloat(strategyConfig.stopLoss || 0) / 100
                  const trade = {
                    chartId,
                    commission,
                    isLong: true,
                    price,
                    quantity,
                    symbol: chart.info.symbol,
                    who
                  }
                  if (profitTarget > 0) {
                    const targetPrice = price + (spent * profitTarget) / quantity
                    trade.targetPrice = targetPrice
                    this.setTarget(trade, advisorId, orderId)
                  }
                  if (stopLoss > 0) {
                    const stopPrice = price - (spent * stopLoss) / quantity
                    trade.stopPrice = stopPrice
                    this.setStop(trade, advisorId, orderId)
                  }
                  advisor.trades[orderId] = trade
                  this.logTrade(trade)
                  this.updateFunds()
                }
              }
            }
            break
          }
          case 'SHORT': {
            if (advisor.canTrade(chartId)) {
              const amount = ((this.funds[chart.info.baseAsset] && this.funds[chart.info.baseAsset].available) || 0) * (advisor.margin / 100)
              if (amount > 0) {
                const { orderId, fills } = await this.placeOrder('SELL', chart.info.symbol, amount)
                if (orderId && fills.length) {
                  this.lastTradedChart = {
                    advisorId,
                    chartId
                  }
                  const commission = Math.round(fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * this.funds[fill.commissionAsset].dollarPrice, 0) * 1000) / 1000
                  const price = fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / fills.length
                  const profitTarget = parseFloat(strategyConfig.profitTarget || 0) / 100
                  const quantity = fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
                  const spent = fills.reduce((spent, fill) => spent + parseFloat(fill.qty) * parseFloat(fill.price), 0)
                  const stopLoss = parseFloat(strategyConfig.stopLoss || 0) / 100
                  const trade = {
                    chartId,
                    commission,
                    isLong: false,
                    price,
                    quantity,
                    symbol: chart.info.symbol,
                    who
                  }
                  if (profitTarget > 0) {
                    const targetPrice = price - (spent * profitTarget) / quantity
                    trade.targetPrice = targetPrice
                    this.setTarget(trade, advisorId, orderId)
                  }
                  if (stopLoss > 0) {
                    const stopPrice = price + (spent * stopLoss) / quantity
                    trade.stopPrice = stopPrice
                    this.setStop(trade, advisorId, orderId)
                  }
                  advisor.trades[orderId] = trade
                  this.logTrade(trade)
                  this.updateFunds()
                }
              }
            }
            break
          }
        }
        this.show(chartId)
      } catch (error) {
        this.logError(new Error(`${who}: ${errorToString(error)}`))
      }
    }
  }

  getDateTime () {
    return chalk[this.screen ? 'black' : 'gray'](format(new Date(), 'DD/MM H:mm:ss'))
  }

  handleKeyPress (key) {
    switch (key) {
      case 'a': {
        const advisorIds = Object.keys(this.advisors)
        if (advisorIds.length > 1) {
          const index = advisorIds.findIndex((advisorId) => advisorId === this.currentAdvisor)
          const nextAdvisor = index + 1 < advisorIds.length ? advisorIds[index + 1] : advisorIds[0]
          this.currentAdvisor = nextAdvisor
          this.currentChart = this.advisors[this.currentAdvisor].chartIds[0]
          this.show(this.currentChart)
        }
        break
      }
      case 'c':
      case 'x': {
        if (this.currentMode === 'c') {
          const chartIds = this.advisors[this.currentAdvisor].chartIds
          const index = this.advisors[this.currentAdvisor].chartIds.findIndex((chartId) => chartId === this.currentChart)
          if (key === 'c') {
            const nextChart = index + 1 < chartIds.length ? chartIds[index + 1] : chartIds[0]
            this.currentChart = nextChart
          } else {
            const prevChart = index - 1 < 0 ? chartIds[chartIds.length - 1] : chartIds[index - 1]
            this.currentChart = prevChart
          }
        }
        this.currentMode = 'c'
        this.show(this.currentChart)
        break
      }
      case 'd': {
        switch (this.currentMode) {
          case 'd1': {
            this.currentMode = 'd2'
            break
          }
          case 'd2': {
            this.currentMode = 'd3'
            break
          }
          default: this.currentMode = 'd1'
        }
        this.show()
        break
      }
      case 'f': {
        if (this.currentMode === 'f') {
          this.updateFunds(true)
        } else {
          this.currentMode = 'f'
          this.show()
        }
        break
      }
      case 'l': {
        if (this.lastTradedChart) {
          const { advisorId, chartId } = this.lastTradedChart
          this.currentAdvisor = advisorId
          this.currentChart = chartId
          this.currentMode = 'c'
          this.show(this.currentChart)
        }
        break
      }
      case 'q': return process.exit()
    }
  }

  async init (config) {
    try {
      if (!(config instanceof Object) || Array.isArray(config)) {
        throw new Error('Bot not properly configured')
      }
      let { provider: providerId = '', advisors: advisorIds = [] } = config
      if (typeof providerId !== 'string' || !providerId.length) {
        throw new Error('Provider not properly configured')
      }
      await this.addProvider(providerId)
      this.timer = timer(1000 * 60 * 30).subscribe(() => this.updateServerInfo())
      if (!Array.isArray(advisorIds)) {
        this.logError(new Error('Advisors not properly configured'))
        advisorIds = []
      }
      await sequential(advisorIds.map((advisorId, index) => () => new Promise(async (resolve, reject) => {
        if (typeof advisorId !== 'string' || !advisorId.length) {
          this.logError(new Error(`Advisor #${index + 1} not properly configured`))
          return resolve()
        }
        try {
          await this.addAdvisor(advisorId)
        } catch (error) {
          this.logError(error)
        }
        return resolve()
      })))
      const advisorIdsLoaded = Object.keys(this.advisors)
      if (!advisorIdsLoaded.length) {
        throw new Error('No advisors running')
      }
      await new Promise((resolve, reject) => {
        this.logInfo('Launching…')
        timer(2000).subscribe(() => resolve())
      })
      clear()
      this.screen = new Screen({
        bindings: {
          a: () => this.handleKeyPress('a'), // Next advisor
          c: () => this.handleKeyPress('c'), // Show chart / next chart
          d: () => this.handleKeyPress('d'), // Show chart data
          f: () => this.handleKeyPress('f'), // Show funds
          l: () => this.handleKeyPress('l'), // Show last traded chart
          q: () => this.handleKeyPress('q'), // Quit
          x: () => this.handleKeyPress('x') // Show chart / previous chart
        },
        getEstimatedValue: () => Object.keys(this.funds).reduce((estimatedValue, asset) => {
          if (this.funds[asset].dollarPrice) {
            return estimatedValue + this.funds[asset].dollarPrice
          }
          return estimatedValue
        }, 0),
        handleResize: () => this.show(this.currentChart),
        title: `${description} v${version}`
      })
      this.logSuccess(`Advisors running:${advisorIdsLoaded.map((advisorId) => ' ' + advisorId)}`)
      this.show()
      interval(1000 * 60).pipe(catchError(error => throwError(error))).subscribe(() => {
        isOnline().then(() => {
          const chartIds = Object.keys(this.charts).filter((chartId) => this.charts[chartId].info)
          chartIds.map((chartId) => {
            const chart = this.charts[chartId]
            try {
              if (chart.candles.length > 1) {
                if (this.charts[chartId].frozen) {
                  throw new Error('Chart frozen')
                }
                const interval = timeframeToMilliseconds(chart.config.timeframe)
                const lastIndex = chart.candles.length - (chart.candles[chart.candles.length - 1].isFinal ? 1 : 2)
                if (Date.now() > chart.candles[lastIndex].closeTime + 1 + interval + (1000 * 10)) {
                  this.charts[chartId].frozen = true
                }
                if (chart.candles.length > 2) {
                  if (chart.candles[lastIndex].time - chart.candles[0].time !== interval * lastIndex) {
                    const missing = []
                    chart.candles.map((candle, index) => {
                      if (chart.candles[index + 1] && chart.candles[index + 1].time - candle.time !== interval) {
                        missing.push(candle.time)
                      }
                    })
                    if (!this.charts[chartId].missing || JSON.stringify(missing) !== JSON.stringify(this.charts[chartId].missing)) {
                      this.charts[chartId].missing = missing
                      throw new Error('Missing data')
                    }
                  } else if (this.charts[chartId].missing) {
                    delete this.charts[chartId].missing
                  }
                }
              }
            } catch (error) {
              this.logWarning(`${errorToString(error)}, resetting ${this.charts[chartId].name}`)
              this.resetChart(chartId)
            }
          })
        })
      })
    } catch (error) {
      if (this.timer) {
        this.timer.unsubscribe()
      }
      this.logError(error)
      process.exit()
    }
  }

  log (string) {
    if (this.screen) {
      this.screen.log(string)
    } else {
      console.log(string)
    }
  }

  logError (error) {
    // console.log(error.stack)
    this.log(`${logSymbols.error} ${this.getDateTime()} ${errorToString(error)}`)
    beep()
  }

  logInfo (string) {
    this.log(`${chalk.white('⦿')} ${this.getDateTime()} ${string}`)
  }

  logStop ({ commission, price, quantity, symbol, who }) {
    const string = `${symbol} ${quantity}${chalk.cyan('@')}${price} (${chalk.yellow(`$${commission}`)}) ${chalk[this.screen ? 'black' : 'gray'](who)}`
    this.log(`${chalk.red('⦿')} ${this.getDateTime()} ${string}`)
    sfx.play('basso')
  }

  logSuccess (string) {
    this.log(`${logSymbols.success} ${this.getDateTime()} ${string}`)
  }

  logTarget ({ commission, price, quantity, symbol, who }) {
    const string = `${symbol} ${quantity}${chalk.cyan('@')}${price} (${chalk.yellow(`$${commission}`)}) ${chalk[this.screen ? 'black' : 'gray'](who)}`
    this.log(`${chalk.green('⦿')} ${this.getDateTime()} ${string}`)
    sfx.play('tink')
  }

  logTrade ({ commission, isLong, price, quantity, stopPrice = 0, symbol, targetPrice = 0, who }) {
    const string = `${symbol} ${quantity}${chalk.cyan('@')}${price} (${chalk.yellow(`$${commission}`)})${targetPrice > 0 ? ' ' + chalk.green(targetPrice) : ''}${stopPrice > 0 ? ' ' + chalk.red(stopPrice) : ''} ${chalk[this.screen ? 'black' : 'gray'](who)}`
    this.log(`${chalk[isLong ? 'green' : 'red'](isLong ? '⇡' : '⇣')} ${this.getDateTime()} ${string}`)
    sfx.play('pop')
  }

  logWarning (string) {
    this.log(`${chalk.yellow('⦿')} ${this.getDateTime()} ${string}`)
  }

  placeOrder (operation, symbol, size) {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      try {
        const info = this.exchangeInfo.symbols.find((info) => info.symbol === symbol && typeof info.status === 'string')
        if (!info) {
          return reject(new Error(`Info for ${symbol} not available`))
        }
        if (info.status !== 'TRADING') {
          return reject(new Error(`${symbol} not trading, current status: ${info.status}`))
        }
        switch (operation) {
          case 'BUY': {
            const order = await this.provider.buy(info, size)
            return resolve(order)
          }
          case 'SELL': {
            const order = await this.provider.sell(info, size)
            return resolve(order)
          }
          default: return reject(new Error(`Operation ${operation} not supported`))
        }
      } catch (error) {
        return reject(error)
      }
    }))
  }

  async resetChart (chartId) {
    try {
      await this.addChart(this.charts[chartId].config)
    } catch (error) {
      this.logWarning(errorToString(error))
    }
  }

  setStop (trade, advisorId, orderId) {
    if (trade.stop) {
      trade.stop.unsubscribe()
    }
    if (trade.stopPrice) {
      const chart = this.charts[trade.chartId]
      trade.stop = chart.stream.pipe(
        filter((candle) => {
          if (trade.isLong) {
            return candle.low <= trade.stopPrice
          } else {
            return candle.high >= trade.stopPrice
          }
        }),
        first(),
        tap(async () => {
          if (trade.target) {
            trade.target.unsubscribe()
          }
          const { fills } = await this.placeOrder(trade.isLong ? 'SELL' : 'BUY', chart.info.symbol, trade.quantity)
          if (fills.length) {
            this.lastTradedChart = {
              advisorId,
              chartId: chart.id
            }
            const commission = Math.round(fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * this.funds[fill.commissionAsset].dollarPrice, 0) * 1000) / 1000
            const price = fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / fills.length
            const quantity = fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
            delete this.advisors[advisorId].trades[orderId]
            this.logStop({ commission, price, quantity, symbol: trade.symbol, who: trade.who })
            this.updateFunds()
          }
        })
      ).subscribe()
    }
  }

  setTarget (trade, advisorId, orderId) {
    if (trade.target) {
      trade.target.unsubscribe()
    }
    if (trade.targetPrice) {
      const chart = this.charts[trade.chartId]
      trade.target = chart.stream.pipe(
        filter((candle) => {
          if (trade.isLong) {
            return candle.high >= trade.targetPrice
          } else {
            return candle.low <= trade.targetPrice
          }
        }),
        first(),
        tap(async () => {
          if (trade.stop) {
            trade.stop.unsubscribe()
          }
          const { fills } = await this.placeOrder(trade.isLong ? 'SELL' : 'BUY', chart.info.symbol, trade.quantity)
          if (fills.length) {
            this.lastTradedChart = {
              advisorId,
              chartId: chart.id
            }
            const commission = Math.round(fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * this.funds[fill.commissionAsset].dollarPrice, 0) * 1000) / 1000
            const price = fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / fills.length
            const quantity = fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
            delete this.advisors[advisorId].trades[orderId]
            this.logTarget({ commission, price, quantity, symbol: trade.symbol, who: trade.who })
            this.updateFunds()
          }
        })
      ).subscribe()
    }
  }

  show (chartId) {
    if (this.screen) {
      if (!this.currentAdvisor) {
        this.currentAdvisor = Object.keys(this.advisors)[0]
        const chartIds = this.advisors[this.currentAdvisor].chartIds
        if (chartIds.length) {
          this.currentChart = chartIds[0]
          chartId = this.currentChart
        }
        if (!this.currentMode) {
          if (this.currentChart) {
            this.currentMode = 'c'
          } else {
            this.currentMode = 'f'
          }
        }
      }
      switch (this.currentMode) {
        case 'c': {
          if (this.currentChart && chartId && this.currentChart === chartId) {
            this.showChart()
          }
          break
        }
        case 'd1': return this.showData(1)
        case 'd2': return this.showData(2)
        case 'd3': return this.showData(3)
        case 'f': {
          if (this.funds && Object.keys(this.funds).length) {
            this.showFunds()
          }
          break
        }
      }
    }
  }

  showChart () {
    this.screen.renderChart(this.charts[this.currentChart], this.advisors[this.currentAdvisor])
  }

  showData (mode) {
    this.screen.renderData(this.charts[this.currentChart], mode)
  }

  showFunds () {
    this.screen.renderFunds(this.funds)
  }

  updateExchangeInfo () {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      try {
        this.exchangeInfo = await this.provider.retrieveExchangeInfo()
        return resolve()
      } catch (error) {
        return reject(error)
      }
    }))
  }

  updateFunds (retrievePrices = false) {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      try {
        this.funds = await this.provider.retrieveFunds(retrievePrices)
        if (this.currentMode === 'f') {
          this.showFunds()
        }
        return resolve()
      } catch (error) {
        return reject(error)
      }
    }))
  }

  async updateServerInfo () {
    try {
      await this.updateExchangeInfo()
      await this.updateFunds(true)
      this.timer = timer(1000 * 60 * 30).subscribe(() => this.updateServerInfo())
    } catch (error) {
      this.logError(new Error(`updateServerInfo(): ${errorToString(error)}`))
      this.timer = timer(1000 * 60).subscribe(() => this.updateServerInfo())
    }
  }
}

module.exports = Bot

const fs = require('fs')
const tulind = require('tulind')

class Advisor {
  constructor (name, chartIds, margin) {
    this.chartIds = chartIds
    this.margin = margin
    this.name = name
    this.trades = {}
  }

  static getConfigCharts (sights) {
    return new Promise(async (resolve, reject) => {
      try {
        const configCharts = sights.reduce((configCharts, sight, index) => {
          if (!(sight instanceof Object) || Array.isArray(sight)) {
            return reject(new Error(`Sight #${index + 1} not properly configured`))
          }
          if (!sight.symbol || typeof sight.symbol !== 'string' || !sight.symbol.length) {
            return reject(new Error(`Sight #${index + 1}: Symbol not properly configured`))
          }
          if (!sight.timeframe || typeof sight.timeframe !== 'string' || !sight.timeframe.length) {
            return reject(new Error(`Sight #${index + 1}: Timeframe not properly configured`))
          }
          const indicators = {}
          const { strategies = {} } = sight
          if (!(strategies instanceof Object) || Array.isArray(strategies)) {
            return reject(new Error(`Sight #${index + 1}: Strategies not properly configured`))
          }
          Object.keys(strategies).map((strategyId) => {
            if (typeof strategyId !== 'string' || !strategyId.length) {
              return reject(new Error(`Sight #${index + 1}: Strategy not properly configured`))
            }
            const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
            const profitTarget = parseFloat(strategies[strategyId].profitTarget || 0)
            const stopLoss = parseFloat(strategies[strategyId].stopLoss || 0)
            if (!(profitTarget > 0) || (!(stopLoss > 0) || stopLoss > 100)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} not properly configured`))
            }
            if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} doesn't exist`))
            }
            const Strategy = require(`./strategies/${strategyId}`)
            const configStrategy = Strategy.getConfig()
            const configIndicators = configStrategy.indicators || {}
            Object.keys(configIndicators).map((indicatorId) => {
              if (indicators[indicatorId]) {
                return reject(new Error(`Sight #${index + 1}: Parallel strategies sharing indicator ID`))
              }
              const configIndicator = configIndicators[indicatorId]
              const { type = '' } = configIndicator
              if (typeof type !== 'string' || !type.length) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} not properly configured`))
              }
              if (!tulind.indicators[type.toLowerCase()]) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} not properly configured`))
              }
              indicators[indicatorId] = configIndicator
            })
          })
          if (Object.keys(indicators).length) {
            configCharts.push({
              ...sight,
              indicators
            })
          } else {
            configCharts.push(sight)
          }
          return configCharts
        }, [])
        return resolve(configCharts)
      } catch (error) {
        return reject(error)
      }
    })
  }

  analyze (candles, strategies) {
    return Object.keys(strategies).map((strategyId) => new Promise(async (resolve, reject) => {
      try {
        const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
        if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
          return reject(new Error(`Strategy ${strategyName} doesn't exist`))
        }
        delete require.cache[require.resolve(`./strategies/${strategyId}`)]
        const Strategy = require(`./strategies/${strategyId}`)
        const signal = await Strategy.analyze(candles)
        if (typeof signal === 'string' && signal.length) {
          return resolve({
            signal,
            strategyConfig: strategies[strategyId],
            strategyName: strategyName
          })
        }
        return resolve()
      } catch (error) {
        return reject(error)
      }
    }))
  }

  canTrade (chartId) {
    const orderIds = Object.keys(this.trades)
    return !orderIds.filter((orderId) => this.trades[orderId].chartId === chartId).length
  }
}

module.exports = Advisor

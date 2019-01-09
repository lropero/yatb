const fs = require('fs')
const tulind = require('tulind')

const { errorToString } = require('../helpers')

class Advisor {
  constructor (name, chartIds, margin) {
    this.name = name
    this.chartIds = chartIds
    this.margin = margin / 100
  }

  static getChartConfigs (sights) {
    return new Promise((resolve, reject) => {
      try {
        const chartConfigs = sights.reduce((chartConfigs, sight, index) => {
          if (!(sight instanceof Object) || Array.isArray(sight)) {
            return reject(new Error(`Sight #${index + 1} not properly configured`))
          }
          if (!sight.symbol || typeof sight.symbol !== 'string' || !sight.symbol.length) {
            return reject(new Error(`Sight #${index + 1}: Symbol not properly configured`))
          }
          if (!sight.timeframe || typeof sight.timeframe !== 'string' || !sight.timeframe.length) {
            return reject(new Error(`Sight #${index + 1}: Timeframe not properly configured`))
          }
          const { strategies = {} } = sight
          if (!(strategies instanceof Object) || Array.isArray(strategies)) {
            return reject(new Error(`Sight #${index + 1}: Strategies not properly configured`))
          }
          const indicatorsCurated = {}
          Object.keys(strategies).map((strategyId, jndex) => {
            if (typeof strategyId !== 'string' || !strategyId.length) {
              return reject(new Error(`Sight #${index + 1}: Strategy #${jndex + 1} not properly configured`))
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
            const Strategy = require(`../strategies/${strategyId}`)
            const strategyConfig = Strategy.getConfig()
            const { indicators = {} } = strategyConfig
            if (!(indicators instanceof Object) || Array.isArray(indicators)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicators not properly configured`))
            }
            Object.keys(indicators).map((indicatorId, kndex) => {
              if (typeof indicatorId !== 'string' || !indicatorId.length) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator #${kndex + 1} not properly configured`))
              }
              const indicatorName = indicatorId.charAt(0).toUpperCase() + indicatorId.slice(1).toLowerCase()
              if (indicatorsCurated[indicatorId]) {
                return reject(new Error(`Sight #${index + 1}: Parallel strategies sharing indicator ID`))
              }
              const { type = '' } = indicators[indicatorId]
              if (typeof type !== 'string' || !type.length) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} not properly configured`))
              }
              if (!tulind.indicators[type.toLowerCase()]) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} doesn't exist`))
              }
              indicatorsCurated[indicatorId] = indicators[indicatorId]
            })
          })
          if (Object.keys(indicatorsCurated).length) {
            chartConfigs.push({
              ...sight,
              indicators: indicatorsCurated
            })
          } else {
            chartConfigs.push(sight)
          }
          return chartConfigs
        }, [])
        return resolve(chartConfigs)
      } catch (error) {
        return reject(error)
      }
    })
  }

  analyze (candles, strategies, isFinal) {
    return Object.keys(strategies).map((strategyId) => new Promise(async (resolve, reject) => {
      const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
      try {
        if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
          return reject(new Error(`Strategy ${strategyName} doesn't exist`))
        }
        delete require.cache[require.resolve(`../strategies/${strategyId}`)]
        const Strategy = require(`../strategies/${strategyId}`)
        const signals = await Strategy.analyze(candles, isFinal)
        if (signals.length) {
          signals.sort()
          return resolve({
            signals,
            strategy: {
              config: strategies[strategyId],
              name: strategyName
            }
          })
        }
        return resolve()
      } catch (error) {
        error.message = `Strategy ${strategyName}: ${errorToString(error)}`
        return reject(error)
      }
    }))
  }
}

module.exports = Advisor

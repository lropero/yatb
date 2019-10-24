const fs = require('fs')
const tulind = require('tulind')

const { errorToString } = require('../helpers')

class Advisor {
  constructor (name, chartIds) {
    this.name = name
    this.chartIds = chartIds
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
          const indicators = {}
          Object.keys(strategies).map((strategyId, jndex) => {
            if (typeof strategyId !== 'string' || !strategyId.length) {
              return reject(new Error(`Sight #${index + 1}: Strategy #${jndex + 1} not properly configured`))
            }
            const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
            const strategyConfig = strategies[strategyId]
            const margin = parseFloat(strategyConfig.margin || 0)
            const profitTarget = parseFloat(strategyConfig.profitTarget || 0)
            const stopLoss = parseFloat(strategyConfig.stopLoss || 0)
            if ((!(margin > 0) || margin > 100) || !(profitTarget > 0) || (!(stopLoss > 0) || stopLoss > 100)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} not properly configured`))
            }
            if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} doesn't exist`))
            }
            const Strategy = require(`../strategies/${strategyId}`)
            const configIndicators = typeof Strategy.getConfigIndicators === 'function' ? Strategy.getConfigIndicators(strategyConfig.paramsIndicators || []) : {}
            if (!(configIndicators instanceof Object) || Array.isArray(configIndicators)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicators not properly configured`))
            }
            Object.keys(configIndicators).map((indicatorId, kndex) => {
              if (typeof indicatorId !== 'string' || !indicatorId.length) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator #${kndex + 1} not properly configured`))
              }
              const indicatorName = indicatorId.charAt(0).toUpperCase() + indicatorId.slice(1).toLowerCase()
              if (indicators[indicatorId]) {
                return reject(new Error(`Sight #${index + 1}: Parallel strategies sharing indicator ID`))
              }
              const { type = '' } = configIndicators[indicatorId]
              if (typeof type !== 'string' || !type.length) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} not properly configured`))
              }
              if (!tulind.indicators[type.toLowerCase()]) {
                return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} doesn't exist`))
              }
              indicators[indicatorId] = configIndicators[indicatorId]
            })
          })
          if (Object.keys(indicators).length) {
            chartConfigs.push({
              ...sight,
              indicators
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
    return Object.keys(strategies).map((strategyId) => new Promise((resolve, reject) => {
      const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
      const strategyConfig = strategies[strategyId]
      try {
        if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
          return reject(new Error(`Strategy ${strategyName} doesn't exist`))
        }
        const Strategy = require(`../strategies/${strategyId}`)
        const signals = Strategy.analyze(candles, isFinal, strategyConfig.params || [])
        if (signals.length) {
          signals.sort()
          return resolve({
            signals: signals.filter((value, index, self) => self.indexOf(value) === index),
            strategy: {
              config: strategyConfig,
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

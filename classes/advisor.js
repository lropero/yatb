const fs = require('fs')
const tulind = require('tulind')

const { errorToString } = require('../helpers')

class Advisor {
  constructor (name, chartIds) {
    this.name = name
    this.chartIds = chartIds
  }

  static getChartConfigs (advisorConfig) {
    return new Promise((resolve, reject) => {
      try {
        const chartConfigs = advisorConfig.reduce((chartConfigs, sight, index) => {
          if (!(sight instanceof Object) || Array.isArray(sight)) {
            return reject(new Error(`Sight #${index + 1} not configured properly`))
          }
          if (!sight.symbol || typeof sight.symbol !== 'string' || !sight.symbol.length) {
            return reject(new Error(`Sight #${index + 1}: Symbol not configured properly`))
          }
          if (!sight.timeframe || typeof sight.timeframe !== 'string' || !sight.timeframe.length) {
            return reject(new Error(`Sight #${index + 1}: Timeframe not configured properly`))
          }
          const { strategies = {} } = sight
          if (!(strategies instanceof Object) || Array.isArray(strategies)) {
            return reject(new Error(`Sight #${index + 1}: Strategies not configured properly`))
          }
          const indicators = {}
          Object.keys(strategies).map((strategyId, jndex) => {
            if (typeof strategyId !== 'string' || !strategyId.length) {
              return reject(new Error(`Sight #${index + 1}: Strategy #${jndex + 1} not configured properly`))
            }
            const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
            const strategyConfig = strategies[strategyId]
            const profitTarget = parseFloat(strategyConfig.trade.profitTarget || 0)
            const risk = parseFloat(strategyConfig.trade.risk || 0)
            const stopLoss = parseFloat(strategyConfig.trade.stopLoss || 0)
            if (!(risk > 0) || risk > 100 || !(profitTarget > 0) || !(stopLoss > 0) || stopLoss > 100) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} not configured properly`))
            }
            if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
              return reject(new Error(`Sight #${index + 1}: Strategy ${strategyName} doesn't exist`))
            }
            const Strategy = require(`../strategies/${strategyId}`)
            const paramsIndicators =
              typeof Strategy.getParamsIndicators === 'function'
                ? Strategy.getParamsIndicators((strategyConfig.params && strategyConfig.params.indicators) || {})
                : {}
            if (!(paramsIndicators instanceof Object) || Array.isArray(paramsIndicators)) {
              return reject(
                new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicators not configured properly`)
              )
            }
            Object.keys(paramsIndicators).map((indicatorId, kndex) => {
              if (typeof indicatorId !== 'string' || !indicatorId.length) {
                return reject(
                  new Error(
                    `Sight #${index + 1}: Strategy ${strategyName}: Indicator #${kndex + 1} not configured properly`
                  )
                )
              }
              const indicatorName = indicatorId.charAt(0).toUpperCase() + indicatorId.slice(1).toLowerCase()
              if (indicators[indicatorId]) {
                return reject(new Error(`Sight #${index + 1}: Parallel strategies sharing indicator ID`))
              }
              const { type = '' } = paramsIndicators[indicatorId]
              if (typeof type !== 'string' || !type.length) {
                return reject(
                  new Error(
                    `Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} not configured properly`
                  )
                )
              }
              if (!tulind.indicators[type.toLowerCase()]) {
                return reject(
                  new Error(`Sight #${index + 1}: Strategy ${strategyName}: Indicator ${indicatorName} doesn't exist`)
                )
              }
              indicators[indicatorId] = paramsIndicators[indicatorId]
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

  analyze (candles, strategies, isFinal, who) {
    return Object.keys(strategies).map(
      strategyId =>
        // eslint-disable-next-line no-async-promise-executor
        new Promise(async (resolve, reject) => {
          const strategyName = strategyId.charAt(0).toUpperCase() + strategyId.slice(1).toLowerCase()
          const strategyConfig = strategies[strategyId]
          try {
            if (!fs.existsSync(`./strategies/${strategyId}/index.js`)) {
              return reject(new Error(`Strategy ${strategyName} doesn't exist`))
            }
            const Strategy = require(`../strategies/${strategyId}`)
            const signals = await Strategy.analyze(candles, isFinal, strategyConfig.params || [])
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
            error.message = `Strategy ${who}→${strategyName}: ${errorToString(error)}`
            return reject(error)
          }
        })
    )
  }
}

module.exports = Advisor

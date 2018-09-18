const hash = require('object-hash')
const tulind = require('tulind')

const server = require('./server')
const { errorToString, logError, logSuccess, logWarning } = require('./helpers')

class Bot {
  constructor (serverPort, provider, advisors) {
    this.provider = {}
    this.funds = {}
    this.charts = {}
    this.advisors = []

    this.init(serverPort, provider, advisors)
  }

  addAdvisors (advisors) {
    const promises = advisors.map((advisor) => new Promise(async (resolve, reject) => {
      let Advisor
      try {
        Advisor = require(`./advisors/${advisor}`)
      } catch (error) {
        return reject(error)
      }

      if (Advisor) {
        const advisorName = advisor.charAt(0).toUpperCase() + advisor.substr(1)
        try {
          const instance = await Advisor.init(advisorName, this)
          this.advisors.push(instance)
          logSuccess(`Advisor ${advisorName} running`)
          return resolve()
        } catch (error) {
          return reject(new Error(`Advisor ${advisorName}: ${errorToString(error)}`))
        }
      }
    }))

    return promises.map(promise => promise.catch ? promise.catch((error) => logError(errorToString(error))) : promise)
  }

  async addCandle (candle, chartId) {
    this.charts[chartId].candles.unshift(candle)
    while (this.charts[chartId].candles.length > this.charts[chartId].config.periods) {
      this.charts[chartId].candles.pop()
    }
    this.charts[chartId].indicators = await this.calculateIndicators(this.charts[chartId].candles, this.charts[chartId].config.indicators)
    this.advisors.map((advisor) => advisor.analyze(chartId))
  }

  addProvider (provider) {
    return new Promise(async (resolve, reject) => {
      const providers = Object.keys(provider)
      if (!providers.length) {
        return reject(new Error('No provider configured'))
      } else if (providers.length > 1) {
        logWarning('More than one provider is configured, using the first one')
      }

      let Provider
      try {
        Provider = require(`./providers/${providers[0]}`)
      } catch (error) {
        return reject(error)
      }

      if (Provider) {
        try {
          const providerName = providers[0].charAt(0).toUpperCase() + providers[0].substr(1)
          const { funds, instance } = await Provider.init(providerName, provider[providers[0]], this)
          this.funds = funds
          this.provider = instance
          logSuccess(`Provider ${providerName} connected`)
          return resolve()
        } catch (error) {
          return reject(error)
        }
      }
    })
  }

  calculateIndicators (candles, configIndicators) {
    return new Promise((resolve, reject) => {
      const allowedInputs = Object.keys(candles[0])
      const indicators = {}
      const reversedCandles = candles.slice().reverse()

      configIndicators.map(({ name = '', type = '', inputs = {}, options = {} }) => {
        if (indicators[name]) {
          return reject(new Error(`Indicator names must be unique, ${name} already exists`))
        }

        const indicator = tulind.indicators[type]
        if (!indicator) {
          return reject(new Error(`Indicator ${type} doesn't exists`))
        }

        const indicatorInputs = []
        indicator.input_names.map((inputName) => {
          if (!allowedInputs.includes(inputName) && !allowedInputs.includes(inputs[inputName])) {
            return reject(new Error(!Object.keys(inputs).includes(inputName)
              ? `Missing input '${inputName}' for indicator ${name}`
              : `Allowed values for input ${name}->${inputName}: ${allowedInputs.join(', ')}`
            ))
          }
          const input = allowedInputs.includes(inputName) ? inputName : inputs[inputName]
          indicatorInputs.push(reversedCandles.map((candle) => candle[input]))
        })

        const indicatorOptions = []
        indicator.option_names.map((optionName) => {
          if (!Object.keys(options).includes(optionName)) {
            return reject(new Error(`Missing option '${optionName}' for indicator ${name}`))
          }
          indicatorOptions.push(options[optionName])
        })

        indicator.indicator(indicatorInputs, indicatorOptions, (error, results) => {
          if (error) {
            return reject(new Error(`Indicator ${name}: ${errorToString(error)}`))
          }
          indicators[name] = {}
          indicator.output_names.map((outputName, index) => {
            indicators[name][outputName] = results[index].reverse()
          })
        })
      })

      return resolve(indicators)
    })
  }

  getFunds () {
    return this.funds
  }

  async init (serverPort, provider, advisors) {
    try {
      await this.startServer(serverPort)
    } catch (error) {
      logError(`${errorToString(error)}`, true)
    }

    try {
      await this.addProvider(provider)
    } catch (error) {
      logError(`${errorToString(error)}`, true)
    }

    try {
      await Promise.all(this.addAdvisors(advisors))
      if (!this.advisors.length) {
        throw new Error('No advisors running')
      }
    } catch (error) {
      logError(`${errorToString(error)}`, true)
    }
  }

  requestCharts (configCharts) {
    return new Promise(async (resolve, reject) => {
      const charts = await Promise.all(configCharts.map(({ symbol = '', timeframe = '', periods = 0, indicators = {} }, index) => new Promise(async (resolve, reject) => {
        const chartId = hash(configCharts[index])
        if (this.charts[chartId]) {
          return resolve(this.charts[chartId])
        }

        try {
          const chart = await this.provider.retrieveChart(symbol, timeframe, periods)
          chart.chartId = chartId
          chart.config = configCharts[index]
          chart.indicators = await this.calculateIndicators(chart.candles, indicators)
          return resolve(chart)
        } catch (error) {
          return reject(new Error(`Chart #${index + 1}: ${errorToString(error)}`))
        }
      })))

      let configLength = configCharts.length
      const curatedCharts = charts.filter((chart) => chart).reduce((obj, chart) => {
        const { chartId, ...rest } = chart
        if (!obj[chartId]) {
          obj[chartId] = rest
        } else configLength--
        return obj
      }, {})

      const chartIds = Object.keys(curatedCharts)
      if (chartIds.length !== configLength) {
        return reject(new Error('Charts not loaded properly'))
      }

      chartIds.map(async (chartId) => {
        this.charts[chartId] = curatedCharts[chartId]
        const { symbol, timeframe } = this.charts[chartId].config
        await this.provider.openStream(symbol, timeframe, (candle) => this.addCandle(candle, chartId))
      })

      return resolve(chartIds)
    })
  }

  startServer (serverPort) {
    return new Promise(async (resolve, reject) => {
      try {
        await server(serverPort, this)
        logSuccess(`Server listening on port ${serverPort}`)
        return resolve()
      } catch (error) {
        return reject(error)
      }
    })
  }
}

module.exports = Bot

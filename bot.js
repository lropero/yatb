const tulind = require('tulind')

const server = require('./server')
const { errorToString, logError, logSuccess, logWarning } = require('./helpers')

class Bot {
  constructor (serverPort, provider, advisors) {
    this.advisors = {}
    this.funds = {}
    this.provider = {}

    this.startServer(serverPort)
      .then(async () => {
        try {
          await this.addProvider(provider)
        } catch (error) {
          logError(`${errorToString(error)}; exiting`)
          return process.exit()
        }

        try {
          await Promise.all(this.addAdvisors(advisors))
          if (!Object.keys(this.advisors).length) {
            throw new Error('No advisors running')
          }
        } catch (error) {
          logError(`${errorToString(error)}; exiting`)
          return process.exit()
        }
      })
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
          this.advisors[advisor] = instance
          logSuccess(`Advisor ${advisorName} running`)
          return resolve()
        } catch (error) {
          return reject(new Error(`Advisor ${advisorName}: ${errorToString(error)}`))
        }
      }
    }))

    return promises.map(promise => promise.catch ? promise.catch((error) => logError(errorToString(error))) : promise)
  }

  addProvider (provider) {
    return new Promise(async (resolve, reject) => {
      const providerKeys = Object.keys(provider)
      if (!providerKeys.length) {
        return reject(new Error('No provider configured'))
      } else if (providerKeys.length > 1) {
        logWarning('More than one provider is configured, using the first one')
      }

      let Provider
      try {
        Provider = require(`./providers/${providerKeys[0]}`)
      } catch (error) {
        return reject(error)
      }

      if (Provider) {
        try {
          const providerName = providerKeys[0].charAt(0).toUpperCase() + providerKeys[0].substr(1)
          const { funds, instance } = await Provider.init(providerName, provider[providerKeys[0]], this)
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
          indicator.output_names.forEach((outputName, index) => {
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

  requestCharts (configCharts) {
    const promises = configCharts.map(({ symbol = '', timeframe = '', periods = 0, indicators = {} }, index) => new Promise(async (resolve, reject) => {
      try {
        const chart = await this.provider.retrieveChart(symbol, timeframe, periods)
        chart.indicators = await this.calculateIndicators(chart.candles, indicators)
        resolve(chart)
      } catch (error) {
        return reject(new Error(`Chart #${index + 1}: ${errorToString(error)}`))
      }
    }))

    return promises.map(promise => promise.catch ? promise.catch((error) => logError(`${errorToString(error)}`)) : promise)
  }

  startServer (serverPort) {
    return new Promise(async (resolve) => {
      try {
        await server(serverPort, this)
        logSuccess(`Server listening on port ${serverPort}`)
        return resolve()
      } catch (error) {
        logError(`${errorToString(error)}; exiting`)
        return process.exit()
      }
    })
  }
}

module.exports = Bot

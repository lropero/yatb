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

  getFunds () {
    return this.funds
  }

  requestCharts (configCharts) {
    const promises = configCharts.map((configChart) => new Promise(async (resolve, reject) => {
      try {
        const chart = await this.provider.retrieveChart(configChart)
        resolve(chart)
      } catch (error) {
        return reject(new Error(`Chart ${configChart.symbol}: ${errorToString(error)}`))
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

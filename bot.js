const server = require('./server')
const { logError, logSuccess, logWarning } = require('./helpers')

class Bot {
  constructor (serverPort, providers, advisors) {
    this.advisors = {}
    this.funds = {}
    this.providers = {}

    server(serverPort, this)
      .then(() => {
        logSuccess(`Server listening on port ${serverPort}`)
        const promises = this.addProviders(providers).map(promise => promise.catch ? promise.catch((error) => logWarning(error.toString())) : promise)
        Promise.all(promises)
          .then(() => {
            if (!Object.keys(this.providers).length) {
              logError('No providers connected, exiting')
              return process.exit()
            }
            this.addAdvisors(advisors)
            if (!Object.keys(this.advisors).length) {
              logError('No advisors running, exiting')
              return process.exit()
            }
          })
      })
      .catch((error) => {
        logError(`Server FATAL: ${error.toString()}`)
        return process.exit()
      })
  }

  addAdvisors (advisors) {
    advisors.forEach((advisorName) => {
      let Advisor

      try {
        Advisor = require(`./advisors/${advisorName}`)
      } catch (error) {
        return logWarning(`Advisor ${advisorName}: ${error.toString()}`)
      }

      if (Advisor) {
        this.advisors[advisorName] = new Advisor(this)
        logSuccess(`Advisor ${advisorName} running`)
      }
    })
  }

  addProviders (providers) {
    const providerNames = Object.keys(providers)
    return providerNames.map((providerName) => new Promise((resolve, reject) => {
      let Provider

      try {
        Provider = require(`./providers/${providerName}`)
      } catch (error) {
        return reject(new Error(`Provider ${providerName}: ${error.toString()}`))
      }

      if (Provider) {
        const providerConfig = providers[providerName]
        Provider.init(providerName, providerConfig, this)
          .then(({ funds, provider }) => {
            this.funds[providerName] = funds
            this.providers[providerName] = provider
            logSuccess(`Provider ${providerName} connected`)
            return resolve()
          })
          .catch((error) => reject(new Error(`Provider ${providerName}: ${error.toString()}`)))
      }
    }))
  }

  getFunds () {
    return this.funds
  }
}

module.exports = Bot

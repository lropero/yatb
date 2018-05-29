const server = require('./server')
const { logError } = require('./helpers')

class Bot {
  constructor () {
    this.funds = {}
    this.providers = {}

    server(this)
  }

  addProvider (providerName, providerConfig) {
    let Provider

    try {
      Provider = require(`./providers/${providerName}`)
    } catch (error) {
      return logError(`${error.toString()}, skipping provider ${providerName}`)
    }

    if (Provider) {
      this.providers[providerName] = new Provider(providerName, providerConfig, this)
    }
  }

  getFunds () {
    return this.funds
  }

  setFunds (providerName, funds) {
    this.funds[providerName] = funds
  }
}

module.exports = Bot

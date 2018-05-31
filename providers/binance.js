const binance = require('node-binance-api')

const { logError, logSuccess } = require('../helpers')

class Provider {
  constructor (providerName, providerConfig, bot) {
    this.bot = bot
    this.name = providerName

    binance.options({
      APIKEY: providerConfig.keys.api,
      APISECRET: providerConfig.keys.secret,
      test: true,
      useServerTime: true
    })

    this.retrieveFunds()
  }

  retrieveFunds () {
    binance.balance((error, balances) => {
      if (error) {
        return logError(`Provider ${this.name}: ${error.statusMessage || error.toString()}`)
      }

      logSuccess(`Provider ${this.name} connected`)

      const funds = Object.keys(balances)
        .filter((key) => parseFloat(balances[key].available) > 0)
        .reduce((obj, key) => {
          obj[key] = balances[key]
          return obj
        }, {})

      this.bot.setFunds(this.name, funds)
    })
  }
}

module.exports = Provider

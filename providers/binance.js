const binance = require('node-binance-api')

const { logError } = require('../helpers')

class Binance {
  constructor (providerName, providerConfig, bot) {
    this.bot = bot
    this.name = providerName

    binance.options({
      APIKEY: providerConfig.keys.api,
      APISECRET: providerConfig.keys.secret,
      test: true,
      useServerTime: true
    })

    this.getFunds()
  }

  getFunds () {
    binance.balance((error, balances) => {
      if (error) {
        return logError(`Function binance.balance(): ${error.statusMessage || error.toString()}`)
      }

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

module.exports = Binance

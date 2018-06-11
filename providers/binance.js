const Binance = require('node-binance-api')

class Provider {
  constructor (api, bot) {
    this.api = api
    this.bot = bot
  }

  static init (name, config, bot) {
    return new Promise((resolve, reject) => {
      if (typeof config !== 'object' || !Object.keys(config).length) {
        return reject(new Error(`Provider ${name} requires config object`))
      }

      const api = new Binance().options({
        APIKEY: (config.keys && config.keys.api) || '',
        APISECRET: (config.keys && config.keys.secret) || '',
        log: () => {},
        test: true,
        useServerTime: true
      })

      this.retrieveFunds(api)
        .then((funds) => resolve({
          funds,
          provider: new Provider(api, bot)
        }))
        .catch((error) => reject(error))
    })
  }

  static retrieveFunds (api) {
    return new Promise((resolve, reject) => {
      api.balance((error, balances) => {
        if (error) {
          return reject(new Error(error.statusMessage))
        }

        const funds = Object.keys(balances)
          .filter((key) => parseFloat(balances[key].available) > 0)
          .reduce((obj, key) => {
            obj[key] = balances[key]
            return obj
          }, {})

        return resolve(funds)
      })
    })
  }
}

module.exports = Provider

const Binance = require('node-binance-api')

const { errorToString } = require('../helpers')

class Provider {
  constructor (name, api, bot) {
    this.name = name
    this.api = api
    this.bot = bot
  }

  static init (name, config, bot) {
    return new Promise(async (resolve, reject) => {
      try {
        if (typeof config !== 'object' || !Object.keys(config).length) {
          throw new Error(`Provider ${name} requires config object`)
        }

        const api = new Binance().options({
          APIKEY: (config.keys && config.keys.api) || '',
          APISECRET: (config.keys && config.keys.secret) || '',
          log: () => {},
          test: true,
          useServerTime: true
        })

        const funds = await this.retrieveFunds(api)
        return resolve({
          funds,
          instance: new Provider(name, api, bot)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  static retrieveFunds (api) {
    return new Promise((resolve, reject) => {
      try {
        api.balance((error, balances) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }

          const funds = Object.keys(balances)
            .filter((key) => parseFloat(balances[key].available) > 0)
            .reduce((obj, key) => {
              obj[key] = balances[key]
              return obj
            }, {})

          return resolve(funds)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  retrieveChart (symbol, timeframe, periods) {
    return new Promise((resolve, reject) => {
      try {
        this.api.candlesticks(symbol, timeframe, (error, ticks) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }

          const candles = ticks.map((tick) => ({
            time: tick[0],
            open: parseFloat(tick[1]),
            high: parseFloat(tick[2]),
            low: parseFloat(tick[3]),
            close: parseFloat(tick[4]),
            volume: parseFloat(tick[5]),
            trades: tick[8],
            volumePerTrade: tick[5] / tick[8]
          })).slice(0, periods)

          const chart = {
            candles: candles.length ? candles.reverse() : [],
            indicators: {}
          }

          return resolve(chart)
        }, { limit: periods + 1 })
      } catch (error) {
        return reject(error)
      }
    })
  }
}

module.exports = Provider

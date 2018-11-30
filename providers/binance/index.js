const Binance = require('node-binance-api')
const { catchError, map, mergeMap, reduce, share, take } = require('rxjs/operators')
const { from, Observable, throwError } = require('rxjs')

const configProvider = require('./config')
const { calculateFunds, errorToString, withIndicators } = require('../../helpers')

class Provider {
  constructor () {
    this.api = new Binance().options({
      APIKEY: (configProvider.keys && configProvider.keys.api) || '',
      APISECRET: (configProvider.keys && configProvider.keys.secret) || '',
      log: () => {},
      reconnect: false,
      useServerTime: true
    })
  }

  buy (info, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const quantity = await this.clampQuantity(amount, info, true)
        if (!(quantity > 0)) {
          return reject(new Error('Can\'t buy zero'))
        }
        this.api.marketBuy(info.symbol, quantity, (error, response) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(response)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  clampQuantity (amount, info, isBuying = false) {
    return new Promise(async (resolve, reject) => {
      try {
        let quantity = amount
        if (isBuying) {
          const quote = await this.getQuote(info.symbol)
          const { minNotional } = info.filters.find((filter) => filter.filterType === 'MIN_NOTIONAL')
          const { minQty } = info.filters.find((filter) => filter.filterType === 'LOT_SIZE')
          quantity /= quote
          if (quantity < minQty) {
            quantity = minQty
          }
          if (quantity * quote < minNotional) {
            quantity = minNotional / quote
          }
        }
        const { stepSize } = info.filters.find((filter) => filter.filterType === 'LOT_SIZE')
        quantity = this.api.roundStep(quantity, stepSize)
        return resolve(quantity)
      } catch (error) {
        return reject(error)
      }
    })
  }

  getQuote (symbol) {
    return new Promise((resolve, reject) => {
      try {
        this.api.prices(symbol, (error, ticker) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(parseFloat(ticker[symbol]))
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  retrieveChart (configChart, exchangeInfo) {
    return new Promise((resolve, reject) => {
      try {
        const info = exchangeInfo.symbols.find((info) => info.symbol === configChart.symbol && typeof info.status === 'string')
        if (!info) {
          return reject(new Error(`Info not available`))
        }
        if (info.status !== 'TRADING') {
          return reject(new Error(`${configChart.symbol} not trading, current status: ${info.status}`))
        }
        const PERIODS = 500
        this.api.candlesticks(configChart.symbol, configChart.timeframe, (error, candlesticks) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          const previous = from(candlesticks).pipe(
            take(PERIODS),
            map((candlestick) => {
              const [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume] = candlestick
              return {
                time,
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume),
                closeTime,
                assetVolume: parseFloat(assetVolume),
                trades,
                buyBaseVolume: parseFloat(buyBaseVolume),
                buyAssetVolume: parseFloat(buyAssetVolume),
                volumePerTrade: volume / trades,
                isFinal: true
              }
            }),
            reduce((acc, curr) => {
              acc.push(curr)
              return acc
            }, []),
            mergeMap((candles) => withIndicators(candles, configChart.indicators || {})),
            catchError(error => throwError(error))
          )
          const stream = Observable.create((observer) => {
            const endpoint = this.api.websockets.candlesticks(configChart.symbol, configChart.timeframe, (tick) => {
              const { k: candle } = tick
              observer.next({
                time: candle.t,
                open: parseFloat(candle.o),
                high: parseFloat(candle.h),
                low: parseFloat(candle.l),
                close: parseFloat(candle.c),
                volume: parseFloat(candle.v),
                closeTime: candle.T,
                assetVolume: parseFloat(candle.q),
                trades: candle.n,
                buyBaseVolume: parseFloat(candle.V),
                buyAssetVolume: parseFloat(candle.Q),
                volumePerTrade: candle.v / candle.n,
                isFinal: candle.x
              })
            })
            return this.api.websockets.terminate(endpoint)
          }).pipe(share())
          return resolve({ info, previous, stream })
        }, { limit: PERIODS + 1 })
      } catch (error) {
        return reject(error)
      }
    })
  }

  retrieveExchangeInfo () {
    return new Promise((resolve, reject) => {
      try {
        this.api.exchangeInfo((error, exchangeInfo) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(exchangeInfo)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  retrieveFunds (retrievePrices) {
    return new Promise(async (resolve, reject) => {
      try {
        if (retrievePrices) {
          this.prices = await this.retrievePrices()
        }
        this.api.balance((error, balances) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          const funds = calculateFunds(balances, this.prices)
          return resolve(funds)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  retrievePrices () {
    return new Promise((resolve, reject) => {
      try {
        this.api.prices((error, prices) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(prices)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  sell (info, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const quantity = await this.clampQuantity(amount, info)
        if (!(quantity > 0)) {
          return reject(new Error('Can\'t sell zero'))
        }
        this.api.marketSell(info.symbol, quantity, (error, response) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(response)
        })
      } catch (error) {
        return reject(error)
      }
    })
  }
}

module.exports = Provider

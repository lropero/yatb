const Binance = require('node-binance-api')
const Bottleneck = require('bottleneck')
const { catchError, concat, map, reduce, share, take } = require('rxjs/operators')
const { from, Observable, throwError } = require('rxjs')

const config = require('./config')
const { errorToString } = require('../../helpers')

class Provider {
  constructor () {
    this.api = new Binance().options({
      APIKEY: (config.keys && config.keys.api) || '',
      APISECRET: (config.keys && config.keys.secret) || '',
      log: () => {},
      reconnect: false,
      useServerTime: true
    })
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 300
    })
  }

  buy (quantity, info) {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      try {
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
    }))
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
    return this.limiter.schedule(() => new Promise((resolve, reject) => {
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
    }))
  }

  retrieveBalance () {
    return this.limiter.schedule(() => new Promise((resolve, reject) => {
      try {
        this.api.balance((error, balance) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          return resolve(balance)
        })
      } catch (error) {
        return reject(error)
      }
    }))
  }

  retrieveExchangeInfo () {
    return this.limiter.schedule(() => new Promise((resolve, reject) => {
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
    }))
  }

  retrievePrices () {
    return this.limiter.schedule(() => new Promise((resolve, reject) => {
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
    }))
  }

  retrieveStream (chartConfig) {
    const PERIODS = 500
    return this.limiter.schedule(() => new Promise((resolve, reject) => {
      try {
        this.api.candlesticks(chartConfig.symbol, chartConfig.timeframe, (error, candlesticks) => {
          if (error) {
            return reject(new Error(`${error.statusMessage || errorToString(error)}`))
          }
          const stream = from(candlesticks).pipe(
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
                volumePerTrade: trades ? volume / trades : 0,
                isFinal: true
              }
            }),
            reduce((acc, curr) => {
              acc.push(curr)
              return acc
            }, []),
            concat(Observable.create((observer) => {
              const endpoint = this.api.websockets.candlesticks(chartConfig.symbol, chartConfig.timeframe, (tick) => {
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
                  volumePerTrade: candle.n ? candle.v / candle.n : 0,
                  isFinal: candle.x
                })
              })
              return this.api.websockets.terminate(endpoint)
            })),
            catchError(error => throwError(error)),
            share()
          )
          return resolve(stream)
        }, { limit: PERIODS + 1 })
      } catch (error) {
        return reject(error)
      }
    }))
  }

  sell (quantity, info) {
    return this.limiter.schedule(() => new Promise(async (resolve, reject) => {
      try {
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
    }))
  }
}

module.exports = Provider

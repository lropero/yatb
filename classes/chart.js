const hash = require('object-hash')
const isOnline = require('is-online')
const { addMilliseconds, formatDistanceToNow } = require('date-fns')
const { interval, timer } = require('rxjs')

const { errorToString, timeframeToMilliseconds, withIndicators } = require('../helpers')

class Chart {
  constructor (id, config, info, log, notifications, refreshChart, retrieveStream) {
    this.id = id
    this.config = config
    this.enabled = false
    this.info = info
    this.log = log
    this.name = `${config.symbol} ${config.timeframe} [${id.substr(0, 8)}]`
    this.notifications = notifications
    this.refreshChart = refreshChart
    this.retrieveStream = retrieveStream
  }

  static initialize (chartId, chartConfig, { exchangeInfo, log, notifications, refreshChart, retrieveStream }) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const info = exchangeInfo.symbols.find(info => info.symbol === chartConfig.symbol && typeof info.status === 'string')
      if (!info) {
        throw new Error('Info not available')
      }
      const chart = new Chart(chartId, chartConfig, info, log, notifications, refreshChart, retrieveStream)
      try {
        await chart.start()
        log({ level: 'info', message: `Added chart ${chart.name}` })
        return resolve(chart)
      } catch (error) {
        log({ level: 'silent', message: `${errorToString(error)}` })
        return resolve(chart)
      }
    })
  }

  disable () {
    this.enabled = false
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
    if (this.watchdog) {
      this.watchdog.unsubscribe()
    }
    delete this.stream
  }

  enable (stream) {
    delete this.frozen
    delete this.retries
    this.stream = stream
    this.subscription = stream.subscribe({
      next: async candle => {
        if (Array.isArray(candle)) {
          this.candles = await withIndicators(candle, this.config.indicators || {})
        } else {
          if (this.frozen) {
            delete this.frozen
          }
          const candles = this.candles.slice()
          if (candles[candles.length - 1].isFinal) {
            delete candles[candles.length - 1].direction
            candles.push(candle)
            while (candles.length > 500) {
              candles.shift()
            }
          } else {
            if (candle.close === candle.open) {
              candle.direction = 'o'
            } else if (candle.close < candles[candles.length - 1].close) {
              candle.direction = 'd'
            } else if (candle.close > candles[candles.length - 1].close) {
              candle.direction = 'u'
            } else if (candles[candles.length - 1].direction) {
              candle.direction = candles[candles.length - 1].direction
            }
            candles[candles.length - 1] = candle
          }
          this.candles = await withIndicators(candles, this.config.indicators || {})
          if (this.config.strategies) {
            this.notifications.next({
              type: 'ANALYZE_CHART',
              payload: { chartId: this.id, candles: this.candles.slice().reverse(), isFinal: candle.isFinal }
            })
          }
        }
        this.refreshChart(this.id)
      },
      error: error => {
        this.log({ level: 'silent', message: `${errorToString(error)}, restarting ${this.name}` })
        this.restart()
      }
    })
    this.notifications.next({ type: 'RESUBSCRIBE_TRADES_TO_NEW_STREAM', payload: { chartId: this.id, stream } })
    this.watchdog = interval(1000 * 60).subscribe(() => {
      isOnline().then(() => {
        try {
          if (this.frozen) {
            throw new Error('Chart frozen')
          }
          this.frozen = true
          if (this.candles.length > 1) {
            const interval = timeframeToMilliseconds(this.config.timeframe)
            const lastIndex = this.candles.length - (this.candles[this.candles.length - 1].isFinal ? 1 : 2)
            if (this.candles[lastIndex].time - this.candles[0].time !== interval * lastIndex) {
              const missing = []
              this.candles.map((candle, index) => {
                if (this.candles[index + 1] && this.candles[index + 1].time - candle.time !== interval) {
                  missing.push(candle.time)
                }
              })
              if (!this.missing || JSON.stringify(missing) !== JSON.stringify(this.missing)) {
                this.missing = missing
                throw new Error('Missing candle(s)')
              }
            } else if (this.missing) {
              delete this.missing
            }
          }
        } catch (error) {
          this.log({ level: 'silent', message: `${errorToString(error)}, restarting ${this.name}` })
          this.restart()
        }
      })
    })
    this.enabled = true
  }

  async restart () {
    try {
      this.disable()
      await this.start()
    } catch (error) {
      this.log({ level: 'silent', message: `${errorToString(error)}` })
    }
  }

  start () {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.info) {
          throw new Error('Info not available')
        }
        const { tickSize } = this.info.filters.find(filter => filter.filterType === 'PRICE_FILTER')
        const stream = await this.retrieveStream(this.config, tickSize)
        this.enable(stream)
        return resolve()
      } catch (error) {
        if (!this.retries) {
          this.retries = 0
        }
        const retryTime = 1000 * 60 * ++this.retries
        timer(retryTime).subscribe(() => this.restart())
        error.message = `Chart ${this.name}: ${errorToString(error)}, retrying in ${formatDistanceToNow(addMilliseconds(new Date(), retryTime))}`
        return reject(error)
      }
    })
  }

  updateInfo (exchangeInfo) {
    const info = exchangeInfo.symbols.find(info => info.symbol === this.info.symbol)
    if (info && hash(info) !== hash(this.info)) {
      this.info = info
      this.log({ level: 'silent', message: `Chart info updated, restarting ${this.name}` })
      this.restart()
    }
  }
}

module.exports = Chart

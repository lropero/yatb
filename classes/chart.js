const hash = require('object-hash')
const isOnline = require('is-online')
const { addMilliseconds, distanceInWordsToNow } = require('date-fns')
const { interval, timer } = require('rxjs')

const { errorToString, timeframeToMilliseconds, withIndicators } = require('../helpers')

class Chart {
  constructor (id, config, exchangeInfo, log, notifications, retrieveStream, show) {
    this.id = id
    this.config = config
    this.enabled = false
    this.log = log
    this.name = `${config.symbol} ${config.timeframe} [${id.substr(0, 8)}]`
    this.notifications = notifications
    this.retrieveStream = retrieveStream
    this.show = show
    this.setInfo(exchangeInfo)
  }

  static initialize (chartId, chartConfig, { exchangeInfo, log, notifications, retrieveStream, show }) {
    return new Promise(async (resolve, reject) => {
      const chart = new Chart(chartId, chartConfig, exchangeInfo, log, notifications, retrieveStream, show)
      try {
        await chart.start()
        log({ level: 'info', message: `Added chart ${chart.name}` })
        return resolve(chart)
      } catch (error) {
        log(error)
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
      next: async (candle) => {
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
          if (candle.isFinal && this.config.strategies) {
            this.notifications.next({ type: 'candlesReady', payload: { chartId: this.id, candles: this.candles.slice().reverse() } })
          }
        }
        this.show(this.id)
      },
      error: (error) => {
        error.message = `${errorToString(error)}, restarting ${this.name}`
        this.log(error)
        this.restart()
      }
    })
    this.notifications.next({ type: 'chartReset', payload: { chartId: this.id, stream } })
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
      this.log(error)
    }
  }

  setInfo (exchangeInfo) {
    const info = exchangeInfo.symbols.find((info) => info.symbol === this.config.symbol)
    if (this.info) {
      if (hash(this.info) !== hash(info)) {
        this.info = info
        this.log({ level: 'silent', message: `Chart info updated, restarting ${this.name}` })
        this.restart()
      }
    } else {
      this.info = info
    }
  }

  start () {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.info) {
          throw new Error(`Info not available`)
        }
        const stream = await this.retrieveStream(this.config)
        this.enable(stream)
        return resolve()
      } catch (error) {
        if (!this.retries) {
          this.retries = 0
        }
        const retryTime = 1000 * 60 * ++this.retries
        timer(retryTime).subscribe(() => this.restart())
        error.message = `Chart ${this.name}: ${errorToString(error)}, retrying in ${distanceInWordsToNow(addMilliseconds(new Date(), retryTime))}`
        return reject(error)
      }
    })
  }
}

module.exports = Chart

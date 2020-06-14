const chalk = require('chalk')
const figures = require('figures')
const { filter, first, tap } = require('rxjs/operators')
const { format } = require('date-fns')
const { formatMoney } = require('accounting-js')
const { timer } = require('rxjs')

const { errorToString, millisecondsToTime, timeframeToMilliseconds } = require('../helpers')

class Trade {
  constructor (advisorId, buy, chartId, id, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who) {
    const { tickSize } = info.filters.find(filter => filter.filterType === 'PRICE_FILTER')
    const spent = order.fills.reduce((spent, fill) => spent + parseFloat(fill.qty) * parseFloat(fill.price), 0)
    this.advisorId = advisorId
    this.buy = buy
    this.chartId = chartId
    this.decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length
    this.id = id
    this.info = info
    this.isLong = isLong
    this.isOpen = true
    this.log = log
    this.orders = [
      {
        date: new Date(),
        ...order
      }
    ]
    this.price = parseFloat((order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length).toFixed(this.decimalPlaces))
    this.profitTarget = parseFloat(strategy.config.profitTarget || 0) / 100
    this.quantity = parseFloat(order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0).toFixed(this.info.quotePrecision))
    this.sell = sell
    this.show = show
    this.stopLoss = parseFloat(strategy.config.stopLoss || 0) / 100
    this.stopPrice = parseFloat((this.price - ((spent * this.stopLoss) / this.quantity) * (this.isLong ? 1 : -1)).toFixed(this.decimalPlaces))
    this.strategyName = strategy.name
    this.targetPrice = parseFloat((this.price + ((spent * this.profitTarget) / this.quantity) * (this.isLong ? 1 : -1)).toFixed(this.decimalPlaces))
    this.timeToLive = timeframeToMilliseconds(strategy.config.timeToLive || 0)
    this.updateFunds = updateFunds
    this.who = who
    this.subscribe(stream)
    this.log({ level: this.isLong ? 'long' : 'short', message: this.toString(true) })
  }

  static initialize ({ advisorId, buy, chartId, exchangeInfo, id, isLong, log, quantity, sell, show, signal, strategy, stream, symbol, updateFunds, who }) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const info = exchangeInfo.symbols.find(info => info.symbol === symbol && typeof info.status === 'string')
        if (!info) {
          throw new Error('Info not available')
        }
        if (info.status !== 'TRADING') {
          throw new Error(`Not trading, current status: ${info.status}`)
        }
        const order = isLong ? await buy(quantity, info) : await sell(quantity, info)
        if (order.orderId && order.fills.length) {
          const trade = new Trade(advisorId, buy, chartId, id, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who)
          await updateFunds()
          return resolve(trade)
        }
        throw new Error('Order failed')
      } catch (error) {
        error.message = `Trade ${signal} ${quantity} ${who}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  async calculateStats () {
    try {
      const funds = await this.updateFunds()
      let commission = 0
      let loss = 0
      let profit = 0
      this.orders.map(order => {
        if (order.side === 'BUY') {
          loss += order.fills.reduce((loss, fill) => loss + parseFloat(fill.qty) * parseFloat(fill.price), 0)
        } else if (order.side === 'SELL') {
          profit += order.fills.reduce((profit, fill) => profit + parseFloat(fill.qty) * parseFloat(fill.price), 0)
        }
        commission += order.fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * (fill.commissionAsset !== 'USDT' ? funds[fill.commissionAsset].dollars / funds[fill.commissionAsset].available : 1), 0)
      })
      const gross = (profit - loss) * (this.info.quoteAsset !== 'USDT' ? funds[this.info.quoteAsset].dollars / funds[this.info.quoteAsset].available : 1)
      this.stats = {
        commission,
        duration: this.orders[this.orders.length - 1].date - this.orders[0].date,
        gross,
        net: gross - commission
      }
      this.show()
    } catch (error) {
      error.message = `calculateStats(): ${errorToString(error)}`
      this.log(error)
    }
  }

  close (type) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isOpen) {
          return resolve()
        }
        if (this.stop) {
          this.stop.unsubscribe()
        }
        if (this.target) {
          this.target.unsubscribe()
        }
        if (this.timer) {
          this.timer.unsubscribe()
        }
        if (!this.info) {
          throw new Error('Info not available')
        }
        if (this.info.status !== 'TRADING') {
          throw new Error(`Not trading, current status: ${this.info.status}`)
        }
        const order = this.isLong ? await this.sell(this.quantity, this.info) : await this.buy(this.quantity, this.info)
        if (order.orderId && order.fills.length) {
          this.isOpen = false
          this.closeType = type
          this.orders.push({
            date: new Date(),
            ...order
          })
          const price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
          const quantity = parseFloat(order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0).toFixed(this.info.quotePrecision))
          this.log({ level: `close${type.charAt(0).toUpperCase() + type.slice(1)}`, message: `${chalk.underline(this.id)} ${this.info.symbol} ${quantity}${chalk.cyan('@')}${price.toFixed(this.decimalPlaces)}` })
          this.show()
          this.calculateStats()
          return resolve()
        }
        throw new Error('Order failed')
      } catch (error) {
        this.isOpen = false
        this.show()
        error.message = `Unable to close ${chalk.underline(this.id)}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  setStop (stream) {
    if (this.stop) {
      this.stop.unsubscribe()
    }
    this.stop = stream
      .pipe(
        filter(candle => {
          if (this.isLong) {
            return candle.low <= this.stopPrice
          } else {
            return candle.high >= this.stopPrice
          }
        }),
        first(),
        tap(async () => {
          try {
            await this.close('stop')
          } catch (error) {
            this.log(error)
          }
        })
      )
      .subscribe()
  }

  setTarget (stream) {
    if (this.target) {
      this.target.unsubscribe()
    }
    this.target = stream
      .pipe(
        filter(candle => {
          if (this.isLong) {
            return candle.high >= this.targetPrice
          } else {
            return candle.low <= this.targetPrice
          }
        }),
        first(),
        tap(async () => {
          try {
            await this.close('target')
          } catch (error) {
            this.log(error)
          }
        })
      )
      .subscribe()
  }

  subscribe (stream) {
    if (this.isOpen) {
      if (this.timer) {
        this.timer.unsubscribe()
      }
      this.setStop(stream)
      this.setTarget(stream)
      if (this.timeToLive > 0) {
        const timeRemaining = new Date(this.orders[0].date.getTime() + this.timeToLive) - new Date()
        this.timer = timer(timeRemaining).subscribe(async () => {
          try {
            await this.close('expire')
          } catch (error) {
            this.log(error)
          }
        })
      }
    }
  }

  toString (log = false, who = true) {
    const string = `${chalk.underline(this.id)} ${this.info.symbol} ${this.quantity}${chalk[this.isOpen ? 'cyan' : 'gray']('@')}${this.price.toFixed(this.decimalPlaces)} ${chalk[this.isOpen ? 'green' : 'gray']('TRGT ' + this.targetPrice.toFixed(this.decimalPlaces))} ${chalk[this.isOpen ? 'red' : 'gray']('STOP ' + this.stopPrice.toFixed(this.decimalPlaces))}`
    if (log) {
      return `${string} #avoidBlack${this.who}#`
    }
    const getIcon = () => {
      if (this.isOpen) {
        return this.isLong ? chalk.cyan(figures.arrowUp) : chalk.magenta(figures.arrowDown)
      } else {
        switch (this.closeType) {
          case 'expire':
            return chalk.blue(figures.play)
          case 'signal':
            return chalk.yellow(figures.play)
          case 'stop':
            return chalk.red(figures.play)
          case 'target':
            return chalk.green(figures.play)
          default:
            return chalk.gray(figures.play)
        }
      }
    }
    const timeRemaining = this.timeToLive ? new Date(this.orders[0].date.getTime() + this.timeToLive) - new Date() : 0
    return `${getIcon()} ${chalk.gray(format(this.orders[0].date, 'dd-MMM-yy HH:mm:ss'))} ${this.isOpen ? chalk.white(string) : chalk.gray(string)} ${chalk.gray(who ? this.who : this.strategyName)}${this.stats ? ' ' + chalk.cyan.dim(millisecondsToTime(this.stats.duration)) + ' ' + chalk[this.stats.gross > 0 ? 'green' : 'red'](formatMoney(Math.abs(this.stats.gross), { precision: 3 })) + ' - ' + chalk.yellow(formatMoney(this.stats.commission, { precision: 3 })) + ' = ' + chalk[this.stats.net > 0 ? 'green' : 'red'](formatMoney(Math.abs(this.stats.net), { precision: 3 })) : this.isOpen && timeRemaining > 0 ? ' ' + chalk.blue(millisecondsToTime(timeRemaining)) : ''}`
  }

  updateInfo (exchangeInfo) {
    const info = exchangeInfo.symbols.find(info => info.symbol === this.info.symbol)
    if (info) {
      this.info = info
    }
  }
}

module.exports = Trade

const chalk = require('chalk')
const figures = require('figures')
const { filter, first, tap } = require('rxjs/operators')
const { format } = require('date-fns')
const { formatMoney } = require('accounting-js')
const { timer } = require('rxjs')

const { errorToString, millisecondsToTime, timeframeToMilliseconds } = require('../helpers')

class Trade {
  constructor (advisorId, buy, chartId, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who) {
    const spent = order.fills.reduce((spent, fill) => spent + parseFloat(fill.qty) * parseFloat(fill.price), 0)
    this.advisorId = advisorId
    this.buy = buy
    this.chartId = chartId
    this.id = 'T' + order.orderId
    this.info = info
    this.isLong = isLong
    this.isOpen = true
    this.log = log
    this.orders = [{
      date: new Date(),
      ...order
    }]
    this.price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
    this.profitTarget = parseFloat(strategy.config.profitTarget || 0) / 100
    this.quantity = parseFloat(order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0).toFixed(this.info.quotePrecision))
    this.sell = sell
    this.show = show
    this.stopLoss = parseFloat(strategy.config.stopLoss || 0) / 100
    this.stopPrice = this.price - ((spent * this.stopLoss) / this.quantity) * (this.isLong ? 1 : -1)
    this.strategyName = strategy.name
    this.targetPrice = this.price + ((spent * this.profitTarget) / this.quantity) * (this.isLong ? 1 : -1)
    this.updateFunds = updateFunds
    this.who = who
    this.setStop(stream)
    this.setTarget(stream)
    this.log({ level: this.isLong ? 'long' : 'short', message: this.toString(true) })
    const timeToLive = timeframeToMilliseconds(strategy.config.timeToLive || 0)
    if (timeToLive > 0) {
      this.timer = timer(timeToLive).subscribe(async () => {
        try {
          await this.close('expire')
        } catch (error) {
          this.log(error)
        }
      })
      this.timeToLive = millisecondsToTime(timeToLive)
    }
    this.updateFunds()
  }

  static initialize ({ advisorId, buy, chartId, exchangeInfo, isLong, log, quantity, sell, show, signal, strategy, stream, symbol, updateFunds, who }) {
    return new Promise(async (resolve, reject) => {
      try {
        const info = exchangeInfo.symbols.find((info) => info.symbol === symbol && typeof info.status === 'string')
        if (!info) {
          throw new Error(`Info not available`)
        }
        if (info.status !== 'TRADING') {
          throw new Error(`Not trading, current status: ${info.status}`)
        }
        const order = isLong ? await buy(quantity, info) : await sell(quantity, info)
        if (order.orderId && order.fills.length) {
          const trade = new Trade(advisorId, buy, chartId, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who)
          return resolve(trade)
        }
        throw new Error('Order failed')
      } catch (error) {
        error.message = `Trade ${signal} ${quantity} ${who}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  calculateStats () {
    return new Promise(async (resolve, reject) => {
      try {
        const funds = await this.updateFunds()
        let commission = 0
        let loss = 0
        let profit = 0
        this.orders.map((order) => {
          if (order.side === 'BUY') {
            loss += order.fills.reduce((loss, fill) => loss + parseFloat(fill.qty) * parseFloat(fill.price), 0)
          } else if (order.side === 'SELL') {
            profit += order.fills.reduce((profit, fill) => profit + parseFloat(fill.qty) * parseFloat(fill.price), 0)
          }
          commission += order.fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * funds[fill.commissionAsset].dollarPrice, 0)
        })
        const gross = (profit - loss) * (this.info.quoteAsset !== 'USDT' ? funds[this.info.quoteAsset].dollarPrice : 1)
        const stats = {
          commission,
          duration: this.orders[this.orders.length - 1].date - this.orders[0].date,
          gross,
          net: gross - commission
        }
        return resolve(stats)
      } catch (error) {
        return reject(error)
      }
    })
  }

  close (type) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.info) {
          throw new Error(`Info not available`)
        }
        if (this.info.status !== 'TRADING') {
          throw new Error(`Not trading, current status: ${this.info.status}`)
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
        const order = this.isLong ? await this.sell(this.quantity, this.info) : await this.buy(this.quantity, this.info)
        if (order.orderId && order.fills.length) {
          this.isOpen = false
          switch (type) {
            case 'expire': {
              this.isExpired = true
              break
            }
            case 'stop': {
              this.isWinner = false
              break
            }
            case 'target': {
              this.isWinner = true
              break
            }
          }
          this.orders.push({
            date: new Date(),
            ...order
          })
          this.stats = await this.calculateStats()
          const { tickSize } = this.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
          const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
          const price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
          const quantity = order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
          this.log({ level: `close${type.charAt(0).toUpperCase() + type.slice(1)}`, message: `${chalk.underline(this.id)} ${this.info.symbol} ${quantity}${chalk.cyan('@')}${price.toFixed(decimalPlaces)}` })
          this.show(this.chartId)
          return resolve()
        }
        throw new Error('Order failed')
      } catch (error) {
        timer(1000 * 60).subscribe(async () => {
          try {
            await this.close(type)
          } catch (error) {
            this.log(error)
          }
        })
        error.message = `${chalk.underline(this.id)}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  resubscribe (stream) {
    if (this.isOpen) {
      this.setStop(stream)
      this.setTarget(stream)
    }
  }

  setStop (stream) {
    if (this.stop) {
      this.stop.unsubscribe()
    }
    this.stop = stream.pipe(
      filter((candle) => {
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
    ).subscribe()
  }

  setTarget (stream) {
    if (this.target) {
      this.target.unsubscribe()
    }
    this.target = stream.pipe(
      filter((candle) => {
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
    ).subscribe()
  }

  toString (log = false, who = true) {
    const { tickSize } = this.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
    const string = `${chalk.underline(this.id)} ${this.info.symbol} ${this.quantity}${chalk[this.isOpen ? 'cyan' : 'gray']('@')}${this.price.toFixed(decimalPlaces)} ${chalk[this.isOpen ? 'green' : 'gray']('TRGT ' + this.targetPrice.toFixed(decimalPlaces))} ${chalk[this.isOpen ? 'red' : 'gray']('STOP ' + this.stopPrice.toFixed(decimalPlaces))}`
    if (log) {
      return `${string} #avoidBlack${this.who}#`
    }
    const getIcon = () => {
      if (this.isOpen) {
        return this.isLong ? chalk.cyan(figures.arrowUp) : chalk.magenta(figures.arrowDown)
      } else if (typeof this.isWinner !== 'undefined') {
        return this.isWinner ? chalk.green(figures.play) : chalk.red(figures.play)
      }
      return chalk[this.isExpired ? 'blue' : 'yellow'](figures.play)
    }
    return `${getIcon()} ${chalk.gray(format(this.orders[0].date, 'DD-MMM-YY HH:mm:ss'))} ${(this.isOpen ? chalk.white(string) : chalk.gray(string))} ${chalk.gray(who ? this.who : this.strategyName)}${this.stats ? ' ' + chalk.cyan.dim(millisecondsToTime(this.stats.duration)) + ' ' + chalk[this.stats.gross > 0 ? 'green' : 'red'](formatMoney(Math.abs(this.stats.gross), { precision: 3 })) + ' - ' + chalk.yellow(formatMoney(this.stats.commission, { precision: 3 })) + ' = ' + chalk[this.stats.net > 0 ? 'green' : 'red'](formatMoney(Math.abs(this.stats.net), { precision: 3 })) : ''}`
  }

  updateInfo (exchangeInfo) {
    const info = exchangeInfo.symbols.find((info) => info.symbol === this.info.symbol)
    if (info) {
      this.info = info
    }
  }
}

module.exports = Trade

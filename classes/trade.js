const chalk = require('chalk')
const figures = require('figures')
const { filter, first, tap } = require('rxjs/operators')
const { format } = require('date-fns')

const { errorToString } = require('../helpers')

class Trade {
  constructor (advisorId, buy, chartId, funds, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who) {
    this.advisorId = advisorId
    this.buy = buy
    this.chartId = chartId
    this.funds = funds
    this.id = order.orderId
    this.info = info
    this.isLong = isLong
    this.isOpen = true
    this.log = log
    this.orders = [{
      date: new Date(),
      order
    }]
    this.price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
    this.profitTarget = parseFloat(strategy.config.profitTarget || 0) / 100
    this.quantity = order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
    this.sell = sell
    this.show = show
    this.spent = order.fills.reduce((spent, fill) => spent + parseFloat(fill.qty) * parseFloat(fill.price), 0)
    this.stopLoss = parseFloat(strategy.config.stopLoss || 0) / 100
    this.stopPrice = this.setStop(stream)
    this.targetPrice = this.setTarget(stream)
    this.updateFunds = updateFunds
    this.who = who
    const { tickSize } = this.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
    this.log({ level: this.isLong ? 'long' : 'short', message: `${chalk.underline('T' + this.id)} ${this.info.symbol} ${this.quantity}${chalk.cyan('@')}${this.price.toFixed(decimalPlaces)} ${chalk.green('TRGT ' + this.targetPrice.toFixed(decimalPlaces))} ${chalk.red('STOP ' + this.stopPrice.toFixed(decimalPlaces))} ${chalk.black(this.who)}` })
    this.show(this.chartId)
    this.updateFunds()
  }

  static initialize ({ advisorId, amount, buy, chartId, exchangeInfo, funds, log, sell, show, signal, strategy, stream, symbol, updateFunds, who }) {
    return new Promise(async (resolve, reject) => {
      try {
        const info = exchangeInfo.symbols.find((info) => info.symbol === symbol && typeof info.status === 'string')
        if (!info) {
          throw new Error(`Info not available`)
        }
        if (info.status !== 'TRADING') {
          throw new Error(`Not trading, current status: ${info.status}`)
        }
        switch (signal) {
          case 'LONG':
          case 'SHORT': {
            const isLong = signal === 'LONG'
            const order = isLong ? await buy(amount, info) : await sell(amount, info)
            if (order.orderId && order.fills.length) {
              const trade = new Trade(advisorId, buy, chartId, funds, info, isLong, log, order, sell, show, strategy, stream, updateFunds, who)
              return resolve(trade)
            }
            break
          }
        }
        throw new Error('Order failed')
      } catch (error) {
        error.message = `Trade ${signal} ${amount} ${who}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  // TODO: Calculate more stuff, will be called from this.toString()
  calculatePnL () {
    // let commission = 0
    // this.orders.map(({ order }) => {
    //   commission += Math.round(order.fills.reduce((commission, fill) => commission + parseFloat(fill.commission) * this.funds[fill.commissionAsset].dollarPrice, 0) * 1000) / 1000
    // })
  }

  close (silent = false) {
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
        const order = await (this.isLong ? this.sell(this.quantity, this.info) : this.buy(this.quantity, this.info))
        if (order.orderId && order.fills.length) {
          this.isOpen = false
          this.orders.push({
            date: new Date(),
            order
          })
          if (!silent) {
            const { tickSize } = this.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
            const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
            const price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
            const quantity = order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
            this.log({ level: 'close', message: `${chalk.underline('T' + this.id)} ${this.info.symbol} ${quantity}${chalk.cyan('@')}${price.toFixed(decimalPlaces)} ${chalk.black(this.who)}` })
          }
          this.updateFunds()
          this.show(this.chartId)
          return resolve(order)
        }
        throw new Error('Order failed')
      } catch (error) {
        error.message = `${chalk.underline('T' + this.id)}: ${errorToString(error)}`
        return reject(error)
      }
    })
  }

  resubscribe (stream) {
    this.setStop(stream)
    this.setTarget(stream)
  }

  setStop (stream) {
    if (this.stop) {
      this.stop.unsubscribe()
    }
    let stopPrice = 0
    if (this.stopLoss > 0) {
      stopPrice = this.price - ((this.spent * this.stopLoss) / this.quantity) * (this.isLong ? 1 : -1)
      this.stop = stream.pipe(
        filter((candle) => {
          if (this.isLong) {
            return candle.low <= stopPrice
          } else {
            return candle.high >= stopPrice
          }
        }),
        first(),
        tap(async () => {
          try {
            const order = await this.close(true)
            const price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
            const quantity = order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
            this.log({ level: 'stop', message: `${chalk.underline('T' + this.id)} ${this.info.symbol} ${quantity}${chalk.cyan('@')}${price} ${chalk.black(this.who)}` })
            this.isWinner = false
          } catch (error) {
            this.log(error)
          }
        })
      ).subscribe()
    }
    return stopPrice
  }

  setTarget (stream) {
    if (this.target) {
      this.target.unsubscribe()
    }
    let targetPrice = 0
    if (this.profitTarget > 0) {
      targetPrice = this.price + ((this.spent * this.profitTarget) / this.quantity) * (this.isLong ? 1 : -1)
      this.target = stream.pipe(
        filter((candle) => {
          if (this.isLong) {
            return candle.high >= targetPrice
          } else {
            return candle.low <= targetPrice
          }
        }),
        first(),
        tap(async () => {
          try {
            const order = await this.close(true)
            const price = order.fills.reduce((price, fill) => price + parseFloat(fill.price), 0) / order.fills.length
            const quantity = order.fills.reduce((quantity, fill) => quantity + parseFloat(fill.qty), 0)
            this.log({ level: 'target', message: `${chalk.underline('T' + this.id)} ${this.info.symbol} ${quantity}${chalk.cyan('@')}${price} ${chalk.black(this.who)}` })
            this.isWinner = true
          } catch (error) {
            this.log(error)
          }
        })
      ).subscribe()
    }
    return targetPrice
  }

  toString () {
    const getIcon = () => {
      if (this.isOpen) {
        return this.isLong ? chalk.cyan(figures.arrowUp) : chalk.magenta(figures.arrowDown)
      } else if (typeof this.isWinner !== 'undefined') {
        return this.isWinner ? chalk.green(figures.play) : chalk.red(figures.play)
      }
      return chalk.yellow(figures.play)
    }
    const { tickSize } = this.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
    return getIcon() + ' ' + chalk.gray(format(this.orders[0].date, 'DD-MMM-YY HH:mm:ss')) + ' ' + chalk[this.isOpen ? 'white' : 'gray'](`${chalk.underline('T' + this.id)} ${this.info.symbol} ${this.quantity}${chalk[this.isOpen ? 'cyan' : 'gray']('@')}${this.price.toFixed(decimalPlaces)} ${chalk[this.isOpen ? 'green' : 'gray']('TRGT ' + this.targetPrice.toFixed(decimalPlaces))} ${chalk[this.isOpen ? 'red' : 'gray']('STOP ' + this.stopPrice.toFixed(decimalPlaces))} ${chalk.gray(this.who)}`)
  }

  updateInfo (exchangeInfo) {
    const info = exchangeInfo.symbols.find((info) => info.symbol === this.info.symbol)
    if (info) {
      this.info = info
    }
  }
}

module.exports = Trade

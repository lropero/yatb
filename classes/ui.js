const asciichart = require('asciichart')
const blessed = require('blessed')
const chalk = require('chalk')
const figures = require('figures')
const stripAnsi = require('strip-ansi')
const { debounceTime } = require('rxjs/operators')
const { format } = require('date-fns')
const { formatMoney } = require('accounting-js')
const { fromEvent } = require('rxjs')
const { pretty } = require('js-object-pretty-print')

const { millisecondsToTime, plotVolume } = require('../helpers')

const colors = {
  CHART_BORDER: 'white',
  CHART_DRAWING: 'yellow',
  CHART_PRICE: 'yellow',
  CHART_PRICE_DOWN: 'magenta',
  CHART_PRICE_NEW_CANDLE: 'white',
  CHART_PRICE_OPEN: 'blue',
  CHART_PRICE_UP: 'cyan',
  CHART_TITLE: 'white',
  DISPLAY_BACKGROUND: 'black',
  DISPLAY_FOREGROUND: 'white',
  FOOTER_BACKGROUND: 'magenta',
  FOOTER_FOREGROUND: 'black',
  FOOTER_OPTION: 'white',
  FOOTER_OPTION_ARROW: 'yellow',
  FOOTER_OPTION_KEY: 'cyan',
  FUNDS_ASSET: 'yellow',
  FUNDS_AVAILABLE: 'white',
  FUNDS_DOLLARS: 'green',
  FUNDS_ORDER: 'magenta',
  FUNDS_TITLE: 'white',
  LOGGER_BACKGROUND: 'magenta',
  LOGGER_FOREGROUND: 'white',
  TRADE_LONG: 'cyan',
  TRADE_PRICE: 'yellow',
  TRADE_SHORT: 'magenta',
  TRADE_STOP: 'red',
  TRADE_TARGET: 'green',
  VOLUME_BACKGROUND: 'bgBlack',
  VOLUME_DOWN: 'red',
  VOLUME_FOREGROUND: 'magenta',
  VOLUME_NUMBER: 'yellow',
  VOLUME_NUMBER_DOTS: 'magenta',
  VOLUME_OPEN: 'yellow',
  VOLUME_UP: 'green'
}

class UI {
  constructor (config) {
    this.bufferLength = 50
    this.logs = []
    this.screen = blessed.screen({ smartCSR: true })
    this.screen.title = config.title
    this.appendLogger()
    this.appendDisplay()
    this.appendFooter(config.getEstimatedValue)
    fromEvent(this.screen, 'resize')
      .pipe(debounceTime(10))
      .subscribe(() => {
        this.drawLogger()
        config.handleResize()
      })
    this.screen.render()
    Object.keys(config.bindings).map(key => this.screen.key(key, config.bindings[key]))
  }

  appendDisplay () {
    this.display = blessed.box({
      height: '80%',
      style: {
        bg: colors.DISPLAY_BACKGROUND,
        fg: colors.DISPLAY_FOREGROUND
      },
      top: '20%',
      width: '100%'
    })
    this.screen.append(this.display)
  }

  appendFooter (getEstimatedValue) {
    this.footerLeft = blessed.box({
      content: ` ${this.screen.title}`,
      height: 'shrink',
      style: {
        bg: colors.FOOTER_BACKGROUND,
        fg: colors.FOOTER_FOREGROUND
      },
      top: '99%',
      width: '50%'
    })
    this.footerLeft.on('mouseover', () => {
      const estimatedValue = getEstimatedValue()
      if (parseFloat(estimatedValue) > 0) {
        this.footerLeft.setContent(` Estimated value: ${formatMoney(estimatedValue, { precision: 3 })}`)
        this.screen.render()
        setTimeout(() => {
          this.footerLeft.setContent(` ${this.screen.title}`)
          this.screen.render()
        }, 3000)
      }
    })
    this.footerRight = blessed.box({
      content: `${chalk[colors.FOOTER_OPTION_KEY]('a')}${chalk[colors.FOOTER_OPTION]('dvisors')}  ${chalk[colors.FOOTER_OPTION_KEY]('x')} ${chalk[
        colors.FOOTER_OPTION_ARROW
      ]('<<')} ${chalk[colors.FOOTER_OPTION]('charts')} ${chalk[colors.FOOTER_OPTION_ARROW]('>>')} ${chalk[colors.FOOTER_OPTION_KEY]('c')}  ${chalk[
        colors.FOOTER_OPTION_KEY
      ]('d')}${chalk[colors.FOOTER_OPTION]('ata')}  ${chalk[colors.FOOTER_OPTION_KEY]('f')}${chalk[colors.FOOTER_OPTION]('unds')}  ${chalk[
        colors.FOOTER_OPTION_KEY
      ]('l')}${chalk[colors.FOOTER_OPTION]('ogs')}  ${chalk[colors.FOOTER_OPTION_KEY]('t')}${chalk[colors.FOOTER_OPTION]('rades')}  ${chalk[
        colors.FOOTER_OPTION_KEY
      ]('q')}${chalk[colors.FOOTER_OPTION]('uit')}`,
      height: 'shrink',
      left: '50%',
      style: {
        bg: colors.FOOTER_BACKGROUND,
        fg: colors.FOOTER_FOREGROUND
      },
      top: '99%',
      width: '50%'
    })
    this.screen.append(this.footerLeft)
    this.screen.append(this.footerRight)
  }

  appendLogger () {
    this.logger = blessed.box({
      height: '20%',
      scrollable: true,
      style: {
        bg: colors.LOGGER_BACKGROUND,
        fg: colors.LOGGER_FOREGROUND
      },
      width: '100%'
    })
    this.screen.append(this.logger)
  }

  drawLogger () {
    this.logger.setContent(this.logs.map(log => ` ${log}`).join('\n'))
    this.logger.scrollTo(this.bufferLength)
    this.screen.render()
  }

  log (string) {
    this.logs.push(string)
    if (this.logs.length > this.bufferLength) {
      this.logs.shift()
    }
    this.drawLogger()
  }

  renderChart (advisor, chart, trade) {
    const { close: quote, direction = '' } = chart.candles[chart.candles.length - 1]
    const { tickSize } = chart.info.filters.find(filter => filter.filterType === 'PRICE_FILTER')
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length
    const candles = chart.candles.slice(Math.max(chart.candles.length - this.screen.cols + quote.toString().split('.')[0].length + decimalPlaces + 3, 0))
    let quoteColor = colors.CHART_PRICE_NEW_CANDLE
    if (direction.length) {
      switch (direction) {
        case 'd': {
          quoteColor = colors.CHART_PRICE_DOWN
          break
        }
        case 'o': {
          quoteColor = colors.CHART_PRICE_OPEN
          break
        }
        case 'u': {
          quoteColor = colors.CHART_PRICE_UP
          break
        }
      }
    }
    let chartLength = 0
    const hasVolume = Math.ceil(this.screen.rows * 0.8) - 2 > 4
    const ascii = stripAnsi(
      asciichart.plot(
        candles.map(candle => candle.close),
        {
          format: close => close.toFixed(decimalPlaces),
          height: hasVolume ? Math.ceil(this.screen.rows * 0.6) - 2 : Math.ceil(this.screen.rows * 0.8) - 2
        }
      )
    ).split('\n')
    const tradeNumbers = {}
    if (trade) {
      const prices = ascii.reduce((prices, line) => {
        const split = line.split(line.includes(String.fromCharCode(9508)) ? String.fromCharCode(9508) : String.fromCharCode(9532))
        if (split.length === 2) {
          prices.push(split[0].trim())
        }
        return prices
      }, [])
      if (prices.length > 1) {
        const distance = prices[0] - prices[1]
        const distancesPrice = prices.map(price => Math.abs(price - trade.price))
        const indexPrice = distancesPrice.indexOf(Math.min(...distancesPrice))
        if (indexPrice === 0 && Math.abs(prices[0] - trade.price) < distance) {
          tradeNumbers[indexPrice] = { tradePrice: chalk[colors.TRADE_PRICE](trade.price.toFixed(decimalPlaces)) }
        } else if (indexPrice === prices.length - 1 && Math.abs(prices[prices.length - 1] - trade.price) < distance) {
          tradeNumbers[indexPrice] = { tradePrice: chalk[colors.TRADE_PRICE](trade.price.toFixed(decimalPlaces)) }
        } else if (indexPrice !== 0 && indexPrice !== prices.length - 1) {
          tradeNumbers[indexPrice] = { tradePrice: chalk[colors.TRADE_PRICE](trade.price.toFixed(decimalPlaces)) }
        }
        const distancesStopPrice = prices.map(price => Math.abs(price - trade.stopPrice))
        const indexStopPrice = distancesStopPrice.indexOf(Math.min(...distancesStopPrice))
        if (indexStopPrice === 0 && Math.abs(prices[0] - trade.stopPrice) < distance) {
          tradeNumbers[indexStopPrice] = chalk[colors.TRADE_STOP](trade.stopPrice.toFixed(decimalPlaces))
        } else if (indexStopPrice === prices.length - 1 && Math.abs(prices[prices.length - 1] - trade.stopPrice) < distance) {
          tradeNumbers[indexStopPrice] = chalk[colors.TRADE_STOP](trade.stopPrice.toFixed(decimalPlaces))
        } else if (indexStopPrice !== 0 && indexStopPrice !== prices.length - 1) {
          tradeNumbers[indexStopPrice] = chalk[colors.TRADE_STOP](trade.stopPrice.toFixed(decimalPlaces))
        }
        const distancesTargetPrice = prices.map(price => Math.abs(price - trade.targetPrice))
        const indexTargetPrice = distancesTargetPrice.indexOf(Math.min(...distancesTargetPrice))
        if (indexTargetPrice === 0 && Math.abs(prices[0] - trade.targetPrice) < distance) {
          tradeNumbers[indexTargetPrice] = chalk[colors.TRADE_TARGET](trade.targetPrice.toFixed(decimalPlaces))
        } else if (indexTargetPrice === prices.length - 1 && Math.abs(prices[prices.length - 1] - trade.targetPrice) < distance) {
          tradeNumbers[indexTargetPrice] = chalk[colors.TRADE_TARGET](trade.targetPrice.toFixed(decimalPlaces))
        } else if (indexTargetPrice !== 0 && indexTargetPrice !== prices.length - 1) {
          tradeNumbers[indexTargetPrice] = chalk[colors.TRADE_TARGET](trade.targetPrice.toFixed(decimalPlaces))
        }
      }
    }
    const asciiStyled = ascii
      .reduce((asciiStyled, line, index) => {
        const split = line.split(line.includes(String.fromCharCode(9508)) ? String.fromCharCode(9508) : String.fromCharCode(9532))
        if (split.length === 2) {
          const price = split[0].trim()
          let drawing = chalk[colors.CHART_DRAWING](split[1].slice(0, -1))
          const isQuote = String.fromCharCode(9472, 9581, 9584).includes(stripAnsi(drawing).slice(-1))
          if (!asciiStyled.length) {
            chartLength = stripAnsi(drawing).length
            const title = chalk[colors.CHART_TITLE](`${advisor.name} - ${chart.name}`) + (trade ? ' ' + trade.toString(false, false) : '')
            if (chartLength > stripAnsi(title).length) {
              drawing = `${title} ${chalk[colors.CHART_DRAWING](stripAnsi(drawing).slice(stripAnsi(title).length + 1))}`
            }
          }
          asciiStyled.push(
            `${drawing}${chalk[colors.CHART_BORDER](String.fromCharCode(9474))}${
              trade && tradeNumbers[index] && tradeNumbers[index].tradePrice
                ? trade.isLong
                  ? chalk[colors.TRADE_LONG](figures.arrowUp)
                  : chalk[colors.TRADE_SHORT](figures.arrowDown)
                : ' '
            }${
              isQuote
                ? chalk[quoteColor](quote.toFixed(decimalPlaces))
                : (tradeNumbers[index] && tradeNumbers[index].tradePrice) || tradeNumbers[index] || chalk[colors.CHART_PRICE](price)
            }`
          )
          return asciiStyled
        }
      }, [])
      .join('\n')
    if (hasVolume) {
      this.display.setContent(
        [
          asciiStyled,
          plotVolume(candles.slice(1), {
            colors,
            height: Math.ceil(this.screen.rows * 0.8) - ascii.length - 1,
            width: this.screen.cols
          })
        ].join('\n')
      )
    } else {
      this.display.setContent(asciiStyled)
    }
    this.screen.render()
  }

  renderClose () {
    this.display.setContent(
      chalk[colors.DISPLAY_FOREGROUND](figures.play) +
        ' ' +
        chalk.white('Really close all trades?') +
        ' ' +
        chalk.yellow(`Press ${chalk.white('Y')} to confirm`)
    )
    this.screen.render()
  }

  renderData (chart, mode) {
    switch (mode) {
      case 1: {
        const candles = chart.candles.slice().reverse()
        const data = candles.reduce((data, candle) => {
          const date = `${format(candle.time, 'dd-MMM h:mma')}${!candle.isFinal ? ' LIVE' : ''}`
          data.push(
            Object.keys(candle.indicators).length
              ? {
                  time: date,
                  close: candle.close,
                  indicators: candle.indicators
                }
              : {
                  time: date,
                  close: candle.close
                }
          )
          return data
        }, [])
        this.display.setContent(pretty(data, 2))
        break
      }
      case 2: {
        const candles = chart.candles.slice().reverse()
        const data = candles.reduce((data, candle) => {
          const { time, isFinal, indicators, ...rest } = candle
          const date = `${format(candle.time, 'dd-MMM h:mma')}${!isFinal ? ' LIVE' : ''}`
          data.push(
            Object.keys(indicators).length
              ? {
                  time: date,
                  ...rest,
                  indicators
                }
              : {
                  time: date,
                  ...rest
                }
          )
          return data
        }, [])
        this.display.setContent(pretty(data, 2))
        break
      }
      case 3: {
        const { orderTypes, ...rest } = chart.info
        const data = chart.config.strategies ? Object.assign({}, { strategies: chart.config.strategies }, rest) : rest
        this.display.setContent(pretty(data, 2))
        break
      }
    }
    this.screen.render()
  }

  renderFunds (funds) {
    if (funds) {
      const estimatedValue = Object.keys(funds).reduce((estimatedValue, asset) => {
        if (funds[asset].dollars) {
          return estimatedValue + funds[asset].dollars
        }
        return estimatedValue
      }, 0)
      this.display.setContent(
        `${chalk[colors.FUNDS_TITLE](`Estimated value: ${formatMoney(estimatedValue, { precision: 3 })}`)}\n` +
          Object.keys(funds)
            .sort()
            .map(
              asset =>
                `${chalk[colors.FUNDS_ASSET](asset)} ${chalk[colors.FUNDS_AVAILABLE](funds[asset].available)}${
                  funds[asset].onOrder > 0 ? ' ' + chalk[colors.FUNDS_ORDER](funds[asset].onOrder) : ''
                }${funds[asset].dollars > 0 ? ' ' + chalk[colors.FUNDS_DOLLARS](formatMoney(funds[asset].dollars, { precision: 3 })) : ''}`
            )
            .join('\n')
      )
      this.screen.render()
    }
  }

  renderLogs (logs) {
    if (logs.length) {
      this.display.setContent(logs.map(log => log.toString(true)).join('\n'))
      this.screen.render()
    }
  }

  renderQuit () {
    this.display.setContent(
      chalk[colors.DISPLAY_FOREGROUND](figures.play) + ' ' + chalk.white('Really quit?') + ' ' + chalk.yellow(`Press ${chalk.white('Y')} to confirm`)
    )
    this.screen.render()
  }

  renderTrade (trade) {
    if (trade) {
      const { advisorId, buy, chartId, info, log, refresh, sell, stop, target, timer, updateFunds, ...rest } = trade
      const timeRemaining = trade.timeToLive ? new Date(trade.orders[0].date.getTime() + trade.timeToLive) - new Date() : 0
      this.display.setContent(
        chalk[trade.isOpen ? 'yellow' : 'white'](
          pretty(
            timeRemaining > 0
              ? {
                  ...rest,
                  timeRemaining: millisecondsToTime(timeRemaining)
                }
              : rest,
            2
          )
        )
      )
      this.screen.render()
    }
  }

  renderTrades (trades) {
    if (trades.length) {
      this.display.setContent(trades.map(trade => trade.toString()).join('\n'))
      this.screen.render()
    }
  }
}

module.exports = UI

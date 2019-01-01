const asciichart = require('asciichart')
const babar = require('babar')
const blessed = require('blessed')
const chalk = require('chalk')
const figures = require('figures')
const stripAnsi = require('strip-ansi')
const { debounce } = require('rxjs/operators')
const { format } = require('date-fns')
const { formatMoney } = require('accounting-js')
const { fromEvent, timer } = require('rxjs')
const { pretty } = require('js-object-pretty-print')

const colors = {
  CHART_BORDER: 'yellow',
  CHART_DRAWING: 'gray',
  CHART_PRICE: 'gray',
  CHART_PRICE_DOWN: 'magenta',
  CHART_PRICE_NEW_CANDLE: 'white',
  CHART_PRICE_OPEN: 'blue',
  CHART_PRICE_UP: 'cyan',
  CHART_TITLE: 'white',
  CHART_VOLUME_DOWN: ['red', 'bgRed'],
  CHART_VOLUME_NUMBER: 'yellow',
  CHART_VOLUME_NUMBER_DOTS: 'gray',
  CHART_VOLUME_OPEN: ['white', 'bgWhite'],
  CHART_VOLUME_UP: ['green', 'bgGreen'],
  DISPLAY_BACKGROUND: 'black',
  DISPLAY_FOREGROUND: 'magenta',
  FOOTER_BACKGROUND: 'gray',
  FOOTER_FOREGROUND: 'black',
  FOOTER_OPTION: 'white',
  FOOTER_OPTION_ARROW: 'yellow',
  FOOTER_OPTION_KEY: 'cyan',
  FUNDS_ASSET: 'yellow',
  FUNDS_AVAILABLE: 'gray',
  FUNDS_DOLLAR: 'green',
  FUNDS_ORDER: 'magenta',
  FUNDS_TITLE: 'white',
  LOGGER_BACKGROUND: 'gray',
  LOGGER_FOREGROUND: 'white',
  TRADE_PRICE: 'yellow',
  TRADE_STOP: 'red',
  TRADE_TARGET: 'green'
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
    fromEvent(this.screen, 'resize').pipe(debounce(() => timer(10))).subscribe(() => {
      this.drawLogger()
      config.handleResize()
    })
    this.screen.render()
    Object.keys(config.bindings).map((key) => this.screen.key(key, config.bindings[key]))
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
      content: `${chalk[colors.FOOTER_OPTION_KEY]('a')}${chalk[colors.FOOTER_OPTION]('dvisors')}  ${chalk[colors.FOOTER_OPTION_KEY]('x')} ${chalk[colors.FOOTER_OPTION_ARROW]('<<')} ${chalk[colors.FOOTER_OPTION]('charts')} ${chalk[colors.FOOTER_OPTION_ARROW]('>>')} ${chalk[colors.FOOTER_OPTION_KEY]('c')}  ${chalk[colors.FOOTER_OPTION_KEY]('d')}${chalk[colors.FOOTER_OPTION]('ata')}  ${chalk[colors.FOOTER_OPTION_KEY]('f')}${chalk[colors.FOOTER_OPTION]('unds')}  ${chalk[colors.FOOTER_OPTION_KEY]('l')}${chalk[colors.FOOTER_OPTION]('ogs')}  ${chalk[colors.FOOTER_OPTION_KEY]('t')}${chalk[colors.FOOTER_OPTION]('rades')}  ${chalk[colors.FOOTER_OPTION_KEY]('q')}${chalk[colors.FOOTER_OPTION]('uit')}`,
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
    this.logger.setContent(this.logs.map((log) => ` ${log}`).join('\n'))
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
    const { tickSize } = chart.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
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
    const plot = stripAnsi(asciichart.plot(candles.map((candle) => candle.close), {
      format: (close) => close.toFixed(decimalPlaces),
      height: hasVolume ? Math.ceil(this.screen.rows * 0.6) - 2 : Math.ceil(this.screen.rows * 0.8) - 2
    })).split('\n')
    const tradeNumbers = {}
    if (trade) {
      const prices = plot.reduce((prices, line) => {
        const split = line.split(line.includes(String.fromCharCode(9508)) ? String.fromCharCode(9508) : String.fromCharCode(9532))
        if (split.length === 2) {
          prices.push(split[0].trim())
        }
        return prices
      }, [])
      const distancesPrice = prices.map((price) => Math.abs(price - trade.price))
      const indexPrice = distancesPrice.indexOf(Math.min(...distancesPrice))
      if (indexPrice !== 0 && indexPrice !== prices.length - 1) {
        tradeNumbers[indexPrice] = {
          tradePrice: chalk[colors.TRADE_PRICE](trade.price.toFixed(decimalPlaces))
        }
      }
      const distancesStopPrice = prices.map((price) => Math.abs(price - trade.stopPrice))
      const indexStopPrice = distancesStopPrice.indexOf(Math.min(...distancesStopPrice))
      if (indexStopPrice !== 0 && indexStopPrice !== prices.length - 1) {
        tradeNumbers[indexStopPrice] = chalk[colors.TRADE_STOP](trade.stopPrice.toFixed(decimalPlaces))
      }
      const distancesTargetPrice = prices.map((price) => Math.abs(price - trade.targetPrice))
      const indexTargetPrice = distancesTargetPrice.indexOf(Math.min(...distancesTargetPrice))
      if (indexTargetPrice !== 0 && indexTargetPrice !== prices.length - 1) {
        tradeNumbers[indexTargetPrice] = chalk[colors.TRADE_TARGET](trade.targetPrice.toFixed(decimalPlaces))
      }
    }
    const plotStyled = plot.reduce((plotStyled, line, index) => {
      const split = line.split(line.includes(String.fromCharCode(9508)) ? String.fromCharCode(9508) : String.fromCharCode(9532))
      if (split.length === 2) {
        const price = split[0].trim()
        let drawing = chalk[colors.CHART_DRAWING](split[1].slice(0, -1))
        const isQuote = String.fromCharCode(9472, 9581, 9584).includes(stripAnsi(drawing).slice(-1))
        if (!plotStyled.length) {
          chartLength = stripAnsi(drawing).length
          const title = chalk[colors.CHART_TITLE](`${advisor.name} - ${chart.name}`) + (trade ? ' ' + trade.toString(false, false) : '')
          if (chartLength > stripAnsi(title).length) {
            drawing = `${title} ${chalk[colors.CHART_DRAWING](stripAnsi(drawing).slice(stripAnsi(title).length + 1))}`
          }
        }
        plotStyled.push(`${drawing}${chalk[colors.CHART_BORDER](String.fromCharCode(9474))}${trade && tradeNumbers[index] && tradeNumbers[index].tradePrice ? (trade.isLong ? chalk.cyan(figures.arrowUp) : chalk.magenta(figures.arrowDown)) : ' '}${isQuote ? chalk[quoteColor](quote.toFixed(decimalPlaces)) : ((tradeNumbers[index] && tradeNumbers[index].tradePrice) || tradeNumbers[index] || chalk[colors.CHART_PRICE](price))}`)
        return plotStyled
      }
    }, []).join('\n')
    if (hasVolume) {
      const volume = stripAnsi(babar(candles.map((candle, index) => [index, candle.volume]), {
        height: Math.ceil(this.screen.rows * 0.8) - plot.length,
        width: this.screen.cols,
        yFractions: 0
      })).split('\n')
      const volumeStyled = volume.reduce((volumeStyled, line) => {
        if (line.includes(String.fromCharCode(95)) || line.includes(String.fromCharCode(9604))) {
          const matches = /\s*(\d+)\s{1}(.*)/.exec(line)
          if (matches && matches.length === 3) {
            const number = matches[1].trim()
            let drawing = ''
            const offset = matches[2].length - chartLength
            if (offset >= 0) {
              matches[2] = matches[2].slice(offset)
            } else {
              matches[2] = `${new Array(Math.abs(offset) + 1).join(String.fromCharCode(95))}${matches[2]}`
            }
            matches[2].split('').map((character, index) => {
              if (candles[index + 1]) {
                let bgColor = colors.CHART_VOLUME_OPEN[1]
                let color = colors.CHART_VOLUME_OPEN[0]
                if (candles[index + 1].close > candles[index + 1].open) {
                  bgColor = colors.CHART_VOLUME_UP[1]
                  color = colors.CHART_VOLUME_UP[0]
                } else if (candles[index + 1].close < candles[index + 1].open) {
                  bgColor = colors.CHART_VOLUME_DOWN[1]
                  color = colors.CHART_VOLUME_DOWN[0]
                }
                const code = matches[2].charCodeAt(index)
                switch (code) {
                  case 32: {
                    drawing += chalk[bgColor](' ')
                    break
                  }
                  case 95: {
                    drawing += (volumeStyled.length ? ' ' : chalk[colors.CHART_BORDER](String.fromCharCode(9472)))
                    break
                  }
                  default: {
                    drawing += chalk[color](String.fromCharCode(code))
                  }
                }
              }
            })
            volumeStyled.push(`${drawing}${chalk[colors.CHART_BORDER](volumeStyled.length ? String.fromCharCode(9474) : String.fromCharCode(9508))} ${chalk[colors.CHART_VOLUME_NUMBER](number) + chalk[colors.CHART_VOLUME_NUMBER_DOTS](''.padStart(quote.toString().split('.')[0].length + decimalPlaces - number.length + 1, String.fromCharCode(183)))}`)
          }
        }
        return volumeStyled
      }, []).join('\n')
      this.display.setContent([plotStyled, volumeStyled].join('\n'))
    } else {
      this.display.setContent(plotStyled)
    }
    this.screen.render()
  }

  renderData (chart, mode) {
    if ([1, 2, 3].includes(mode)) {
      let data = []
      const candles = chart.candles.slice().reverse()
      switch (mode) {
        case 1: {
          data = candles.reduce((data, candle) => {
            const date = `${format(candle.time, 'DD-MMM h:mma')}${!candle.isFinal ? ' LIVE' : ''}`
            data.push(Object.keys(candle.indicators).length ? {
              time: date,
              close: candle.close,
              indicators: candle.indicators
            } : {
              time: date,
              close: candle.close
            })
            return data
          }, [])
          break
        }
        case 2: {
          data = candles.reduce((data, candle) => {
            const { time, isFinal, indicators, ...rest } = candle
            const date = `${format(candle.time, 'DD-MMM h:mma')}${!isFinal ? ' LIVE' : ''}`
            data.push(Object.keys(indicators).length ? {
              time: date,
              ...rest,
              indicators
            } : {
              time: date,
              ...rest
            })
            return data
          }, [])
          break
        }
        case 3: {
          data = chart.config.strategies ? Object.assign({}, { strategies: chart.config.strategies }, chart.info) : chart.info
          break
        }
      }
      if (data.length) {
        this.display.setContent(pretty(data, 2))
        this.screen.render()
      }
    }
  }

  renderFunds (funds) {
    if (funds) {
      const estimatedValue = Object.keys(funds).reduce((estimatedValue, asset) => {
        if (funds[asset].dollarPrice) {
          return estimatedValue + funds[asset].dollarPrice
        }
        return estimatedValue
      }, 0)
      this.display.setContent(`${chalk[colors.FUNDS_TITLE](`Estimated value: ${formatMoney(estimatedValue, { precision: 3 })}`)}\n` + Object.keys(funds).sort().map((asset) => `${chalk[colors.FUNDS_ASSET](asset)} ${chalk[colors.FUNDS_AVAILABLE](funds[asset].available)}${funds[asset].onOrder > 0 ? ' ' + chalk[colors.FUNDS_ORDER](funds[asset].onOrder) : ''}${funds[asset].dollarPrice > 0 ? ' ' + chalk[colors.FUNDS_DOLLAR](formatMoney(funds[asset].dollarPrice, { precision: 3 })) : ''}`).join('\n'))
      this.screen.render()
    }
  }

  renderLogs (logs) {
    if (logs.length) {
      this.display.setContent(logs.map((log) => log.toString(true)).join('\n'))
      this.screen.render()
    }
  }

  renderQuit () {
    this.display.setContent(chalk.magenta(figures.play) + ' ' + chalk.white('Really quit?') + ' ' + chalk.gray(`Press ${chalk.yellow('Y')} to confirm`))
    this.screen.render()
  }

  renderTrade (trade) {
    if (trade) {
      const { advisorId, buy, chartId, info, log, sell, show, updateFunds, stop, target, ...rest } = trade
      this.display.setContent(chalk[trade.isOpen ? 'yellow' : 'gray'](pretty(rest, 2)))
      this.screen.render()
    }
  }

  renderTrades (trades) {
    if (trades.length) {
      this.display.setContent(trades.map((trade) => trade.toString()).join('\n'))
      this.screen.render()
    }
  }
}

module.exports = UI

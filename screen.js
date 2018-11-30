const asciichart = require('asciichart')
const blessed = require('blessed')
const chalk = require('chalk')
const debounce = require('debounce')
const { format } = require('date-fns')
const { pretty } = require('js-object-pretty-print')

class Screen {
  constructor (config) {
    this.bufferLength = 50
    this.logs = []
    this.screen = blessed.screen({ smartCSR: true })
    this.screen.title = config.title
    this.appendLogger()
    this.appendDisplay()
    this.appendFooter(config.getEstimatedValue)
    this.screen.on('resize', debounce(() => {
      this.drawLogger()
      config.handleResize()
    }, 10))
    this.screen.render()
    Object.keys(config.bindings).map((key) => this.screen.key(key, config.bindings[key]))
  }

  appendDisplay () {
    this.display = blessed.box({
      height: '80%',
      style: {
        fg: 'gray'
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
        bg: 'gray',
        fg: 'black'
      },
      top: '99%',
      width: '50%'
    })
    this.footerLeft.on('mouseover', () => {
      const estimatedValue = getEstimatedValue()
      if (parseFloat(estimatedValue) > 0) {
        this.footerLeft.setContent(` Estimated value: ${chalk.white('$' + Math.round(estimatedValue * 100) / 100)}`)
        this.screen.render()
        setTimeout(() => {
          this.footerLeft.setContent(` ${this.screen.title}`)
          this.screen.render()
        }, 3000)
      }
    })
    this.footerRight = blessed.box({
      content: `${chalk.cyan('a')}dvisors  ${chalk.cyan('x')} ${chalk.yellow('<<')} charts ${chalk.yellow('>>')} ${chalk.cyan('c')}  ${chalk.cyan('d')}ata  ${chalk.cyan('f')}unds  ${chalk.cyan('l')}ast  ${chalk.cyan('q')}uit`,
      height: 'shrink',
      left: '50%',
      style: {
        bg: 'gray',
        fg: 'white'
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
        bg: 'gray',
        fg: 'white'
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

  renderChart (chart, advisor) {
    const closes = chart.candles.map((candle) => candle.close)
    const lines = []
    const trades = Object.keys(advisor.trades).reduce((trades, orderId) => {
      const trade = advisor.trades[orderId]
      if (trade.chartId === chart.id) {
        trades.push(trade)
      }
      return trades
    }, [])
    const { direction = '', close: quote } = chart.candles[chart.candles.length - 1]
    const { tickSize } = chart.info.filters.find((filter) => filter.filterType === 'PRICE_FILTER')
    let quoteColor = 'white'
    if (direction.length) {
      switch (direction) {
        case 'd': {
          quoteColor = 'magenta'
          break
        }
        case 'o': {
          quoteColor = 'gray'
          break
        }
        case 'u': {
          quoteColor = 'cyan'
          break
        }
      }
    }
    const decimalPlaces = tickSize.replace(/0+$/, '').split('.')[1].length + 1
    const format = (close) => close.toFixed(decimalPlaces)
    asciichart.plot(closes.slice(Math.max(closes.length - this.screen.cols + quote.toString().split('.')[0].length + decimalPlaces + 3, 0)), { format, height: Math.ceil(this.screen.rows * 0.8) - 2 }).split('\n').map((line) => {
      const split = line.split(line.indexOf('┤') > -1 ? '┤' : '┼')
      if (split.length === 2) {
        const drawing = split[1].slice(0, -1).padStart(this.screen.cols)
        lines.push({
          drawing,
          value: {
            color: ['─', '╭', '╰'].includes(drawing.slice(-1)) ? quoteColor : 'blue',
            string: ['─', '╭', '╰'].includes(drawing.slice(-1)) ? quote.toFixed(decimalPlaces) : split[0].trim()
          }
        })
      }
    })
    const chartName = `${advisor.name} - ${chart.name}`
    lines[0].drawing = lines[0].drawing.slice(0, lines[0].value.string.length + 3) + chartName + lines[0].drawing.slice(chartName.length + lines[0].value.string.length + 3)
    const values = lines.map((line) => parseFloat(line.value.string))
    const prices = trades.reduce((prices, trade) => {
      prices.push(trade.price)
      return prices
    }, [])
    prices.map((price) => {
      const distances = values.map((value) => Math.abs(value - price))
      const index = distances.indexOf(Math.min(...distances))
      if (index !== 0 && index !== distances.length - 1) {
        lines[index].value.color = 'yellow'
        lines[index].value.string = price.toFixed(decimalPlaces)
      }
    })
    const stops = trades.reduce((stops, trade) => {
      if (trade.stopPrice) {
        stops.push(trade.stopPrice)
      }
      return stops
    }, [])
    stops.map((stop) => {
      const distances = values.map((value) => Math.abs(value - stop))
      const index = distances.indexOf(Math.min(...distances))
      if (index !== 0 && index !== distances.length - 1) {
        lines[index].value.color = 'red'
        lines[index].value.string = stop.toFixed(decimalPlaces)
      }
    })
    const targets = trades.reduce((targets, trade) => {
      if (trade.targetPrice) {
        targets.push(trade.targetPrice)
      }
      return targets
    }, [])
    targets.map((target) => {
      const distances = values.map((value) => Math.abs(value - target))
      const index = distances.indexOf(Math.min(...distances))
      if (index !== 0 && index !== distances.length - 1) {
        lines[index].value.color = 'green'
        lines[index].value.string = target.toFixed(decimalPlaces)
      }
    })
    this.display.setContent(lines.map(({ drawing, value }) => `${drawing.slice(value.string.length + 3 - this.screen.cols)}${chalk.blue('├ ')}${chalk[value.color](value.string)}`).join('\n'))
    this.screen.render()
  }

  renderData (chart, mode) {
    if ([1, 2, 3].includes(mode)) {
      let data
      const candles = chart.candles.slice().reverse()
      switch (mode) {
        case 1: {
          data = candles.reduce((data, candle) => {
            data.push(Object.keys(candle.indicators).length ? {
              time: format(candle.time, 'DD/MM h:mma'),
              close: candle.close,
              indicators: candle.indicators
            } : {
              time: format(candle.time, 'DD/MM h:mma'),
              close: candle.close
            })
            return data
          }, [])
          break
        }
        case 2: {
          data = candles.reduce((data, candle) => {
            let { time, isFinal, direction, indicators, ...rest } = candle
            data.push(Object.keys(indicators).length ? {
              time: format(candle.time, 'DD/MM h:mma'),
              ...rest,
              indicators
            } : {
              time: format(candle.time, 'DD/MM h:mma'),
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
      this.display.setContent(pretty(data, 2))
      this.screen.render()
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
      this.display.setContent('Estimated value: ' + chalk.green(`$${Math.round(estimatedValue * 100) / 100}`) + '\n' + Object.keys(funds).sort().map((asset) => `${chalk.yellow(asset)} ${funds[asset].available}${parseFloat(funds[asset].onOrder) > 0 ? ' ' + chalk.yellow(funds[asset].onOrder) : ''}${parseFloat(funds[asset].dollarPrice) > 0 ? ' ' + chalk.green(`$${Math.round(funds[asset].dollarPrice * 100) / 100}`) : ''}`).join('\n'))
      this.screen.render()
    }
  }
}

module.exports = Screen

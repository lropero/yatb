const beep = require('beepbeep')
const chalk = require('chalk')
const figures = require('figures')
const sfx = require('sfx')
const { format } = require('date-fns')

const { errorToString } = require('../helpers')

class Log {
  constructor (event) {
    const isError = event instanceof Error
    this.date = new Date()
    this.level = isError ? 'error' : event.level
    this.message = isError ? errorToString(event) : event.message
    if (isError) {
      this.stack = event.stack
    }
    switch (this.level) {
      case 'close': {
        sfx.play('submarine')
        break
      }
      case 'error': {
        beep()
        break
      }
      case 'long':
      case 'short': {
        sfx.play('pop')
        break
      }
      case 'stop': {
        sfx.play('basso')
        break
      }
      case 'target': {
        sfx.play('tink')
        break
      }
    }
  }

  toString (avoidBlack = false) {
    const getIcon = (level) => {
      switch (level) {
        case 'close': return chalk.yellow(figures.play)
        case 'error': return chalk.red(figures.bullet)
        case 'info': return chalk.white(figures.bullet)
        case 'long': return chalk.cyan(figures.arrowUp)
        case 'short': return chalk.magenta(figures.arrowDown)
        case 'silent': return chalk.gray(figures.bullet)
        case 'stop': return chalk.red(figures.play)
        case 'success': return chalk.green(figures.bullet)
        case 'target': return chalk.green(figures.play)
        case 'warning': return chalk.yellow(figures.bullet)
      }
    }
    return `${getIcon(this.level)} ${chalk[avoidBlack ? 'gray' : 'black'](format(this.date, 'DD-MMM-YY HH:mm:ss'))} ${chalk.white(this.message)}`
  }
}

module.exports = Log

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
      case 'closeExpire':
      case 'closeSignal': {
        sfx.play('submarine')
        break
      }
      case 'closeStop': {
        Math.floor(Math.random() * 100) > 0 ? sfx.play('basso') : sfx.say('Poponga la monga sorongo y pepeganga')
        break
      }
      case 'closeTarget': {
        Math.floor(Math.random() * 100) > 0 ? sfx.play('tink') : sfx.say('Pim pum pim pum pim pum dum dee dum')
        break
      }
      case 'error': {
        beep()
        break
      }
      case 'long': {
        Math.floor(Math.random() * 100) > 0 ? sfx.play('pop') : sfx.say('che boludo, metí un largo')
        break
      }
      case 'short': {
        Math.floor(Math.random() * 100) > 0 ? sfx.play('pop') : sfx.say('che boludo, metí un corto')
        break
      }
    }
  }

  toString (avoidBlack = false) {
    const getIcon = (level) => {
      switch (level) {
        case 'closeExpire': return chalk.blue(figures.play)
        case 'closeSignal': return chalk.yellow(figures.play)
        case 'closeStop': return chalk.red(figures.play)
        case 'closeTarget': return chalk.green(figures.play)
        case 'error': return chalk.red(figures.bullet)
        case 'info': return chalk.white(figures.bullet)
        case 'long': return chalk.cyan(figures.arrowUp)
        case 'short': return chalk.magenta(figures.arrowDown)
        case 'silent': return chalk.gray(figures.bullet)
        case 'success': return chalk.green(figures.bullet)
        case 'warning': return chalk.yellow(figures.bullet)
      }
    }
    let message = this.message
    if (this.level === 'long' || this.level === 'short') {
      message = message.replace(/(.*)#avoidBlack(.*)#/g, (message, string, who) => string + (avoidBlack ? chalk.gray(who) : chalk.black(who)))
    }
    return `${getIcon(this.level)} ${chalk[avoidBlack ? 'gray' : 'black'](format(this.date, 'DD-MMM-YY HH:mm:ss'))} ${chalk.white(message)}`
  }
}

module.exports = Log
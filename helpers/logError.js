const chalk = require('chalk')

function logError (string, exit = false) {
  console.log(`${chalk.bgRed('[Error]')} ${chalk.red(string + (exit ? '; exiting' : ''))}`)
  if (exit) {
    process.exit()
  }
}

module.exports = logError

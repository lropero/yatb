const chalk = require('chalk')

function logError (string) {
  console.log(`${chalk.bgRed('[Error]')} ${chalk.red(string)}`)
}

module.exports = logError

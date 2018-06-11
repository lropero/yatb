const chalk = require('chalk')

function logError (string) {
  console.log(`${chalk.bgRed('[Error]')} ${chalk.red(string.replace(new RegExp('Error: ', 'g'), ''))}`)
}

module.exports = logError

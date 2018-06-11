const chalk = require('chalk')

function logWarning (string) {
  console.log(`${chalk.bgYellow('[Warning]')} ${chalk.yellow(string.replace(new RegExp('Error: ', 'g'), ''))}`)
}

module.exports = logWarning

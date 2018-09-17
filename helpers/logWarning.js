const chalk = require('chalk')

function logWarning (string) {
  console.log(`${chalk.bgYellow('[Warning]')} ${chalk.yellow(string)}`)
}

module.exports = logWarning

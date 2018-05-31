const chalk = require('chalk')

function logSuccess (string) {
  console.log(`${chalk.bgGreen('[Success]')} ${chalk.green(string)}`)
}

module.exports = logSuccess

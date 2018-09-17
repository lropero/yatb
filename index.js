const chalk = require('chalk')

const Bot = require('./bot')
const { advisors = [], provider = {}, serverPort = 7007 } = require('./config')
const { version } = require('./package.json')

console.log(chalk.yellow(`CryptoBot v${version}`))
const bot = new Bot(serverPort, provider, advisors) // eslint-disable-line no-unused-vars

const Bot = require('./bot')
const chalk = require('chalk')
const { providers } = require('./config')
const { version } = require('./package.json')

console.log(chalk.green(`CryptoBot v${version}`))
const bot = new Bot()

Object.keys(providers).forEach((providerName) => {
  const providerConfig = providers[providerName]
  bot.addProvider(providerName, providerConfig)
})

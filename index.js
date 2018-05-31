const chalk = require('chalk')

const Bot = require('./bot')
const { advisors, providers } = require('./config')
const { version } = require('./package.json')

console.log(chalk.yellow(`CryptoBot v${version}`))

const bot = new Bot()

Object.keys(providers).forEach((providerName) => {
  const providerConfig = providers[providerName]
  bot.addProvider(providerName, providerConfig)
})

advisors.forEach((advisorName) => {
  bot.addAdvisor(advisorName)
})

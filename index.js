const commander = require('commander')

const Bot = require('./classes/bot')
const config = require('./config')

const run = options => {
  const bot = new Bot(Object.assign({}, config, { options })) // eslint-disable-line no-unused-vars
}

commander
  .option('-c, --console', 'run in console mode')
  .option('-r, --real', 'enable real mode')
  .parse(process.argv)

run({
  console: !!commander.console,
  real: !!commander.real
})

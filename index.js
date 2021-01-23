const { program } = require('commander')

const Bot = require('./classes/bot')
const config = require('./config')

const run = options => {
  const bot = new Bot(Object.assign({}, config, { options })) // eslint-disable-line no-unused-vars
}

program
  .option('-c, --console', 'run in console mode')
  .option('-r, --real', 'enable real mode')
  .parse(process.argv)

const options = program.opts()

run({
  console: !!options.console,
  real: !!options.real
})

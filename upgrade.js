#!/usr/bin/env node
const chalk = require('chalk')
const { execSync } = require('child_process')

const _package = require('./package.json')

const options = {
  dependencies: '',
  devDependencies: ' --dev',
  peerDependencies: ' --peer'
}

console.log(chalk.yellow('Starting upgrade...'))
for (let element of ['dependencies', 'devDependencies', 'peerDependencies']) {
  let first = true
  if (_package[element]) {
    const option = options[element]
    const packages = Object.keys(_package[element])
    for (let pckg of packages) {
      try {
        const current = _package[element][pckg].replace(/[\^~]/, '').trim()
        const latest = execSync(`yarn info ${pckg} version`, { stdio: [] }).toString().trim()
        if (current !== latest) {
          if (first) {
            console.log(chalk.yellow(`Upgrading ${element}`))
            first = false
          }
          execSync(`yarn remove ${pckg} && yarn add${option} ${pckg}`, { stdio: [] })
          console.log(`${chalk.blue(pckg)} ${chalk.green('✔')} ${current + chalk.yellow(' ➡ ') + latest}`)
        }
      } catch (e) {
        console.log(`${chalk.blue(pckg)} ${chalk.red('✘')} ${chalk.yellow(e)}`)
      }
    }
  }
}

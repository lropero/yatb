const { logSuccess } = require('../helpers')

class Advisor {
  constructor (advisorName, bot) {
    this.bot = bot
    this.name = advisorName

    logSuccess(`Advisor ${this.name} running`)
  }
}

module.exports = Advisor

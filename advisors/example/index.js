const { charts: configCharts } = require('./config')

class Advisor {
  constructor (name, charts, bot) {
    this.name = name
    this.charts = charts
    this.bot = bot
  }

  static init (name, bot) {
    return new Promise(async (resolve, reject) => {
      try {
        const charts = (await Promise.all(bot.requestCharts(configCharts))).filter((chart) => chart)
        if (charts.length !== configCharts.length) {
          throw new Error('Charts not loaded properly')
        }
        return resolve(new Advisor(name, charts, bot))
      } catch (error) {
        return reject(error)
      }
    })
  }
}

module.exports = Advisor

const { charts: configCharts } = require('./config')

class Advisor {
  constructor (name, chartIds, bot) {
    this.name = name
    this.chartIds = chartIds
    this.bot = bot
  }

  analyze (chartId) {
    if (this.chartIds.includes(chartId)) {
      // const chart = this.bot.charts[chartId]
    }
  }

  static init (name, bot) {
    return new Promise(async (resolve, reject) => {
      try {
        const chartIds = await bot.requestCharts(configCharts)
        return resolve(new Advisor(name, chartIds, bot))
      } catch (error) {
        return reject(error)
      }
    })
  }
}

module.exports = Advisor

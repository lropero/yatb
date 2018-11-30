/*
 * Bollinger Bands Strategy
 * (good for lateral non-trending markets)
 */
const config = require('./config')

class Strategy {
  static analyze (candles) {
    return new Promise((resolve, reject) => {
      if (candles.length < 2) {
        return resolve()
      }
      const { indicators: { bands } } = candles[0]
      const { indicators: { bands: prevBands } } = candles[1]
      if (candles[0].close < bands.bbands_lower && candles[1].close > prevBands.bbands_lower) {
        return resolve('LONG')
      }
      if (candles[0].close > bands.bbands_upper && candles[1].close < prevBands.bbands_upper) {
        return resolve('SHORT')
      }
      return resolve()
    })
  }

  static getConfig () {
    return config
  }
}

module.exports = Strategy

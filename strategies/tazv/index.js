/*
 * Traders Action Zone Strategy (with a volume twist)
 * http://www.swing-trade-stocks.com/traders-action-zone.html
 * (good for trending-up markets, like Taz but more conservative)
 */
const config = require('./config')

class Strategy {
  static analyze (candles) {
    return new Promise((resolve, reject) => {
      if (candles.length < 3) {
        return resolve()
      }
      const { indicators: { slow10, expo30 } } = candles[0]
      const { indicators: { slow10: prevSlow10, expo30: prevExpo30 } } = candles[1]
      if (slow10.sma > expo30.ema) { // Market is trending up
        if (candles[0].close > expo30.ema && candles[0].close < slow10.sma) { // Price is in the zone
          if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
            return resolve('LONG')
          }
        }
      } else if (prevSlow10.sma > prevExpo30.ema) { // Market stopped trending up
        return resolve('CLOSE')
      }
      if (slow10.sma < expo30.ema) { // Market is trending down
        if (candles[0].close < expo30.ema && candles[0].close > slow10.sma) { // Price is in the zone
          if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
            return resolve('SHORT')
          }
        }
      } else if (prevSlow10.sma < prevExpo30.ema) { // Market stopped trending down
        return resolve('CLOSE')
      }
      return resolve()
    })
  }

  static getConfig () {
    return config
  }
}

module.exports = Strategy

/*
 * Traders Action Zone Strategy
 * http://www.swing-trade-stocks.com/traders-action-zone.html
 * (good for trending-up markets)
 */
const config = require('./config')

class Strategy {
  static analyze (candles, isFinal) {
    return new Promise((resolve, reject) => {
      if (candles.length < 2) {
        return resolve()
      }
      const { indicators: { fast30, slow10 } } = candles[0]
      const { indicators: { fast30: prevFast30, slow10: prevSlow10 } } = candles[1]
      if (slow10.sma > fast30.ema) { // Market is trending up
        if (isFinal) { // Last candle is final
          if (candles[0].close > fast30.ema && candles[0].close < slow10.sma) { // Price is in the zone
            if (candles[1].close > prevSlow10.sma) { // Previous price wasn't
              return resolve('LONG')
            }
          }
        }
      } else if (prevSlow10.sma > prevFast30.ema) { // Market stopped trending up
        return resolve('CLOSE LONG')
      }
      if (slow10.sma < fast30.ema) { // Market is trending down
        if (isFinal) { // Last candle is final
          if (candles[0].close < fast30.ema && candles[0].close > slow10.sma) { // Price is in the zone
            if (candles[1].close < prevSlow10.sma) { // Previous price wasn't
              return resolve('SHORT')
            }
          }
        }
      } else if (prevSlow10.sma < prevFast30.ema) { // Market stopped trending down
        return resolve('CLOSE SHORT')
      }
      return resolve()
    })
  }

  static getConfig () {
    return config
  }
}

module.exports = Strategy

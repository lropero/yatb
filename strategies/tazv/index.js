/*
 * Traders Action Zone Strategy (with a volume twist)
 * http://www.swing-trade-stocks.com/traders-action-zone.html
 * (good for trending-up markets, like Taz but more conservative)
 */
const config = require('./config')

class Strategy {
  static analyze (candles, isFinal) {
    return new Promise((resolve, reject) => {
      const signals = []
      if (candles.length < 3) {
        return resolve(signals)
      }
      const { indicators: { fast30, slow10 } } = candles[0]
      const { indicators: { fast30: prevFast30, slow10: prevSlow10 } } = candles[1]
      if (slow10.sma > fast30.ema) { // Market is trending up
        if (isFinal) { // Last candle is final
          if (candles[0].close > fast30.ema && candles[0].close < slow10.sma) { // Price is in the zone
            if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
              signals.push('LONG')
            }
          }
        }
      } else if (prevSlow10.sma > prevFast30.ema) { // Market stopped trending up
        signals.push('CLOSE LONG')
      }
      if (slow10.sma < fast30.ema) { // Market is trending down
        if (isFinal) { // Last candle is final
          if (candles[0].close < fast30.ema && candles[0].close > slow10.sma) { // Price is in the zone
            if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
              signals.push('SHORT')
            }
          }
        }
      } else if (prevSlow10.sma < prevFast30.ema) { // Market stopped trending down
        signals.push('CLOSE SHORT')
      }
      return resolve(signals)
    })
  }

  static getConfig () {
    return config
  }
}

module.exports = Strategy

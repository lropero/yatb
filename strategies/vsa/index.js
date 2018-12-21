/*
 * Volume Spread Analysis Strategy
 * https://www.tradingsetupsreview.com/guide-volume-spread-analysis-vsa/
 */

class Strategy {
  static analyze (candles) {
    return new Promise((resolve, reject) => {
      if (candles.length < 3) {
        return resolve()
      }
      if (candles[0].close < candles[1].low && candles[1].close < candles[2].low) { // Price moving down
        if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
          if ((candles[0].close - candles[0].low) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
            return resolve('LONG')
          }
        }
      } else if (candles[0].close > candles[1].high && candles[1].close > candles[2].high) { // Price moving up
        if (candles[0].volume > candles[1].volume && candles[0].volume > candles[2].volume) { // Volume larger than previous 2 volumes
          if ((candles[0].high - candles[0].close) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
            return resolve('SHORT')
          }
        }
      }
      return resolve()
    })
  }

  static getConfig () {
    return {}
  }
}

module.exports = Strategy

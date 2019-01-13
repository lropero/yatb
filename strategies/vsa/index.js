/*
 * Volume Spread Analysis Strategy
 * https://www.tradingsetupsreview.com/guide-volume-spread-analysis-vsa/
 */

class Strategy {
  static analyze (candles, isFinal) {
    return new Promise((resolve, reject) => {
      const signals = []
      if (candles.length < 3 || !isFinal) {
        return resolve(signals)
      }
      if (candles[0].low === Math.min(...(candles.slice(0, Math.min(20, candles.length)).map((candle) => candle.low)))) { // Last candle is a local low
        if (candles[0].volume === Math.max(...(candles.slice(0, Math.min(10, candles.length)).map((candle) => candle.volume)))) { // Volume larger than previous candles
          if (candles[0].range === Math.max(...(candles.slice(0, Math.min(10, candles.length)).map((candle) => candle.range)))) { // Range larger than previous candles
            if ((candles[0].close - candles[0].low) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
              signals.push('LONG')
            }
          }
        }
      } else if (candles[0].high === Math.max(...(candles.slice(0, Math.min(20, candles.length)).map((candle) => candle.high)))) { // Last candle is a local high
        if (candles[0].volume === Math.max(...(candles.slice(0, Math.min(10, candles.length)).map((candle) => candle.volume)))) { // Volume larger than previous candles
          if (candles[0].range === Math.max(...(candles.slice(0, Math.min(10, candles.length)).map((candle) => candle.range)))) { // Range larger than previous candles
            if ((candles[0].high - candles[0].close) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
              signals.push('SHORT')
            }
          }
        }
      }
      return resolve(signals)
    })
  }

  static getConfig () {
    return {}
  }
}

module.exports = Strategy

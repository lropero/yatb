/*
 * Volume Spread Analysis Strategy
 * https://www.tradingsetupsreview.com/guide-volume-spread-analysis-vsa/
 */

class Strategy {
  static analyze (candles, isFinal) {
    return new Promise((resolve, reject) => {
      const signals = []
      if (candles.length < 50 || !isFinal) {
        return resolve(signals)
      }
      const largestRanges = candles.map((candle) => candle.range).sort((a, b) => b - a).slice(0, Math.min(100, candles.length))
      const largestVolumes = candles.map((candle) => candle.volume).sort((a, b) => b - a).slice(0, 50)
      if (candles[0].low === Math.min(...(candles.slice(0, 20).map((candle) => candle.low)))) { // Last candle is a local low
        if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) { // Volume is large
          if (candles[0].volume === Math.max(...(candles.slice(0, 10).map((candle) => candle.volume)))) { // Volume larger than previous candles
            if (candles[0].range >= largestRanges[largestRanges.length - 1]) { // Range is large
              if (candles[0].range === Math.max(...(candles.slice(0, 10).map((candle) => candle.range)))) { // Range larger than previous candles
                if ((candles[0].close - candles[0].low) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
                  signals.push('LONG')
                }
              }
            }
          }
        }
      } else if (candles[0].high === Math.max(...(candles.slice(0, 20).map((candle) => candle.high)))) { // Last candle is a local high
        if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) { // Volume is large
          if (candles[0].volume === Math.max(...(candles.slice(0, 10).map((candle) => candle.volume)))) { // Volume larger than previous candles
            if (candles[0].range >= largestRanges[largestRanges.length - 1]) { // Range is large
              if (candles[0].range === Math.max(...(candles.slice(0, 10).map((candle) => candle.range)))) { // Range larger than previous candles
                if ((candles[0].high - candles[0].close) / (candles[0].high - candles[0].low) > 0.5) { // Price rejection
                  signals.push('SHORT')
                }
              }
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

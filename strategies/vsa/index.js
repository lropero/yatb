/*
 * Volume Spread Analysis Strategy
 * https://www.tradingsetupsreview.com/guide-volume-spread-analysis-vsa/
 */

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      if (params.length !== 6) {
        return reject(new Error('Wrong number of params'))
      }
      const signals = []
      if (!candles.length || candles.length < Math.max(...params.slice(0, 5)) || !isFinal) {
        return resolve(signals)
      }
      const largestRanges = candles.map((candle) => candle.range).sort((a, b) => b - a).slice(0, params[0])
      const largestVolumes = candles.map((candle) => candle.volume).sort((a, b) => b - a).slice(0, params[1])
      if (candles[0].low === Math.min(...(candles.slice(0, params[2]).map((candle) => candle.low)))) { // Last candle is a local low
        if (candles[0].range >= largestRanges[largestRanges.length - 1]) { // Range is large
          if (candles[0].range === Math.max(...(candles.slice(0, params[3]).map((candle) => candle.range)))) { // Range larger than previous candles
            if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) { // Volume is large
              if (candles[0].volume === Math.max(...(candles.slice(0, params[4]).map((candle) => candle.volume)))) { // Volume larger than previous candles
                if ((candles[0].close - candles[0].low) / (candles[0].high - candles[0].low) >= params[5]) { // Price rejection
                  signals.push('LONG')
                }
              }
            }
          }
        }
      } else if (candles[0].high === Math.max(...(candles.slice(0, params[2]).map((candle) => candle.high)))) { // Last candle is a local high
        if (candles[0].range >= largestRanges[largestRanges.length - 1]) { // Range is large
          if (candles[0].range === Math.max(...(candles.slice(0, params[3]).map((candle) => candle.range)))) { // Range larger than previous candles
            if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) { // Volume is large
              if (candles[0].volume === Math.max(...(candles.slice(0, params[4]).map((candle) => candle.volume)))) { // Volume larger than previous candles
                if ((candles[0].high - candles[0].close) / (candles[0].high - candles[0].low) >= params[5]) { // Price rejection
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
}

module.exports = Strategy

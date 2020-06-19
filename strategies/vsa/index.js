const deepKeys = require('deep-keys')

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      // Params validation
      const paramsKeys = JSON.stringify(deepKeys(params).sort())
      if (
        paramsKeys !==
        '["periods","thresholds.largestRanges","thresholds.largestVolumes","thresholds.priceRejection","windows.localHigh","windows.localLow","windows.ranges","windows.volumes"]'
      ) {
        return reject(new Error(`Params not configured properly ${paramsKeys}`))
      } else if (params.periods < Math.max(...Object.values(params.windows))) {
        return reject(new Error('Params not configured properly'))
      } else {
        Object.values(params.thresholds)
          .map(value => parseFloat(value))
          .forEach(threshold => {
            if (!(threshold > 0) || threshold > 100) {
              return reject(new Error('Params not configured properly'))
            }
          })
      }

      const signals = []
      if (!candles.length || candles.length < params.periods || !isFinal) {
        return resolve(signals)
      }
      const largestRanges = candles
        .map(candle => candle.range)
        .sort((a, b) => b - a)
        .slice(0, Math.round((candles.length * parseFloat(params.thresholds.largestRanges)) / 100))
      const largestVolumes = candles
        .map(candle => candle.volume)
        .sort((a, b) => b - a)
        .slice(0, Math.round((candles.length * parseFloat(params.thresholds.largestVolumes)) / 100))
      if (candles[0].low === Math.min(...candles.slice(0, params.windows.localLow).map(candle => candle.low))) {
        // Last candle is a local low
        if (candles[0].range >= largestRanges[largestRanges.length - 1]) {
          // Range is large
          if (candles[0].range === Math.max(...candles.slice(0, params.windows.ranges).map(candle => candle.range))) {
            // Range larger than previous candles
            if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) {
              // Volume is large
              if (
                candles[0].volume === Math.max(...candles.slice(0, params.windows.volumes).map(candle => candle.volume))
              ) {
                // Volume larger than previous candles
                if (
                  (candles[0].close - candles[0].low) / (candles[0].high - candles[0].low) >=
                  parseFloat(params.thresholds.priceRejection) / 100
                ) {
                  // Price rejection
                  signals.push('LONG')
                }
              }
            }
          }
        }
      } else if (
        candles[0].high === Math.max(...candles.slice(0, params.windows.localHigh).map(candle => candle.high))
      ) {
        // Last candle is a local high
        if (candles[0].range >= largestRanges[largestRanges.length - 1]) {
          // Range is large
          if (candles[0].range === Math.max(...candles.slice(0, params.windows.ranges).map(candle => candle.range))) {
            // Range larger than previous candles
            if (candles[0].volume >= largestVolumes[largestVolumes.length - 1]) {
              // Volume is large
              if (
                candles[0].volume === Math.max(...candles.slice(0, params.windows.volumes).map(candle => candle.volume))
              ) {
                // Volume larger than previous candles
                if (
                  (candles[0].high - candles[0].close) / (candles[0].high - candles[0].low) >=
                  parseFloat(params.thresholds.priceRejection) / 100
                ) {
                  // Price rejection
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

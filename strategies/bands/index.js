/*
 * Bollinger Bands Strategy
 * (good for lateral non-trending markets)
 */

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      const signals = []
      if (candles.length < 2) {
        return resolve(signals)
      }
      const {
        indicators: { bands }
      } = candles[0]
      const {
        indicators: { bands: prevBands }
      } = candles[1]
      if (candles[0].close < bands.bbands_lower && candles[1].close > prevBands.bbands_lower) {
        signals.push('CLOSE SHORT')
        if (isFinal) {
          signals.push('LONG')
        }
      } else if (candles[0].close > bands.bbands_upper && candles[1].close < prevBands.bbands_upper) {
        signals.push('CLOSE LONG')
        if (isFinal) {
          signals.push('SHORT')
        }
      }
      return resolve(signals)
    })
  }

  static getConfigIndicators (paramsIndicators) {
    if (paramsIndicators.length !== 2) {
      return false
    }
    return {
      bands: {
        type: 'bbands',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators[0],
          stddev: paramsIndicators[1]
        }
      }
    }
  }
}

module.exports = Strategy

const deepKeys = require('deep-keys')

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      // Params validation
      const paramsKeys = JSON.stringify(deepKeys(params).sort())
      if (paramsKeys !== '["indicators.period","indicators.stddev","periods"]') {
        return reject(new Error(`Params not configured properly ${paramsKeys}`))
      }

      const signals = []
      if (candles.length < 2 || candles.length < params.periods) {
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

  static getParamsIndicators (paramsIndicators) {
    if (JSON.stringify(deepKeys(paramsIndicators).sort()) !== '["period","stddev"]') {
      return false
    }
    return {
      bands: {
        type: 'bbands',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators.period,
          stddev: paramsIndicators.stddev
        }
      }
    }
  }
}

module.exports = Strategy

const deepKeys = require('deep-keys')

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      // Params validation
      const paramsKeys = JSON.stringify(deepKeys(params).sort())
      if (paramsKeys !== '["indicators.ema","indicators.sma","periods","windows.volumes"]') {
        return reject(new Error(`Params not configured properly ${paramsKeys}`))
      } else if (params.periods < Math.max(...Object.values(params.windows))) {
        return reject(new Error('Params not configured properly'))
      }

      const signals = []
      if (candles.length < 2 || candles.length < params.periods) {
        return resolve(signals)
      }
      const {
        indicators: { fast, slow }
      } = candles[0]
      const {
        indicators: { fast: prevFast, slow: prevSlow }
      } = candles[1]
      if (slow.sma > fast.ema) {
        // Market is trending up
        if (isFinal) {
          // Last candle is final
          if (candles[0].close > fast.ema && candles[0].close < slow.sma) {
            // Price is in the zone
            if (
              candles[0].volume === Math.max(...candles.slice(0, params.windows.volumes).map(candle => candle.volume))
            ) {
              // Volume larger than previous candles
              signals.push('LONG')
            }
          }
        }
      } else if (prevSlow.sma > prevFast.ema) {
        // Market stopped trending up
        signals.push('CLOSE LONG')
      }
      if (slow.sma < fast.ema) {
        // Market is trending down
        if (isFinal) {
          // Last candle is final
          if (candles[0].close < fast.ema && candles[0].close > slow.sma) {
            // Price is in the zone
            if (
              candles[0].volume === Math.max(...candles.slice(0, params.windows.volumes).map(candle => candle.volume))
            ) {
              // Volume larger than previous candles
              signals.push('SHORT')
            }
          }
        }
      } else if (prevSlow.sma < prevFast.ema) {
        // Market stopped trending down
        signals.push('CLOSE SHORT')
      }
      return resolve(signals)
    })
  }

  static getParamsIndicators (paramsIndicators) {
    if (JSON.stringify(deepKeys(paramsIndicators)) !== '["ema","sma"]') {
      return false
    }
    return {
      fast: {
        type: 'ema',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators.ema
        }
      },
      slow: {
        type: 'sma',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators.sma
        }
      }
    }
  }
}

module.exports = Strategy

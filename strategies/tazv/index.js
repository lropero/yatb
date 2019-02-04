/*
 * Traders Action Zone Strategy (with a volume twist)
 * http://www.swing-trade-stocks.com/traders-action-zone.html
 * (good for trending-up markets, like Taz but more conservative)
 */

class Strategy {
  static analyze (candles, isFinal, params) {
    return new Promise((resolve, reject) => {
      if (params.length !== 1) {
        return reject(new Error('Wrong number of params'))
      }
      const signals = []
      if (candles.length < 2 || candles.length < params[0]) {
        return resolve(signals)
      }
      const { indicators: { fast, slow } } = candles[0]
      const { indicators: { fast: prevFast, slow: prevSlow } } = candles[1]
      if (slow.sma > fast.ema) { // Market is trending up
        if (isFinal) { // Last candle is final
          if (candles[0].close > fast.ema && candles[0].close < slow.sma) { // Price is in the zone
            if (candles[0].volume === Math.max(...(candles.slice(0, params[0]).map((candle) => candle.volume)))) { // Volume larger than previous candles
              signals.push('LONG')
            }
          }
        }
      } else if (prevSlow.sma > prevFast.ema) { // Market stopped trending up
        signals.push('CLOSE LONG')
      }
      if (slow.sma < fast.ema) { // Market is trending down
        if (isFinal) { // Last candle is final
          if (candles[0].close < fast.ema && candles[0].close > slow.sma) { // Price is in the zone
            if (candles[0].volume === Math.max(...(candles.slice(0, params[0]).map((candle) => candle.volume)))) { // Volume larger than previous candles
              signals.push('SHORT')
            }
          }
        }
      } else if (prevSlow.sma < prevFast.ema) { // Market stopped trending down
        signals.push('CLOSE SHORT')
      }
      return resolve(signals)
    })
  }

  static getConfigIndicators (paramsIndicators) {
    if (paramsIndicators.length !== 2) {
      return false
    }
    return {
      'fast': {
        type: 'ema',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators[0]
        }
      },
      'slow': {
        type: 'sma',
        inputs: {
          real: 'close'
        },
        options: {
          period: paramsIndicators[1]
        }
      }
    }
  }
}

module.exports = Strategy

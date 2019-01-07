module.exports = {
  indicators: {
    'fast30': {
      type: 'ema',
      inputs: {
        real: 'close'
      },
      options: {
        period: 30
      }
    },
    'slow10': {
      type: 'sma',
      inputs: {
        real: 'close'
      },
      options: {
        period: 10
      }
    }
  }
}

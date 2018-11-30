module.exports = {
  indicators: {
    'slow10': {
      type: 'sma',
      inputs: {
        real: 'close'
      },
      options: {
        period: 10
      }
    },
    'expo30': {
      type: 'ema',
      inputs: {
        real: 'close'
      },
      options: {
        period: 30
      }
    }
  }
}

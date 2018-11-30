module.exports = {
  indicators: {
    'bands': {
      type: 'bbands',
      inputs: {
        real: 'close'
      },
      options: {
        period: 10,
        stddev: 2
      }
    }
  }
}

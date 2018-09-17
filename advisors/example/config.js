module.exports = {
  charts: [
    {
      symbol: 'BTCUSDT',
      timeframe: '5m',
      periods: 100,
      indicators: [ // https://tulipindicators.org/list
        {
          name: 'macd',
          type: 'macd',
          inputs: {
            real: 'close'
          },
          options: {
            'long period': 26,
            'short period': 12,
            'signal period': 9
          }
        },
        {
          name: 'moving average',
          type: 'sma',
          inputs: {
            real: 'close'
          },
          options: {
            period: 14
          }
        },
        {
          name: 'stochastics',
          type: 'stoch',
          options: {
            '%d period': 7,
            '%k period': 14,
            '%k slowing period': 3
          }
        },
        {
          name: 'volume',
          type: 'sma',
          inputs: {
            real: 'volume'
          },
          options: {
            period: 1
          }
        }
      ]
    }
  ]
}

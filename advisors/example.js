module.exports = {
  margin: '10%',
  sights: [
    {
      symbol: 'BTCUSDT',
      timeframe: '1m',
      strategies: {
        'vsa': {
          profitTarget: '2%',
          stopLoss: '2%'
        },
        'tazv': {
          profitTarget: '1%',
          stopLoss: '1%'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '15m',
      strategies: {
        'vsa': {
          profitTarget: '3%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      strategies: {
        'vsa': {
          profitTarget: '5%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '6h'
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '1d'
    },
    {
      symbol: 'ETHBTC',
      timeframe: '3m',
      strategies: {
        'taz': {
          profitTarget: '2%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'XRPBTC',
      timeframe: '5m',
      strategies: {
        'tazv': {
          profitTarget: '2%',
          stopLoss: '2%'
        }
      }
    }
  ]
}

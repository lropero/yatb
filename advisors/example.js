module.exports = {
  margin: '30%',
  sights: [
    {
      symbol: 'BTCUSDT',
      timeframe: '1m',
      strategies: {
        'tazv': {
          profitTarget: '1%',
          stopLoss: '1%'
        },
        'vsa': {
          profitTarget: '2%',
          stopLoss: '2%',
          timeToLive: '30m'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '15m',
      strategies: {
        'tazv': {
          profitTarget: '3%',
          stopLoss: '2%'
        },
        'vsa': {
          profitTarget: '3%',
          stopLoss: '2%',
          timeToLive: '2h'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      strategies: {
        'vsa': {
          profitTarget: '5%',
          stopLoss: '2%',
          timeToLive: '4h'
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
      timeframe: '5m',
      strategies: {
        'taz': {
          profitTarget: '2%',
          stopLoss: '2%'
        },
        'vsa': {
          profitTarget: '2%',
          stopLoss: '2%',
          timeToLive: '1h'
        }
      }
    },
    {
      symbol: 'XRPBTC',
      timeframe: '3m',
      strategies: {
        'tazv': {
          profitTarget: '2%',
          stopLoss: '2%'
        }
      }
    }
  ]
}

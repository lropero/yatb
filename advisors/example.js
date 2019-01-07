module.exports = {
  margin: '50%',
  sights: [
    {
      symbol: 'BTCUSDT',
      timeframe: '1m',
      strategies: {
        'vsa': {
          profitTarget: '2%',
          stopLoss: '1%',
          timeToLive: '30m'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '5m',
      strategies: {
        'vsa': {
          profitTarget: '2%',
          stopLoss: '1%',
          timeToLive: '1h'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '15m',
      strategies: {
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
      timeframe: '6h',
      strategies: {
        'vsa': {
          profitTarget: '5%',
          stopLoss: '2%',
          timeToLive: '1d'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '1d',
      strategies: {
        'vsa': {
          profitTarget: '5%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'ETHBTC',
      timeframe: '5m',
      strategies: {
        'vsa': {
          profitTarget: '2%',
          stopLoss: '1%',
          timeToLive: '1h'
        }
      }
    }
  ]
}

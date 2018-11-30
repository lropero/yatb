module.exports = {
  margin: '10%',
  sights: [
    {
      symbol: 'BTCUSDT',
      timeframe: '1m',
      strategies: {
        'vsa': {
          profitTarget: '2%',
          stopLoss: '1%'
        }
      }
    },
    {
      symbol: 'BTCUSDT',
      timeframe: '15m',
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
      symbol: 'ADABTC',
      timeframe: '5m',
      strategies: {
        'taz': {
          profitTarget: '3%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'BCHSVBTC',
      timeframe: '5m',
      strategies: {
        'tazv': {
          profitTarget: '5%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'EOSBTC',
      timeframe: '2h',
      strategies: {
        'bands': {
          profitTarget: '8%',
          stopLoss: '3%'
        }
      }
    },
    {
      symbol: 'ETHBTC',
      timeframe: '3m',
      strategies: {
        'taz': {
          profitTarget: '3%',
          stopLoss: '2%'
        }
      }
    },
    {
      symbol: 'XLMBTC',
      timeframe: '15m',
      strategies: {
        'bands': {
          profitTarget: '5%',
          stopLoss: '2%'
        }
      }
    }
  ]
}

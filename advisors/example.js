module.exports = [
  {
    symbol: 'BTCUSDT',
    timeframe: '1m'
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '3m',
    strategies: {
      taz: {
        params: {
          periods: 100,
          indicators: {
            ema: 30,
            sma: 10
          }
        },
        trade: {
          risk: '10%',
          stopLoss: '1%',
          profitTarget: '2%',
          timeToLive: '1h'
        }
      }
    }
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '5m',
    strategies: {
      tazv: {
        params: {
          periods: 100,
          indicators: {
            ema: 30,
            sma: 10
          },
          windows: {
            volumes: 20
          }
        },
        trade: {
          risk: '10%',
          stopLoss: '1%',
          profitTarget: '1%'
        }
      },
      vsa: {
        params: {
          periods: 500,
          thresholds: {
            largestRanges: '10%',
            largestVolumes: '5%',
            priceRejection: '70%'
          },
          windows: {
            localHigh: 60,
            localLow: 60,
            ranges: 8,
            volumes: 16
          }
        },
        trade: {
          risk: '10%',
          stopLoss: '1%',
          profitTarget: '2%',
          timeToLive: '1h'
        }
      }
    }
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '15m',
    strategies: {
      vsa: {
        params: {
          periods: 500,
          thresholds: {
            largestRanges: '10%',
            largestVolumes: '5%',
            priceRejection: '60%'
          },
          windows: {
            localHigh: 32,
            localLow: 32,
            ranges: 5,
            volumes: 10
          }
        },
        trade: {
          risk: '10%',
          stopLoss: '2%',
          profitTarget: '3%',
          timeToLive: '2h'
        }
      }
    }
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '1h',
    strategies: {
      vsa: {
        params: {
          periods: 500,
          thresholds: {
            largestRanges: '10%',
            largestVolumes: '5%',
            priceRejection: '60%'
          },
          windows: {
            localHigh: 12,
            localLow: 12,
            ranges: 3,
            volumes: 5
          }
        },
        trade: {
          risk: '20%',
          stopLoss: '2%',
          profitTarget: '5%',
          timeToLive: '4h'
        }
      }
    }
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '6h',
    strategies: {
      vsa: {
        params: {
          periods: 500,
          thresholds: {
            largestRanges: '10%',
            largestVolumes: '5%',
            priceRejection: '50%'
          },
          windows: {
            localHigh: 10,
            localLow: 10,
            ranges: 2,
            volumes: 4
          }
        },
        trade: {
          risk: '20%',
          stopLoss: '2%',
          profitTarget: '5%',
          timeToLive: '1d'
        }
      }
    }
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '1d',
    strategies: {
      vsa: {
        params: {
          periods: 500,
          thresholds: {
            largestRanges: '10%',
            largestVolumes: '5%',
            priceRejection: '50%'
          },
          windows: {
            localHigh: 10,
            localLow: 10,
            ranges: 2,
            volumes: 4
          }
        },
        trade: {
          risk: '30%',
          stopLoss: '2%',
          profitTarget: '5%'
        }
      }
    }
  },
  {
    symbol: 'ETHBTC',
    timeframe: '5m',
    strategies: {
      taz: {
        params: {
          periods: 100,
          indicators: {
            ema: 30,
            sma: 10
          }
        },
        trade: {
          risk: '10%',
          stopLoss: '1%',
          profitTarget: '2%',
          timeToLive: '1h'
        }
      }
    }
  }
]

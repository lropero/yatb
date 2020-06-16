module.exports = [
  {
    symbol: 'BTCUSDT',
    timeframe: '1m'
  },
  {
    symbol: 'BTCUSDT',
    timeframe: '3m',
    strategies: {
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
          profitTarget: '2%',
          risk: '10%',
          stopLoss: '1%',
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
          indicators: {
            ema: 30,
            sma: 10
          },
          periods: 50,
          windows: {
            volumes: 20
          }
        },
        trade: {
          profitTarget: '1%',
          risk: '10%',
          stopLoss: '1%'
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
          profitTarget: '2%',
          risk: '20%',
          stopLoss: '1%',
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
          profitTarget: '3%',
          risk: '30%',
          stopLoss: '2%',
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
          profitTarget: '5%',
          risk: '50%',
          stopLoss: '2%',
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
          profitTarget: '5%',
          risk: '50%',
          stopLoss: '2%',
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
          profitTarget: '5%',
          risk: '80%',
          stopLoss: '2%'
        }
      }
    }
  },
  {
    symbol: 'ETHBTC',
    timeframe: '5m',
    strategies: {
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
          profitTarget: '2%',
          risk: '20%',
          stopLoss: '1%',
          timeToLive: '1h'
        }
      }
    }
  }
]

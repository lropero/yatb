function calculateFunds (balances, prices) {
  const fundsWithoutDollarPrice = Object.keys(balances)
    .filter((asset) => parseFloat(balances[asset].available) > 0 || parseFloat(balances[asset].onOrder) > 0)
    .sort()
    .reduce((funds, asset) => {
      funds[asset] = {
        available: parseFloat(balances[asset].available),
        onOrder: parseFloat(balances[asset].onOrder)
      }
      return funds
    }, {})
  return Object.keys(fundsWithoutDollarPrice).reduce((funds, asset) => {
    if (asset === 'BTC') {
      funds[asset] = {
        ...fundsWithoutDollarPrice[asset],
        dollarPrice: fundsWithoutDollarPrice[asset].available * parseFloat(prices.BTCUSDT || 0)
      }
    } else if (asset === 'USDT') {
      funds[asset] = {
        ...fundsWithoutDollarPrice[asset],
        dollarPrice: fundsWithoutDollarPrice[asset].available
      }
    } else if (prices[`${asset}BTC`]) {
      funds[asset] = {
        ...fundsWithoutDollarPrice[asset],
        dollarPrice: fundsWithoutDollarPrice[asset].available * parseFloat(prices[`${asset}BTC`]) * parseFloat(prices.BTCUSDT || 0)
      }
    }
    return funds
  }, {})
}

module.exports = calculateFunds

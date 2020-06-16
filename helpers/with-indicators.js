const tulind = require('tulind')

const errorToString = require('./error-to-string')

function filterIndicators (object, index) {
  if (Array.isArray(object)) {
    return object[index] ? object[index] : null
  }
  return Object.keys(object).reduce((acc, key) => {
    acc[key] = filterIndicators(object[key], index)
    return acc
  }, {})
}

function withIndicators (candles, configIndicators) {
  return new Promise((resolve, reject) => {
    try {
      if (!candles[0]) {
        return resolve([])
      }
      const allowedInputs = Object.keys(candles[0])
      const indicators = {}
      Object.keys(configIndicators).map(indicatorName => {
        const configIndicator = configIndicators[indicatorName]
        const indicator = tulind.indicators[configIndicator.type]
        if (!indicator) {
          return reject(new Error(`Indicator ${configIndicator.type} doesn't exist`))
        }
        const indicatorInputs = []
        indicator.input_names.map(inputName => {
          if (!allowedInputs.includes(inputName) && !allowedInputs.includes(configIndicator.inputs[inputName])) {
            return reject(
              new Error(
                !Object.keys(configIndicator.inputs).includes(inputName)
                  ? `Missing input '${inputName}' for indicator ${indicatorName}`
                  : `Allowed values for input ${indicatorName}→${inputName}: ${allowedInputs.join(', ')}`
              )
            )
          }
          const input = allowedInputs.includes(inputName) ? inputName : configIndicator.inputs[inputName]
          indicatorInputs.push(candles.map(candle => candle[input]))
        })
        const indicatorOptions = []
        indicator.option_names.map(optionName => {
          if (!Object.keys(configIndicator.options).includes(optionName)) {
            return reject(new Error(`Missing option '${optionName}' for indicator ${indicatorName}`))
          }
          indicatorOptions.push(configIndicator.options[optionName])
        })
        indicator.indicator(indicatorInputs, indicatorOptions, (error, results) => {
          if (error) {
            return reject(new Error(`Indicator ${indicatorName}: ${errorToString(error)}`))
          }
          indicators[indicatorName] = {}
          indicator.output_names.map((outputName, index) => {
            indicators[indicatorName][outputName] = new Array(candles.length - results[index].length).concat(
              results[index]
            )
          })
        })
      })
      const chart = candles.map((candle, index) => ({
        ...candle,
        indicators: filterIndicators(indicators, index)
      }))
      return resolve(chart)
    } catch (error) {
      return reject(error)
    }
  })
}

module.exports = withIndicators

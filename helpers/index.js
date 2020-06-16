const calculateFunds = require('./calculate-funds')
const errorToString = require('./error-to-string')
const millisecondsToTime = require('./milliseconds-to-time')
const plotVolume = require('./plot-volume')
const timeframeToMilliseconds = require('./timeframe-to-milliseconds')
const withIndicators = require('./with-indicators')

module.exports = {
  calculateFunds,
  errorToString,
  millisecondsToTime,
  plotVolume,
  timeframeToMilliseconds,
  withIndicators
}

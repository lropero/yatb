function millisecondsToTime (milliseconds) {
  const seconds = milliseconds / 1000
  const h = seconds / 3600
  const m = (seconds % 3600) / 60
  const s = seconds % 60
  return [h, m, s].map((value) => ('0' + Math.floor(value)).slice(-2)).join(':')
}

module.exports = millisecondsToTime

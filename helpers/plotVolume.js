const chalk = require('chalk')

function plotVolume (candles, { colors, height, width }) {
  const volumes = candles.map((candle) => candle.volume)
  const highestVolume = Math.max(...volumes)
  const heights = volumes.map((volume) => Math.round((volume * height / highestVolume) * 2) / 2)
  const output = []
  for (let i = 0; i < height; i++) {
    const line = []
    const number = ((highestVolume / height) * (height - i)).toFixed(0)
    for (let j = 0; j < width; j++) {
      if (j < volumes.length) {
        if (height - i <= Math.ceil(heights[j])) {
          const candle = candles[j]
          let color = colors.VOLUME_OPEN
          if (candle.close > candle.open) {
            color = colors.VOLUME_UP
          } else if (candle.close < candle.open) {
            color = colors.VOLUME_DOWN
          }
          line.push(height - i === Math.ceil(heights[j]) && heights[j] % 1 ? chalk[colors.VOLUME_BACKGROUND](chalk[color](String.fromCharCode(9604))) : chalk[color].inverse(' '))
        } else if (i === 0) {
          line.push(chalk[colors.VOLUME_BACKGROUND](chalk[colors.CHART_BORDER](String.fromCharCode(9480))))
        } else {
          line.push(chalk[colors.VOLUME_BACKGROUND](chalk[colors.VOLUME_FOREGROUND](String.fromCharCode(9480))))
        }
      } else if (j === volumes.length) {
        line.push(chalk[colors.VOLUME_BACKGROUND](chalk[colors.CHART_BORDER](String.fromCharCode(9474))))
      } else if (j === volumes.length + 1 || j === width - 1) {
        line.push(chalk[colors.VOLUME_BACKGROUND](' '))
      } else if (number[j - volumes.length - 2]) {
        line.push(chalk[colors.VOLUME_BACKGROUND](chalk[colors.VOLUME_NUMBER](number[j - volumes.length - 2])))
      } else {
        line.push(chalk[colors.VOLUME_BACKGROUND](chalk[colors.VOLUME_NUMBER_DOTS]('.')))
      }
    }
    output.push(line.join(''))
  }
  return output.join('\n')
}

module.exports = plotVolume

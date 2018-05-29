const { dependencies, devDependencies, name, version } = require('../../package.json')

module.exports = (req, res) => {
  res.json({
    name,
    version,
    dependencies,
    devDependencies
  })
}

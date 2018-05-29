module.exports = (req, res) => {
  const bot = req.app.get('bot')

  const funds = bot.getFunds()
  res.json(funds)
}

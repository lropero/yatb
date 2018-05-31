const createError = require('http-errors')
const express = require('express')
const morgan = require('morgan')

const routes = require('./routes')
const { logSuccess } = require('../helpers')
const { serverPort } = require('../config')

module.exports = (bot) => {
  const server = express()
  server.set('bot', bot)
  server.use(express.urlencoded({ extended: false }))
  server.use(express.json())
  server.use(morgan('dev'))
  server.use('/', routes)
  server.use((req, res) => res.status(405).json(createError(405)))
  server.listen(serverPort)
  logSuccess(`Server listening on port ${serverPort}`)
}

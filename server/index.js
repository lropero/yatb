const createError = require('http-errors')
const express = require('express')
const morgan = require('morgan')

const routes = require('./routes')
const { errorToString } = require('../helpers')

module.exports = (port, bot) => {
  const server = express()
  server.set('bot', bot)
  server.use(express.urlencoded({ extended: false }))
  server.use(express.json())
  server.use(morgan('dev'))
  server.use('/', routes)
  server.use((req, res) => res.status(405).json(createError(405)))

  return new Promise((resolve, reject) => {
    server.listen(port)
      .on('error', (error) => reject(new Error(`${errorToString(error)}, port ${port} might be in use`)))
      .on('listening', () => resolve())
  })
}

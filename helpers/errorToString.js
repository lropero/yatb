function errorToString (error) {
  if (!(error instanceof Error)) {
    error = new Error(error.toString())
  }
  error.name = ''
  const string = error.toString()
  return string.charAt(0).toUpperCase() + string.slice(1)
}

module.exports = errorToString

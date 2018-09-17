function errorToString (error) {
  if (error instanceof Error) {
    error.name = ''
  }
  const string = error.toString()
  return string.charAt(0).toUpperCase() + string.substr(1)
}

module.exports = errorToString

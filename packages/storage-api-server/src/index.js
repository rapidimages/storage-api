const server = require('server-base')
const routes = require('./routes')
const fileStorage = require('./file-storage.js')

server(routes(fileStorage))
  .config.assert(['PORT', 'STORAGE_PATH'])
  .start()

const server = require('server-base')
const routes = require('@rapidimages/storage-api-router')
const fileStorage = require('./file-storage.js')

server(routes(fileStorage))
  .config.assert(['PORT', 'STORAGE_PATH'])
  .start()

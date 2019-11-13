const http = require('http')
const routes = require('@rapidimages/storage-api-router')
const storageProvider = require(process.env.STORAGE_PROVIDER ||
  './file-storage.js')

http.createServer(routes(storageProvider)).listen(5000)

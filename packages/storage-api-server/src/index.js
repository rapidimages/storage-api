const http = require('http')
const routes = require('@rapidimages/storage-api-router')
const fileStorage = require('./file-storage.js')

http.createServer(routes(fileStorage)).listen(5000)

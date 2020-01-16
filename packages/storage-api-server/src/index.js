const http = require('http')
const routes = require('@rapidimages/storage-api-router')
const fileProvider = require('@rapidimages/storage-api-file-provider')

http.createServer(routes(fileProvider)).listen(5000)

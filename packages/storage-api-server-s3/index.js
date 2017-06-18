const server = require('server-base')
const routes = require('./routes')

server(routes)
.config.assert(['PORT', 'S3_BUCKET', 'S3_KEY', 'S3_SECRET'])
.start()

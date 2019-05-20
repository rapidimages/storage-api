const server = require('server-base')
const routes = require('./routes')

server(routes)
.config.assert(['PORT', 'STORAGE_PATH'])
.start()

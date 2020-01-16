require('./packages/storage-api-router')
require('./packages/storage-api-file-provider')
require.cache[
  require.resolve(
    './packages/storage-api-server/node_modules/@rapidimages/storage-api-router'
  )
] = require.cache[require.resolve('./packages/storage-api-router')]
require.cache[
  require.resolve(
    './packages/storage-api-server/node_modules/@rapidimages/storage-api-file-provider'
  )
] = require.cache[require.resolve('./packages/storage-api-file-provider')]
require('./packages/storage-api-server')

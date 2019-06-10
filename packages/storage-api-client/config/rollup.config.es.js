import config from './rollup.config'

export default config({
  output: {
    format: 'esm',
    file: 'dist/storage-api-client.es.js'
  },
  browser: false
})

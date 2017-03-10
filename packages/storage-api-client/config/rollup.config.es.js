import config from './rollup.config'

export default config({
  format: 'es',
  dest: 'dist/storage-api-client.es.js',
  browser: false
})

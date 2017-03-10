import config from './rollup.config'

export default config({
  format: 'es',
  dest: 'dist/storage-api-client.browser.es.js',
  browser: true
})

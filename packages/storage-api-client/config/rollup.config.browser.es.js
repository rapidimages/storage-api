import config from './rollup.config'

export default config({
  output: {
    format: 'esm',
    file: 'dist/storage-api-client.browser.es.js'
  },
  browser: true
})

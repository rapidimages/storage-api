import config from './rollup.config'

export default config({
  output: {
    format: 'cjs',
    file: 'dist/storage-api-client.browser.cjs.js'
  },
  browser: true
})

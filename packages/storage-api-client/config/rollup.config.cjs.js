import config from './rollup.config'

export default config({
  output: {
    format: 'cjs',
    file: 'dist/storage-api-client.cjs.js'
  },
  browser: false
})

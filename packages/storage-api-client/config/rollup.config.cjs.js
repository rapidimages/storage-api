import config from './rollup.config'

export default config({
  format: 'cjs',
  dest: 'dist/storage-api-client.cjs.js',
  browser: false
})

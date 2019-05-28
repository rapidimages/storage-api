import buble from 'rollup-plugin-buble'
import replace from 'rollup-plugin-replace'
import fs from 'fs'

const pkg = require('../package')

const rushaString =
  'function () {\n' +
  fs
    .readFileSync(require.resolve('rusha/dist/rusha.min.js', 'utf-8'))
    .toString() +
  '\n}'

export default config => {
  return {
    entry: config.browser ? 'src/browser.js' : 'src/index.js',
    format: config.format,
    moduleName: 'storage-api-client',
    dest: config.dest,
    plugins: [buble(), replace({ "'#{RUSHA}'": rushaString })],
    external: Object.keys(pkg.dependencies).concat(['fs', 'crypto'])
  }
}

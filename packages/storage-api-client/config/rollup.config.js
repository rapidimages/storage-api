import buble from '@rollup/plugin-buble'
import replace from '@rollup/plugin-replace'
import fs from 'fs'

const pkg = require('../package')

const rushaString = fs.readFileSync(require.resolve('rusha/dist/rusha.min.js')).toString('base64')

export default config => {
  return {
    input: config.browser ? 'src/browser.js' : 'src/index.js',
    output: config.output,
    plugins: [buble(), replace({ replace_with_rusha: () => rushaString })],
    external: Object.keys(pkg.dependencies).concat(['fs', 'crypto'])
  }
}

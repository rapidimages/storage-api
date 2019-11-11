const pkg = require('../package')

export default config => {
  return {
    input: config.browser ? 'src/browser.js' : 'src/index.js',
    output: config.output,
    external: Object.keys(pkg.dependencies).concat(['fs', 'crypto'])
  }
}

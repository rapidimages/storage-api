const busboy = require('busboy-wrapper')
const path = require('path')
const fs = require('fs')
const mv = require('mv')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const crypto = require('crypto')

const { STORAGE_PATH } = process.env

module.exports = ({
  '@setup': (ctx) => {
    ctx.mime.default_type = ctx.mime.getType('bin')
  },
  '/unknown': {
    * post (q, r, _, parts) {
      const unknown = []
      for (const parts of yield q.json()) {
        const key = parts.split('.')[0]
        const missing = yield (cb) => fs.stat(shardKey(key), (err) => cb(null, err))
        if (missing) unknown.push(parts)
      }
      r.json(unknown)
    }
  },
  '/get/.*': {
    * get (q, r, _, parts) {
      const key = parts.split('.')[0]
      if (q.headers['if-none-match'] === key) {
        r.writeHead(304)
        r.end()
        return
      }
      const filePath = shardKey(key)
      r.setNextErrorMessage('not found', 404)
      const stat = yield (cb) => fs.stat(filePath, cb)
      r.writeHead(200, {
        'content-type': r.getHeader('content-type'),
        etag: key,
        'last-modified': new Date().toGMTString(),
        'content-length': stat.size
      })
      fs.createReadStream(filePath).pipe(r)
    }
  },
  '/upload': {
    * post (q, r) {
      const { fields, files } = yield busboy(q)

      const fieldKeys = Object.keys(fields)
      const fileKeys = Object.keys(files)
      const manifest = { files: [] }

      if (fieldKeys.length) {
        manifest.files.push(...fieldKeys.map((fieldKey) => {
          const { size, name, key } = JSON.parse(fields[fieldKey])
          return { size, name, key }
        }))
      }

      if (!fileKeys.length && !fieldKeys.length) return r.error('no files', 400)

      for (const name of fileKeys) {
        const file = files[name]
        const source = file.path
        const { size, hash: key } = file
        manifest.files.push({ size, name, key })

        const destination = shardKey(file.hash)
        yield (cb) => mkdirp(path.dirname(destination), cb)
        yield (cb) => mv(source, destination, cb)
        yield (cb) => rimraf(source, cb)
      }

      const data = JSON.stringify(manifest)
      const manifestKey = crypto.createHash('sha1').update(data).digest('hex')
      const destination = shardKey(manifestKey)
      yield (cb) => mkdirp(path.dirname(destination), cb)
      yield (cb) => fs.writeFile(destination, data, cb)
      r.text(manifestKey)
    }
  }
})

function shardKey (key) {
  const delimiter = '/'
  const shards = [[0, 9, 14], [0, 9, 20], [0, 9, 15]]
  return path.join(STORAGE_PATH, shards.reduce((sum, positions) => {
    return `${sum}${positions.reduce((part, x) => `${part}${key[x]}`, '')}${delimiter}`
  }, '') + key)
}
